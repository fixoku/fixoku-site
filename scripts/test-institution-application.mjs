import assert from "node:assert/strict";
import {
  createInstitutionApplicationHandler,
  INSTITUTION_APPLICATION_RECIPIENT,
} from "../api/institution-application.js";
import { SITE_ORIGIN } from "../src/config/site.js";
import { INSTITUTION_READING_LANDING_PATH } from "../src/data/institutionReadingLanding.js";

const fixedNow = 1_800_000_000_000;
const smtpEnv = {
  SMTP_HOST: "smtp.example.test",
  SMTP_PORT: "587",
  SMTP_SECURE: "false",
  SMTP_USER: "contract-user",
  SMTP_PASS: "contract-password",
  MAIL_FROM: "Fixoku Contract <no-reply@example.test>",
};

function createPayload(overrides = {}) {
  return {
    fullName: "Deniz Yılmaz",
    institutionName: "Örnek Eğitim Kurumu",
    email: "deniz@example.test",
    phone: "+90 532 000 00 00",
    city: "İzmir",
    district: "Konak",
    institutionType: "Özel Okul",
    studentCount: 320,
    message: "Kurumumuz için güncel uygulama modeli hakkında bilgi almak istiyoruz.",
    consent: true,
    website: "",
    startedAt: fixedNow - 5000,
    route: INSTITUTION_READING_LANDING_PATH,
    ...overrides,
  };
}

function createResponse() {
  return {
    statusCode: 200,
    headers: {},
    body: "",
    setHeader(name, value) {
      this.headers[name.toLowerCase()] = value;
    },
    end(body = "") {
      this.body = String(body);
    },
  };
}

async function invoke(handler, {
  body = createPayload(),
  contentType = "application/json; charset=utf-8",
  ip = "127.0.0.10",
  method = "POST",
  origin = SITE_ORIGIN,
} = {}) {
  const response = createResponse();
  await handler({
    method,
    headers: {
      "content-type": contentType,
      origin,
      "x-forwarded-for": ip,
    },
    body,
    socket: { remoteAddress: ip },
  }, response);

  return {
    ...response,
    json: response.body ? JSON.parse(response.body) : null,
  };
}

function createFakeHandler({ env = smtpEnv, failDelivery = false, loggerMessages = [] } = {}) {
  const calls = [];
  const configurations = [];
  const handler = createInstitutionApplicationHandler({
    env,
    now: () => fixedNow,
    logger: {
      error(message) {
        loggerMessages.push(String(message));
      },
    },
    transportFactory(configuration) {
      configurations.push(configuration);
      return {
        async sendMail(mail) {
          calls.push(mail);
          if (failDelivery) throw new Error("simulated transport failure");
          return { messageId: "contract-only" };
        },
      };
    },
  });

  return { calls, configurations, handler };
}

const delivery = createFakeHandler();
const validResult = await invoke(delivery.handler);
assert.equal(validResult.statusCode, 200);
assert.deepEqual(validResult.json, { ok: true });
assert.equal(delivery.calls.length, 1);
assert.equal(delivery.configurations.length, 1);
assert.equal(delivery.calls[0].to, INSTITUTION_APPLICATION_RECIPIENT);
assert.equal(delivery.calls[0].to, "info@fixoku.com");
assert.equal(delivery.calls[0].replyTo, "deniz@example.test");
assert.equal(delivery.calls[0].subject, "Fixoku Kurum Başvurusu — Örnek Eğitim Kurumu");
for (const expected of [
  "Deniz Yılmaz",
  "Örnek Eğitim Kurumu",
  "deniz@example.test",
  "+90 532 000 00 00",
  "İzmir",
  "Konak",
  "Özel Okul",
  "320",
  "güncel uygulama modeli",
  "Aydınlatma Onayı: Evet",
  INSTITUTION_READING_LANDING_PATH,
]) {
  assert.ok(delivery.calls[0].text.includes(expected), `Mail body missing: ${expected}`);
}

const missingSmtp = createFakeHandler({ env: {} });
const missingSmtpResult = await invoke(missingSmtp.handler);
assert.equal(missingSmtpResult.statusCode, 503);
assert.equal(missingSmtpResult.json.ok, false);
assert.equal(missingSmtp.calls.length, 0);

const invalidMethod = await invoke(createFakeHandler().handler, { method: "GET" });
assert.equal(invalidMethod.statusCode, 405);

const invalidContentType = await invoke(createFakeHandler().handler, { contentType: "text/plain" });
assert.equal(invalidContentType.statusCode, 400);

const invalidOrigin = await invoke(createFakeHandler().handler, { origin: "https://invalid.example" });
assert.equal(invalidOrigin.statusCode, 403);

const honeypot = await invoke(createFakeHandler().handler, {
  body: createPayload({ website: "bot.example" }),
});
assert.equal(honeypot.statusCode, 400);

const tooFast = await invoke(createFakeHandler().handler, {
  body: createPayload({ startedAt: fixedNow - 500 }),
});
assert.equal(tooFast.statusCode, 400);

const invalidEmail = await invoke(createFakeHandler().handler, {
  body: createPayload({ email: "gecersiz" }),
});
assert.equal(invalidEmail.statusCode, 400);

const headerInjection = await invoke(createFakeHandler().handler, {
  body: createPayload({ institutionName: "Kurum\r\nBcc: attacker@example.test" }),
});
assert.equal(headerInjection.statusCode, 400);

const oversizedMessage = await invoke(createFakeHandler().handler, {
  body: createPayload({ message: "x".repeat(2001) }),
});
assert.equal(oversizedMessage.statusCode, 400);

const oversizedBody = await invoke(createFakeHandler().handler, {
  body: createPayload({ message: "x".repeat(25000) }),
});
assert.equal(oversizedBody.statusCode, 413);

const negativeCount = await invoke(createFakeHandler().handler, {
  body: createPayload({ studentCount: -1 }),
});
assert.equal(negativeCount.statusCode, 400);

const loggerMessages = [];
const failingDelivery = createFakeHandler({ failDelivery: true, loggerMessages });
const failingDeliveryResult = await invoke(failingDelivery.handler);
assert.equal(failingDeliveryResult.statusCode, 502);
assert.equal(failingDeliveryResult.json.ok, false);
const observableFailure = JSON.stringify({ response: failingDeliveryResult.json, loggerMessages });
for (const secret of [smtpEnv.SMTP_HOST, smtpEnv.SMTP_USER, smtpEnv.SMTP_PASS, "Deniz Yılmaz"]) {
  assert.equal(observableFailure.includes(secret), false, `Sensitive value leaked: ${secret}`);
}

const rateLimited = createFakeHandler();
const rateStatuses = [];
for (let index = 0; index < 6; index += 1) {
  const result = await invoke(rateLimited.handler, { ip: "127.0.0.99" });
  rateStatuses.push(result.statusCode);
}
assert.deepEqual(rateStatuses, [200, 200, 200, 200, 200, 429]);
assert.equal(rateLimited.calls.length, 5);

console.log("Institution application contract tests passed: 16 scenarios, real SMTP delivery disabled.");
