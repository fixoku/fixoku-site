/**
 * Only one student catalog card per canonical package.
 * Historical entitlement/version IDs must never be rewritten.
 * Prefer an owned row over an available newer version.
 */
export function collapseStudentPackageCards(packages) {
  if (!Array.isArray(packages)) {
    throw new TypeError("STUDENT_PACKAGES_INVALID");
  }

  const grouped = new Map();
  const priority = (row) =>
    row.accessState === "OWNED" ? 3 :
    row.accessState === "PENDING_PAYMENT" ? 2 : 1;

  for (const row of packages) {
    const id = String(row.packageId || "");
    const key = id || String(row.packageVersionId || "");
    if (!key) throw new Error("PACKAGE_ID_REQUIRED");

    const current = grouped.get(key);
    if (!current ||
        priority(row) > priority(current) ||
        (priority(row) === priority(current) &&
          Number(row.versionNumber || 0) >
          Number(current.versionNumber || 0))) {
      grouped.set(key, row);
    }
  }
  return [...grouped.values()];
}