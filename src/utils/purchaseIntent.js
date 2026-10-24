const KEY = "fixoku:student-purchase-intent";
const TTL_MS = 15 * 60 * 1000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

export function rememberStudentPurchaseIntent(packageVersionId) {
  const value = String(packageVersionId || "").trim();
  if (!UUID.test(value) || typeof window === "undefined") return false;
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify({ packageVersionId: value, createdAt: Date.now() }));
    return true;
  } catch { return false; }
}

export function readStudentPurchaseIntent() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (!raw) return null;
    const value = JSON.parse(raw);
    if (!value || !UUID.test(String(value.packageVersionId || "")) || !Number.isFinite(Number(value.createdAt)) || Date.now() - Number(value.createdAt) > TTL_MS) {
      window.sessionStorage.removeItem(KEY);
      return null;
    }
    return { packageVersionId: String(value.packageVersionId) };
  } catch { return null; }
}

export function consumeStudentPurchaseIntent() {
  const value = readStudentPurchaseIntent();
  try { window.sessionStorage.removeItem(KEY); } catch { /* storage may be unavailable */ }
  return value;
}
