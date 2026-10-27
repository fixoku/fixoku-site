import { buildEmailSnapshot, CRITICAL_KEYS, EMAIL_EVENT_TEMPLATE_MAP, getPublishedEmailTemplate, staticTemplateRecord } from "./email-templates.js";

/**
 * Queue an in-panel notification and, when an address is supplied, its local
 * email outbox twin.  Both rows share a deterministic dedupe key so retries
 * from payment callbacks, owner actions, and browser replays are harmless.
 * The caller owns the surrounding transaction.
 */
export async function queuePanelNotification(client, {
  recipientUserId,
  eventType,
  title,
  body,
  metadata = {},
  dedupeKey,
  recipientEmail = null,
  emailSubject = title,
  emailBody = body,
}) {
  if (!recipientUserId || !eventType || !title || !body || !dedupeKey) return false;
  await client.query(
    `insert into panel_notifications(recipient_user_id,event_type,title,body,metadata_json,dedupe_key)
     values($1,$2,$3,$4,$5,$6)
     on conflict(dedupe_key) do nothing`,
    [recipientUserId, eventType, title, body, JSON.stringify(metadata || {}), dedupeKey],
  );
  if (recipientEmail) await queueEmailOutbox(client, { recipientUserId, eventType, recipientEmail, title, body: emailBody || body, metadata, dedupeKey: `${dedupeKey}:email`, subject: emailSubject || title });
  return true;
}

export async function queueEmailOutbox(client, { recipientUserId, eventType, recipientEmail, subject, body, metadata = {}, dedupeKey }) {
  if (!recipientUserId || !recipientEmail || !eventType || !dedupeKey) return false;
  const template = await getPublishedEmailTemplate(client, eventType);
  const mappedKey = EMAIL_EVENT_TEMPLATE_MAP[String(eventType || "").toUpperCase()];
  // Inactive non-critical notifications are intentionally suppressed. Account
  // verification/reset always retain the static renderer yedek so a bad
  // Owner edit cannot silently break account recovery.
  if (!template && (!mappedKey || !CRITICAL_KEYS.has(mappedKey))) return false;
  const yedek = !template && mappedKey ? { ...staticTemplateRecord(mappedKey), templateKey: mappedKey, revisionId: null, revisionNumber: 0 } : null;
  const activeTemplate = template || yedek;
  const snapshot = activeTemplate ? buildEmailSnapshot({ eventType, record: activeTemplate, metadata, body }) : null;
  await client.query(
    `insert into notification_email_outbox(recipient_user_id,event_type,recipient_email,subject,body,dedupe_key,template_revision_id,render_snapshot_json)
     values($1,$2,$3,$4,$5,$6,$7,$8::jsonb)
     on conflict(dedupe_key) do nothing`,
    [recipientUserId, eventType, recipientEmail, snapshot?.subject || subject || eventType, body || "", dedupeKey, snapshot?.revisionId || null, snapshot ? JSON.stringify(snapshot) : null],
  );
  return true;
}

export async function queueRolePanelNotifications(client, {
  role,
  scopeType = null,
  scopeId = null,
  eventType,
  title,
  body,
  metadata = {},
  dedupeKey,
  emailSubject = title,
  emailBody = body,
}) {
  const rows = (await client.query(
    `select distinct u.id,u.email
       from platform_users u
       join platform_memberships m on m.user_id=u.id
      where m.role=$1 and m.status='ACTIVE'
        and ($2::membership_scope_type is null or m.scope_type=$2::membership_scope_type)
        and ($3::uuid is null or m.scope_id=$3)`,
    [role, scopeType, scopeId],
  )).rows;
  for (const row of rows) {
    await queuePanelNotification(client, {
      recipientUserId: row.id,
      recipientEmail: row.email,
      eventType,
      title,
      body,
      metadata,
      dedupeKey: `${dedupeKey}:${row.id}`,
      emailSubject,
      emailBody,
    });
  }
  return rows.length;
}
