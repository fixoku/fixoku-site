import assert from "node:assert/strict";
import { EMAIL_TEMPLATE_COUNT, renderEmail, renderEmailForEvent } from "../src/server/domain/email-renderer.js";
import { getSmtpConfig, processOutboxBatch } from "../src/server/domain/email-outbox.js";

assert.equal(EMAIL_TEMPLATE_COUNT, 57);
const { EMAIL_EVENT_TEMPLATE_MAP } = await import("../src/server/domain/email-templates.js");
const r399Expected = {
  OWNER_REASSIGNMENT_PENDING: "owner-reassignment-pending",
  OWNER_CLASS_SCHEDULED: "owner-class-scheduled",
  OWNER_CLASS_RESCHEDULED: "owner-class-rescheduled",
  R399_CLASS_LEARNER_ASSIGNED: "class-learner-assigned",
  R399_CLASS_LEARNER_SCHEDULED: "class-learner-scheduled",
  R399_LEARNER_REMOVED: "r399-learner-removed",
  R399_TRAINER_REMOVED: "r399-trainer-removed",
  R399_LEARNER_ASSIGNMENT: "r399-learner-assignment",
  R399_CLASS_LEARNER_RESCHEDULED: "class-learner-rescheduled",
  R399_CLASS_ASSIGNED: "class-assigned",
  R399_CLASS_STUDENT_ADDED: "class-student-added",
  R399_CLASS_STUDENT_REMOVED: "class-student-removed"
};
for (const [event, template] of Object.entries(r399Expected)) {
  assert.equal(EMAIL_EVENT_TEMPLATE_MAP[event], template);
}
const marketing = renderEmail("marketing-permission-aware", { recipientName: "<em>Demo</em>", body: "İzinli içerik", reference: "R-1", unsubscribePath: "/tercihler" });
assert.equal(marketing.from, "kampanya@fixoku.com");
assert.equal(marketing.replyTo, "destek@fixoku.com");
assert.ok(marketing.html.includes("List-Unsubscribe") === false); // header belongs to transport metadata
assert.ok(marketing.headers["List-Unsubscribe"].includes("/tercihler"));
assert.ok(marketing.html.includes("&lt;em&gt;Demo&lt;/em&gt;"));
assert.ok(marketing.text.includes("Abonelikten çık:"));
assert.ok(marketing.html.includes("<!--[if mso]>"));
assert.ok(marketing.html.includes("background-color:#ffffff"));
assert.ok(marketing.html.includes("siyah-logo-fixoku.png"));
assert.ok(marketing.html.includes('alt="FIXOKU"'));
assert.ok(marketing.html.includes("background:linear-gradient(110deg,#51156f,#d6601b)"));
const trainerWelcome = renderEmailForEvent("trainer-welcome", { recipientName: "Selin Yıldız", ctaPath: "https://fixoku.com/ogretmen-girisi" });
assert.equal(trainerWelcome.subject, "FIXOKU'ya Hoş Geldiniz | Eğitmen Hesabınız");
assert.equal(trainerWelcome.from, "egitmen@fixoku.com");
assert.ok(trainerWelcome.html.includes("https://fixoku.com/ogretmen-girisi"));
assert.ok(trainerWelcome.html.includes("info@fixoku.com"));

let sent;
let claim = 0;
const client = { query: async (sql) => {
  if (sql.startsWith("update notification_email_outbox set status='PROCESSING'")) {
    if (claim++) return { rows: [] };
    return { rows: [{ id: "renderer-1", event_type: "PROFILE_COMPLETION", recipient_email: "demo@example.test", recipient_name: "Demo", reference: "R-1", cta_path: "/tercihler", subject: "Demo", body: "Gövde", attempt_count: 1 }] };
  }
  return { rows: [] };
} };
const result = await processOutboxBatch({ client, env: { EMAIL_PROVIDER: "TEST", SMTP_FROM: "local@invalid.test" }, transportFactory: () => ({ sendMail: async (message) => { sent = message; return { messageId: "test-1" }; } }) });
assert.equal(result.processed, 1);
assert.equal(sent.from, "local@invalid.test");
assert.ok(sent.html.includes("<!doctype html>"));
assert.ok(sent.html.includes("Merhaba Demo,"));
assert.ok(sent.text.includes("Merhaba Demo,"));
assert.ok(!sent.html.includes("Fixoku müşterisi"));
assert.ok(sent.text.includes("Gövde"));
assert.equal(getSmtpConfig({ EMAIL_PROVIDER: "DISABLED" }), null);
console.log(JSON.stringify({ emailTemplateCount: EMAIL_TEMPLATE_COUNT, html: "PASS", plainText: "PASS", escaping: "PASS", testTransport: "PASS", marketingHeaders: "PASS" }));
