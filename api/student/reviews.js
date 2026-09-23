import pg from "pg";
import { resolvePrincipal, requirePermission } from "../../src/server/auth/authorization.js";
import { UUID_PATTERN } from "../../src/server/domain/commerce.js";

const json = (res, status, body) => { res.statusCode = status; res.setHeader("Content-Type", "application/json; charset=utf-8"); res.setHeader("Cache-Control", "no-store"); res.end(JSON.stringify(body)); };
const headers = (req) => new Headers(Object.entries(req.headers || {}).map(([key, value]) => [key, Array.isArray(value) ? value.join(", ") : String(value)]));
async function readBody(req) { if (req.body && typeof req.body === "object") return req.body; let raw = ""; for await (const chunk of req) raw += chunk; return raw ? JSON.parse(raw) : {}; }

async function participantScope(client, principal, participantId) {
  const row = (await client.query(`select p.*,g.status as group_status,g.completed_at,g.trainer_user_id,c.owner_user_id,c.first_name as child_first_name,c.last_name as child_last_name,sp.user_id as profile_user_id,u.email as student_email,u.display_name as student_name,sp.guardian_email,sp.guardian_name from r6_training_group_participants p join r6_training_groups g on g.id=p.training_group_id left join r6_student_child_profiles c on c.id=p.child_profile_id left join student_profiles sp on sp.id=p.student_profile_id left join platform_users u on u.id=p.student_user_id where p.id=$1`, [participantId])).rows[0];
  if (!row) throw Object.assign(new Error("REVIEW_PARTICIPANT_NOT_FOUND"), { status: 404 });
  const isOwner = String(row.student_user_id) === String(principal.user.id) || String(row.owner_user_id || "") === String(principal.user.id) || String(row.profile_user_id || "") === String(principal.user.id);
  let guardian = false;
  if (!isOwner && row.student_profile_id) guardian = Boolean((await client.query("select 1 from guardian_student_relationships where guardian_user_id=$1 and student_profile_id=$2 and status='ACTIVE'", [principal.user.id, row.student_profile_id])).rowCount);
  if (!isOwner && !guardian) throw Object.assign(new Error("REVIEW_SCOPE_DENIED"), { status: 403 });
  return row;
}

export default async function handler(req, res) {
  if (!["GET", "POST"].includes(req.method)) return json(res, 405, { error: "METHOD_NOT_ALLOWED" });
  const principal = await resolvePrincipal(headers(req)); if (!principal) return json(res, 401, { error: "UNAUTHENTICATED" });
  const denied = requirePermission(principal, req.method === "POST" ? "review.submit" : "review.read", { role: principal.memberships.some((m) => m.role === "GUARDIAN") ? "GUARDIAN" : "STUDENT" }); if (denied) return json(res, denied.status, denied.body);
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL }); const client = await pool.connect();
  try {
    if (req.method === "GET") {
      const rows = (await client.query(`select r.id,r.participant_id as "participantId",r.student_user_id as "studentUserId",r.quality_score as "qualityScore",r.communication_score as "communicationScore",r.satisfaction_score as "satisfactionScore",r.average_score_bps as "averageScoreBps",r.comment,r.submitted_at as "submittedAt",g.id as "trainingGroupId",g.status as "trainingStatus" from r6_training_reviews r join r6_training_group_participants p on p.id=r.participant_id join r6_training_groups g on g.id=p.training_group_id where (p.student_user_id=$1 or exists(select 1 from r6_student_child_profiles c where c.id=p.child_profile_id and c.owner_user_id=$1) or exists(select 1 from guardian_student_relationships gr where gr.guardian_user_id=$1 and gr.student_profile_id=p.student_profile_id and gr.status='ACTIVE')) order by r.submitted_at desc`, [principal.user.id])).rows;
      const eligibleParticipants = (await client.query(`select p.id as "participantId",p.training_group_id as "trainingGroupId",g.training_type as "trainingType",g.mode,g.completed_at as "completedAt",coalesce(c.first_name || ' ' || c.last_name,u.display_name,'Öğrenci') as "studentName",r.id as "reviewId" from r6_training_group_participants p join r6_training_groups g on g.id=p.training_group_id left join r6_student_child_profiles c on c.id=p.child_profile_id left join platform_users u on u.id=p.student_user_id left join r6_training_reviews r on r.participant_id=p.id where g.status='COMPLETED' and p.status='COMPLETED' and (p.student_user_id=$1 or exists(select 1 from r6_student_child_profiles owned where owned.id=p.child_profile_id and owned.owner_user_id=$1) or exists(select 1 from guardian_student_relationships gr where gr.guardian_user_id=$1 and gr.student_profile_id=p.student_profile_id and gr.status='ACTIVE')) order by g.completed_at desc,p.id`, [principal.user.id])).rows;
      return json(res, 200, { reviews: rows, eligibleParticipants });
    }
    const body = await readBody(req); const participantId = String(body.participantId || "");
    if (!UUID_PATTERN.test(participantId)) return json(res, 400, { error: "PARTICIPANT_ID_INVALID" });
    const participant = await participantScope(client, principal, participantId);
    if (participant.group_status !== "COMPLETED") return json(res, 409, { error: "REVIEW_BEFORE_COMPLETION" });
    const scores = [Number(body.qualityScore), Number(body.communicationScore), Number(body.satisfactionScore)];
    if (scores.some((score) => !Number.isInteger(score) || score < 1 || score > 5)) return json(res, 400, { error: "REVIEW_SCORE_INVALID" });
    const existing = (await client.query("select id from r6_training_reviews where participant_id=$1", [participantId])).rows[0];
    if (existing) return json(res, 409, { error: "REVIEW_DUPLICATE" });
    const averageScoreBps = Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length * 10000);
    const review = (await client.query(`insert into r6_training_reviews(participant_id,student_user_id,quality_score,communication_score,satisfaction_score,average_score_bps,comment) values($1,$2,$3,$4,$5,$6,$7) returning id,participant_id as "participantId",student_user_id as "studentUserId",quality_score as "qualityScore",communication_score as "communicationScore",satisfaction_score as "satisfactionScore",average_score_bps as "averageScoreBps",comment,submitted_at as "submittedAt"`, [participantId, participant.student_user_id, scores[0], scores[1], scores[2], averageScoreBps, body.comment ? String(body.comment).trim().slice(0, 2000) : null])).rows[0];
    const recipients = new Map();
    if (participant.student_email) recipients.set(participant.student_email.toLowerCase(), { id: participant.student_user_id, email: participant.student_email });
    if (participant.guardian_email && participant.guardian_email.toLowerCase() !== participant.student_email?.toLowerCase()) recipients.set(participant.guardian_email.toLowerCase(), { id: participant.student_user_id, email: participant.guardian_email });
    for (const recipient of recipients.values()) await client.query("insert into notification_email_outbox(recipient_user_id,event_type,recipient_email,subject,body,dedupe_key) values($1,'TRAINING_REVIEW_SUBMITTED',$2,'Eğitim değerlendirmesi alındı','Tamamlanan eğitim için değerlendirme kaydınız oluşturuldu.',$3) on conflict(dedupe_key) do nothing", [recipient.id, recipient.email, `r6-training-review:${review.id}:${recipient.email}`]);
    return json(res, 201, { review });
  } catch (error) { return json(res, error.status || (error.code === "23505" ? 409 : 503), { error: error.code === "23505" ? "REVIEW_DUPLICATE" : error.code || error.message || "REVIEW_UNAVAILABLE" }); } finally { client.release(); await pool.end(); }
}
