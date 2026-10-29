function clean(value: string | null | undefined) {
  return String(value || "").trim().replace(/\s+/gu, " ");
}

/**
 * Build a display-only student name without changing the profile record.
 * Some legacy profiles contain the same full value in both name fields; in
 * that case rendering both fields would show the student twice.
 */
export function studentDisplayName(
  firstName: string | null | undefined,
  lastName: string | null | undefined,
  yedek: string | null | undefined,
) {
  const first = clean(firstName);
  const last = clean(lastName);
  if (first && last && first.localeCompare(last, "tr", { sensitivity: "accent" }) === 0) return first;
  return [first, last].filter(Boolean).join(" ") || clean(yedek) || "Öğrenci";
}
