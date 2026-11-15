import { queueEmailOutbox } from "./panel-notifications.js";
import { OWNER_EMAIL_EDITORIAL } from "./owner-email-editorial-r390.js";

// Call only from trusted server-side event producers inside their transaction.
// Default-off until staging acceptance; never read an address from request input.
export async function queueOwnerManagementEmail(client, { templateKey, eventId, metadata }, env = process.env) {
  if (env.FIXOKU_OWNER_NOTIFICATIONS_ENABLED !== "1") return false;
  const address = String(env.FIXOKU_OWNER_NOTIFICATION_EMAIL || "").trim().toLowerCase();
  if (address !== "ersinusta@fixoku.com") throw new Error("OWNER_NOTIFICATION_RECIPIENT_NOT_APPROVED");
  if (!Object.hasOwn(OWNER_EMAIL_EDITORIAL, templateKey) || typeof eventId !== "string" || !/^[a-zA-Z0-9:_-]{1,120}$/.test(eventId)) throw new Error("OWNER_NOTIFICATION_EVENT_INVALID");
  const definition = OWNER_EMAIL_EDITORIAL[templateKey];
  for (const key of definition.required || []) if (!String(metadata?.[key] ?? "").trim()) throw new Error("OWNER_NOTIFICATION_REQUIRED_FIELD_" + key);
  const rows = (await client.query(`select distinct u.id from platform_users u join platform_memberships m on m.user_id=u.id where lower(u.email)=$1 and u.email_verified=true and m.role='OWNER' and m.status='ACTIVE' and m.scope_type='GLOBAL' and m.scope_id is null`, ["ersin@fixoku.com"])).rows;
  if (rows.length !== 1) throw new Error("OWNER_NOTIFICATION_RECIPIENT_NOT_UNIQUE_VERIFIED_OWNER");
  return queueEmailOutbox(client, {recipientUserId:rows[0].id, recipientEmail:address, eventType:templateKey.toUpperCase().replace(/-/g,"_"), subject:definition.title, body:"", metadata, dedupeKey:`owner-management:${templateKey}:${eventId}`});
}

// Only verified, active registrations; no historical backfill here.
export async function queueVerifiedOwnerRegistration(client, authUserId, env = process.env) {
  if (env.FIXOKU_OWNER_NOTIFICATIONS_ENABLED !== "1") return 0;
  const rows = (await client.query(`select u.id,u.display_name,u.email,m.role::text as role,
    case when m.role='TRAINER' then tp.phone when m.role='STUDENT' then sp.phone end as phone,
    case when m.role='TRAINER' then tp.city when m.role='STUDENT' then sp.city end as city,
    case when m.role='TRAINER' then tp.district when m.role='STUDENT' then sp.district end as district,
    tp.profession,tp.institution,sp.grade,sp.school,sp.guardian_name
    from platform_users u join platform_memberships m on m.user_id=u.id
    left join trainer_profiles tp on tp.user_id=u.id
    left join student_profiles sp on sp.user_id=u.id
    where u.auth_user_id=$1 and u.email_verified=true and m.status='ACTIVE'
    and ((m.role='TRAINER' and m.scope_type='TRAINER' and m.scope_id=u.id and tp.user_id is not null)
      or (m.role='STUDENT' and m.scope_type='STUDENT' and m.scope_id=u.id and sp.user_id is not null)
      or (m.role='GUARDIAN' and exists(select 1 from guardian_profiles gp where gp.user_id=u.id and gp.status='ACTIVE')))
    and not (m.role='STUDENT' and exists(select 1 from trainer_applications a where a.candidate_user_id=u.id and a.status<>'REJECTED'))`, [authUserId])).rows;
  let count=0;
  for (const row of rows) {
    const key={TRAINER:'owner-trainer-registration',STUDENT:'owner-student-registration',GUARDIAN:'owner-guardian-registration'}[row.role];
    if (!key) continue;
    const metadata={personName:row.display_name,email:row.email,phone:row.phone,city:[row.city,row.district].filter(Boolean).join(' / '),profession:row.profession,institution:row.institution,grade:row.grade,school:row.school,guardianName:row.guardian_name,date:new Intl.DateTimeFormat('tr-TR',{timeZone:'Europe/Istanbul',dateStyle:'short',timeStyle:'short'}).format(new Date()),status:'E-posta doğrulandı'};
    if (await queueOwnerManagementEmail(client,{templateKey:key,eventId:row.id,metadata},env)) count++;
  }
  return count;
}
