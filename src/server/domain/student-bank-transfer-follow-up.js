import crypto from "node:crypto";

export const FOLLOW_UP_REASONS = Object.freeze([
  "NOT_RECEIVED",
  "PARTIAL_PAYMENT",
  "PROOF_REQUEST"
]);

const fail = (code, status = 400) =>
  Object.assign(new Error(code), { code, status });

const money = (minor, currency = "TRY") =>
  new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency
  }).format(minor / 100);

export function buildStudentBankFollowUp(input, order) {
  const reason = String(input?.reason || "").toUpperCase();

  if (!FOLLOW_UP_REASONS.includes(reason)) {
    throw fail("FOLLOW_UP_REASON_INVALID");
  }

  const total = Number(order?.total_minor);

  if (!Number.isSafeInteger(total) || total <= 0) {
    throw fail("ORDER_AMOUNT_INVALID", 409);
  }

  const received = reason === "PARTIAL_PAYMENT"
    ? Number(input?.receivedMinor)
    : 0;

  if (reason === "PARTIAL_PAYMENT" &&
      (!Number.isSafeInteger(received) ||
       received <= 0 || received >= total)) {
    throw fail("PARTIAL_AMOUNT_INVALID");
  }

  if (reason !== "PARTIAL_PAYMENT" &&
      input?.receivedMinor != null &&
      Number(input.receivedMinor) !== 0) {
    throw fail("RECEIVED_AMOUNT_NOT_ALLOWED");
  }

  const remaining = total - received;
  const reference = "FIXOKU-" +
    String(order.id).slice(0, 8).toUpperCase();

  const note = String(input?.note || "")
    .trim()
    .replace(/[\r\n\t]+/g, " ")
    .slice(0, 500);

  let subject;
  let explanation;

  if (reason === "NOT_RECEIVED") {
    subject = "Havale/EFT odemenizin durumu";
    explanation =
      "Siparisinize ait havale/EFT tutari henuz banka " +
      "hareketlerimizde dogrulanmadi. Bankalar arasi " +
      "gecikme olabileceginden odemenizi yapmadiginiz " +
      "sonucuna varmiyoruz.";
  } else if (reason === "PARTIAL_PAYMENT") {
    subject = "Eksik havale/EFT tutari";
    explanation =
      `${money(received, order.currency)} tutarinda ` +
      `odeme kaydi tespit ettik. Kalan ` +
      `${money(remaining, order.currency)} tutarinin ` +
      "kontrol edilmesini rica ederiz.";
  } else {
    subject = "Havale/EFT dekont ve bilgi talebi";
    explanation =
      "Odemenizi eslestirebilmemiz icin islem tarihi, " +
      "gonderici adi ve dekontunuzu guvenli destek " +
      "kanalimizdan iletmenizi rica ederiz.";
  }

  const body = [
    "Merhaba,",
    "",
    `${reference} referansli ` +
      `${money(total, order.currency)} tutarindaki ` +
      "FIXOKU siparisiniz hakkinda bilgilendirme:",
    "",
    explanation,
    "",
    "Odemenizi yaptiysaniz dekontunuzu destek " +
      "kanalimizdan iletebilirsiniz.",
    "Odeme dogrulanmadan egitim erisimi acilmaz.",
    "",
    note ? `Owner notu: ${note}` : "",
    "",
    "FIXOKU Destek"
  ].join("\n");

  return {
    reason,
    receivedMinor: received,
    remainingMinor: remaining,
    reference,
    note,
    subject: `FIXOKU | ${subject} | ${reference}`,
    body
  };
}

export async function recordStudentBankFollowUp(
  client,
  { order, ownerUserId, input }
) {
  if (!["PENDING_PAYMENT", "PAYMENT_REVIEW"]
      .includes(order.status)) {
    throw fail("BANK_TRANSFER_NOT_REVIEWABLE", 409);
  }

  const draft = buildStudentBankFollowUp(input, order);

  const buyer = (await client.query(
    "select id,email from platform_users where id=$1",
    [order.buyer_user_id]
  )).rows[0];

  if (!buyer?.email ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(buyer.email)) {
    throw fail("BUYER_EMAIL_MISSING", 409);
  }

  const prefix = `student-bank-follow-up:${order.id}:`;

  const recent = (await client.query(
    `select id from notification_email_outbox
     where event_type='STUDENT_BANK_TRANSFER_FOLLOW_UP'
       and dedupe_key like $1
       and created_at > now() - interval '24 hours'
     limit 1`,
    [prefix + "%"]
  )).rows[0];

  if (recent) {
    throw fail("FOLLOW_UP_COOLDOWN_24H", 409);
  }

  const dedupeKey = prefix + crypto.randomUUID();

  // Preserve the exact Owner-approved message for SMTP processing.
  // Escape user-supplied content before placing it in HTML.
  const escapedBody = draft.body
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

  const renderSnapshot = {
    subject: draft.subject,
    text: draft.body,
    html: `<div style="font-family:Arial,sans-serif;line-height:1.7;white-space:pre-wrap">${escapedBody}</div>`
  };

  await client.query(
    `insert into notification_email_outbox
     (recipient_user_id,event_type,recipient_email,
      subject,body,dedupe_key,
      template_revision_id,render_snapshot_json)
     values($1,'STUDENT_BANK_TRANSFER_FOLLOW_UP',
            $2,$3,$4,$5,null,$6::jsonb)`,
    [
      buyer.id,
      buyer.email,
      draft.subject,
      draft.body,
      dedupeKey,
      JSON.stringify(renderSnapshot)
    ]
  );

  await client.query(
    `insert into panel_notifications
     (recipient_user_id,event_type,title,body,
      metadata_json,dedupe_key)
     values($1,'STUDENT_BANK_TRANSFER_FOLLOW_UP',
            $2,$3,$4,$5)
     on conflict(dedupe_key) do nothing`,
    [
      buyer.id,
      draft.subject,
      draft.body,
      JSON.stringify({
        orderId: order.id,
        reason: draft.reason,
        remainingMinor: draft.remainingMinor
      }),
      dedupeKey + ":panel"
    ]
  );

  await client.query(
    `insert into platform_audit_events
     (actor_user_id,action,subject_type,subject_id,
      result,correlation_id,metadata_json)
     values(
       $1,
       'student.commerce.bank_transfer.follow_up.queued',
       'order',$2,'SUCCESS',gen_random_uuid(),$3
     )`,
    [
      ownerUserId,
      order.id,
      JSON.stringify({
        reason: draft.reason,
        receivedMinor: draft.receivedMinor,
        remainingMinor: draft.remainingMinor,
        emailQueued: true
      })
    ]
  );

  return {
    status: "FOLLOW_UP_QUEUED",
    emailQueued: true,
    delivered: false,
    reason: draft.reason,
    remainingMinor: draft.remainingMinor
  };
}