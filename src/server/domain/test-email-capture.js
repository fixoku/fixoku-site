/* global process */
/* Test-only, process-local lifecycle mail capture. */
const SINK_KEY = "__FIXOKU_LOCAL_MAIL";
const enabled = (env = process.env) => String(env.NODE_ENV || "").toLowerCase() === "test" || String(env.BETTER_AUTH_TEST_MAIL_SINK || "") === "1";
export function isTestEmailCaptureEnabled(env = process.env) { return enabled(env); }
export function captureLifecycleMail({ kind, to, url, metadata = null } = {}, env = process.env) { if (!enabled(env) || typeof url !== "string" || !url) return false; const sink = globalThis[SINK_KEY] ||= []; sink.push({ kind: String(kind || "unknown"), to: String(to || ""), url, metadata }); return true; }
export function consumeLifecycleMail(predicate = () => true) { const sink = globalThis[SINK_KEY]; if (!Array.isArray(sink)) return null; const index = sink.findIndex(predicate); return index < 0 ? null : sink.splice(index, 1)[0] || null; }
export function clearLifecycleMail() { const sink = globalThis[SINK_KEY]; if (Array.isArray(sink)) sink.splice(0, sink.length); }
export function pendingLifecycleMail() { return Array.isArray(globalThis[SINK_KEY]) ? globalThis[SINK_KEY].length : 0; }
