import pg from "pg";
import { resolvePrincipal, requirePermission } from "../../src/server/auth/authorization.js";
import { accountLifecyclePermission } from "../../src/server/auth/admin-permission-contracts.js";
import { hashInvitationToken, issueInvitationMail, newInvitationToken } from "../../src/server/auth/invitations.js";

const json = (r, s, b) => { r.statusCode = s; r.setHeader("Content-Type", "application/json; charset=utf-8"); r.setHeader("Cache-Control", "no-store"); r.setHeader("X-Content-Type-Options", "nosniff"); r.end(JSON.stringify(b)); };
const h = (req) => new Headers(Object.entries(req.headers || {}).map(([k, v]) => [k, Array.isArray(v) ? v.join(", ") : String(v)]));
async function read(req) { if (req.body && typeof req.body === "object") return req.body; let x = ""; for await (const c of req) x += c; return x ? JSON.parse(x) : {}; }
const ownerOnly = (principal) => principal.memberships.some((membership) => membership.role === "OWNER" && membership.status === "ACTIVE");
const cleanName = (value) => String(value || "").trim().replace(/\s+/gu, " ").slice(0, 100);
const cleanEmail = (value) => String(value || "").trim().toLowerCase().slice(0, 254);
const validEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(value);

export default async function handler(req, res) {
  const principal = await resolvePrincipal(h(req));
  if (!principal?.user) return json(res, 401, { error: "UNAUTHENTICATED" });
  if (req.method !== "GET" && req.method !== "POST") return json(res, 405, { error: "METHOD_NOT_ALLOWED" });
  const path = new URL(req.url || "http://local", "http://local").pathname;
  if (path.endsWith("/admin-invitations") && req.method !== "POST") return json(res, 405, { error: "METHOD_NOT_ALLOWED" });
  if (path.endsWith("/trainer-invitations") && req.method !== "POST") return json(res, 405, { error: "METHOD_NOT_ALLOWED" });
  const denied = requirePermission(principal, accountLifecyclePermission(req.method, path));
  if (denied) return json(res, denied.status, denied.body);
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

  try {
    if (req.method === "GET") {
      const apps = (await pool.query(`
        select
          id,
          first_name as "firstName",
          last_name as "lastName",
          email,
          city,
          status,
          created_at as "createdAt",
          review_note as "reviewNote"
        from trainer_applications
        where coalesce(review_note,'') <> 'OWNER_LEGACY_INVITE'
        order by created_at desc
      `)).rows;

      const legacyTrainerInvitations = (await pool.query(`
        select
          id,
          first_name as "firstName",
          last_name as "lastName",
          email,
          invitation_expires_at as "expiresAt",
          invitation_used_at as "usedAt",
          created_at as "createdAt",
          case
            when invitation_used_at is not null then 'ACTIVATED'
            when invitation_expires_at > now() then 'PENDING'
            else 'EXPIRED'
          end as "inviteStatus"
        from trainer_applications
        where review_note='OWNER_LEGACY_INVITE'
        order by created_at desc
        limit 50
      `)).rows;

      const closures = (await pool.query(`
        select
          acr.id,
          acr.user_id as "userId",
          u.display_name as "accountName",
          u.email as "accountEmail",
          acr.status,
          acr.reason,
          acr.review_note as "reviewNote",
          acr.created_at as "createdAt",
          acr.updated_at as "updatedAt"
        from account_closure_requests acr
        join platform_users u on u.id=acr.user_id
        order by acr.created_at desc
      `)).rows;

      return json(res, 200, { applications: apps, closureRequests: closures, legacyTrainerInvitations });
    }

    const b = await read(req);

    if (path.endsWith("/closure-requests") && b.id) {
      const status = { review: "REVIEWING", approve: "APPROVED", reject: "REJECTED", complete: "COMPLETED" }[String(b.action || "")];
      if (!status) return json(res, 400, { error: "INVALID_CLOSURE_ACTION" });
      const row = (await pool.query(
        'update account_closure_requests set status=$1,review_note=$2,updated_at=now() where id=$3 returning id,user_id as "userId",status,review_note as "reviewNote",updated_at as "updatedAt"',
        [status, b.note || null, b.id],
      )).rows[0];
      if (!row) return json(res, 404, { error: "NOT_FOUND" });
      return json(res, 200, { request: row, hardDelete: false, retention: "EXTERNAL_LEGAL_POLICY_REQUIRED" });
    }

    if (path.endsWith("/trainer-applications") && b.id) {
      const action = String(b.action || "");
      const status = { approve: "APPROVED", reject: "REJECTED", review: "REVIEWING" }[action];
      if (!status) return json(res, 400, { error: "INVALID_ACTION" });

      if (status === "REJECTED") {
        const row = (await pool.query(
          "update trainer_applications set status=$1,review_note=$2,invitation_token_hash=null,invitation_expires_at=null,updated_at=now() where id=$3 returning id,status",
          [status, b.note || null, b.id],
        )).rows[0];
        if (!row) return json(res, 404, { error: "NOT_FOUND" });
        return json(res, 200, { application: row, invitationIssued: false });
      }

      if (status === "REVIEWING") {
        const row = (await pool.query(
          "update trainer_applications set status=$1,review_note=$2,updated_at=now() where id=$3 returning id,status",
          [status, b.note || null, b.id],
        )).rows[0];
        if (!row) return json(res, 404, { error: "NOT_FOUND" });
        return json(res, 200, { application: row, invitationIssued: false });
      }

      // Verified candidates have a restricted account already; grant TRAINER only
      // after profile completion and an explicit administrator approval.
      const candidate=process.env.FIXOKU_TRAINER_CANDIDATE_ENABLED === '1' ? (await pool.query(`select candidate_user_id,status from trainer_applications where id=$1`,[b.id])).rows[0] : null;
      if(candidate?.candidate_user_id){
        if(!ownerOnly(principal))return json(res,403,{error:'OWNER_ONLY_CANDIDATE_APPROVAL'});
        if(candidate.status!=='PROFILE_READY')return json(res,409,{error:'CANDIDATE_PROFILE_INCOMPLETE'});
        const client=await pool.connect();
        try{
          await client.query('begin');
           const profileGate=(await client.query(`select a.status,tp.city,tp.district,tp.profession,tp.education_background,tp.experience,tp.specialties,tp.bio
             from trainer_applications a join trainer_profiles tp on tp.user_id=a.candidate_user_id
             where a.id=$1 and a.candidate_user_id=$2 for update of a,tp`,[b.id,candidate.candidate_user_id])).rows[0];
           if(!profileGate || profileGate.status!=='PROFILE_READY' || ['city','district','profession','education_background','experience','specialties','bio'].some(k=>String(profileGate[k]||'').trim().length<2)){
             await client.query('rollback');return json(res,409,{error:'CANDIDATE_PROFILE_INCOMPLETE'});
           }
          const verified=(await client.query('select email_verified from platform_users where id=$1 for update',[candidate.candidate_user_id])).rows[0];
          if(!verified?.email_verified){await client.query('rollback');return json(res,409,{error:'CANDIDATE_EMAIL_NOT_VERIFIED'});}
          await client.query(`insert into platform_memberships(user_id,scope_type,scope_id,role,status)
            values($1,'TRAINER',$1,'TRAINER','ACTIVE') on conflict(user_id,scope_type,scope_id,role)
            do update set status='ACTIVE',updated_at=now()`,[candidate.candidate_user_id]);
          await client.query(`update trainer_applications set status='APPROVED',review_note=$1,updated_at=now() where id=$2`,[b.note||null,b.id]);
          await client.query('commit');
          return json(res,200,{application:{id:b.id,status:'APPROVED'},invitationIssued:false,candidateApproved:true});
        }catch{try{await client.query('rollback');}catch{}return json(res,503,{error:'APPROVAL_UNAVAILABLE'});}finally{client.release();}
      }
      const raw = newInvitationToken();
      const hash = hashInvitationToken(raw);
      const row = (await pool.query(
        `update trainer_applications
         set status='APPROVED',
             review_note=$1,
             invitation_token_hash=$2,
             invitation_expires_at=now()+interval '48 hours',
             invitation_used_at=null,
             updated_at=now()
         where id=$3
         returning id,status,email,invitation_expires_at as "expiresAt"`,
        [b.note || null, hash, b.id],
      )).rows[0];
      if (!row) return json(res, 404, { error: "NOT_FOUND" });
      issueInvitationMail({ kind: "trainer-activation", email: row.email, token: raw, path: "/ogretmen-aktivasyon" });
      return json(res, 200, { application: { id: row.id, status: row.status }, invitationIssued: true, expiresAt: row.expiresAt });
    }

    if (path.endsWith("/trainer-invitations")) {
      if (!ownerOnly(principal)) return json(res, 403, { error: "OWNER_ONLY" });

      const firstName = cleanName(b.firstName);
      const lastName = cleanName(b.lastName);
      const email = cleanEmail(b.email);

      if (!firstName || !lastName) return json(res, 400, { error: "TRAINER_NAME_REQUIRED" });
      if (!validEmail(email)) return json(res, 400, { error: "INVALID_EMAIL" });

      const existingAccount = (await pool.query(
        "select id from platform_users where lower(email)=lower($1) limit 1",
        [email],
      )).rows[0];
      if (existingAccount) return json(res, 409, { error: "ACCOUNT_ALREADY_EXISTS" });

      const pendingInvite = (await pool.query(
        `select id
         from trainer_applications
         where lower(email)=lower($1)
           and status='APPROVED'
           and invitation_used_at is null
           and invitation_expires_at>now()
         order by created_at desc
         limit 1`,
        [email],
      )).rows[0];
      if (pendingInvite) return json(res, 409, { error: "INVITATION_ALREADY_EXISTS" });

      const existingApplication = (await pool.query(
        `select id,status
         from trainer_applications
         where lower(email)=lower($1)
           and coalesce(review_note,'') <> 'OWNER_LEGACY_INVITE'
           and status in ('RECEIVED','REVIEWING','APPROVED')
         order by created_at desc
         limit 1`,
        [email],
      )).rows[0];
      if (existingApplication) return json(res, 409, { error: "TRAINER_APPLICATION_EXISTS", applicationId: existingApplication.id });

      const raw = newInvitationToken();
      const hash = hashInvitationToken(raw);
      const row = (await pool.query(
        `insert into trainer_applications(
          first_name,
          last_name,
          email,
          legal_acknowledged,
          status,
          review_note,
          invitation_token_hash,
          invitation_expires_at,
          invitation_used_at
        )
        values($1,$2,$3,false,'APPROVED','OWNER_LEGACY_INVITE',$4,now()+interval '48 hours',null)
        returning
          id,
          first_name as "firstName",
          last_name as "lastName",
          email,
          invitation_expires_at as "expiresAt"`,
        [firstName, lastName, email, hash],
      )).rows[0];

      issueInvitationMail({ kind: "trainer-activation", email: row.email, token: raw, path: "/ogretmen-aktivasyon" });

      await pool.query(
        `insert into platform_audit_events(
          actor_user_id,action,subject_type,subject_id,result,correlation_id,metadata_json
        )
        values($1,'trainer.legacy_invitation.issued','trainer_application',$2,'SUCCESS',gen_random_uuid(),$3)`,
        [principal.user.id, row.id, JSON.stringify({ email: row.email, expiresAt: row.expiresAt })],
      );

      return json(res, 201, {
        invitation: {
          ...row,
          singleUse: true,
          source: "OWNER_LEGACY_INVITE",
        },
      });
    }

    if (path.endsWith("/admin-invitations")) {
      if (!ownerOnly(principal)) return json(res, 403, { error: "OWNER_ONLY" });
      const email = cleanEmail(b.email);
      if (!validEmail(email)) return json(res, 400, { error: "INVALID_EMAIL" });
      const raw = newInvitationToken();
      const hash = hashInvitationToken(raw);
      const row = (await pool.query(
        `insert into admin_invitations(email,intended_role,token_hash,expires_at,created_by)
         values($1,'SUPER_ADMIN',$2,now()+interval '48 hours',$3)
         returning id,email,intended_role,expires_at as "expiresAt"`,
        [email, hash, principal.user.id],
      )).rows[0];
      issueInvitationMail({ kind: "admin-invitation", email, token: raw, path: "/admin-davet-kabul" });
      return json(res, 201, { invitation: { ...row, singleUse: true } });
    }

    return json(res, 405, { error: "METHOD_NOT_ALLOWED" });
  } catch (error) {
    if (error?.code === "23505") return json(res, 409, { error: "INVITATION_ALREADY_EXISTS" });
    return json(res, 503, { error: "LIFECYCLE_UNAVAILABLE" });
  } finally {
    await pool.end();
  }
}
