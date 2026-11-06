export function normalizeOwnerNote(value) {
  if (typeof value !== "string") throw new Error("NOTE_MUST_BE_TEXT");
  const cleaned = value.replace(/\r\n?/gu,"\n");
  if (cleaned.length > 4000) throw new Error("NOTE_TOO_LONG");
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(cleaned)) throw new Error("NOTE_CONTROL_CHAR");
  return cleaned;
}
export function assertPackageId(value) {
  if(!/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/iu.test(value||"")) throw new Error("PACKAGE_ID_INVALID");
  return value;
}
