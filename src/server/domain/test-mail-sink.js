/* Backwards-compatible alias for the canonical in-process lifecycle mail sink. */
export { captureLifecycleMail as captureTestMail, consumeLifecycleMail as consumeTestMail, clearLifecycleMail as clearTestMailSink, isTestEmailCaptureEnabled as isTestMailSinkEnabled, pendingLifecycleMail as pendingTestMailCount } from "./test-email-capture.js";
