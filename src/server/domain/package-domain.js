export const PACKAGE_DOMAIN_CONTRACTS = Object.freeze({
  LEGACY_EDUCATION: Object.freeze({ audience: "STUDENT", catalogScope: "LEGACY_EDUCATION" }),
  STUDENT_COMMERCE: Object.freeze({ audience: "STUDENT", catalogScope: "STUDENT_COMMERCE" }),
  TRAINER_COMMERCE: Object.freeze({ audience: "TRAINER", catalogScope: "TRAINER_COMMERCE" }),
});

export const TRAINER_COMPATIBLE_SCOPES = Object.freeze(["TRAINER_COMMERCE", "LEGACY_EDUCATION"]);

export function packageBelongsToDomain(row, domain) {
  const contract = PACKAGE_DOMAIN_CONTRACTS[domain];
  return Boolean(contract && row?.audience === contract.audience && row?.catalog_scope === contract.catalogScope);
}

export function isLegacyPackageDomain(row) {
  return packageBelongsToDomain(row, "LEGACY_EDUCATION");
}

export function isStudentCommercePackageDomain(row) {
  return packageBelongsToDomain(row, "STUDENT_COMMERCE");
}

export function isTrainerPackageDomain(row) {
  return row?.audience === "TRAINER" && TRAINER_COMPATIBLE_SCOPES.includes(row?.catalog_scope);
}
