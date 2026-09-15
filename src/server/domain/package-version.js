const PROTECTED_FIELDS = ["title", "description", "price_minor", "currency"];

export async function updatePackageVersion(client, versionId, patch) {
  const current = (await client.query("select * from package_versions where id=$1 for update", [versionId])).rows[0];
  if (!current) throw Object.assign(new Error("PACKAGE_VERSION_NOT_FOUND"), { code: "PACKAGE_VERSION_NOT_FOUND", status: 404 });
  const changed = PROTECTED_FIELDS.some((field) => patch[field] !== undefined && String(patch[field] ?? "") !== String(current[field] ?? ""));
  if (changed && ["PUBLISHED", "RETIRED"].includes(current.status)) throw Object.assign(new Error("PUBLISHED_VERSION_IMMUTABLE"), { code: "PUBLISHED_VERSION_IMMUTABLE", status: 409 });
  const next = { ...current, ...patch };
  await client.query("update package_versions set title=$1,description=$2,price_minor=$3,currency=$4,updated_at=now() where id=$5", [next.title, next.description, next.price_minor, next.currency, versionId]);
  return (await client.query("select * from package_versions where id=$1", [versionId])).rows[0];
}

export async function createDraftPackageVersion(client, packageId, fields) {
  const next = (await client.query("select coalesce(max(version_number),0)+1 as version from package_versions where package_id=$1", [packageId])).rows[0].version;
  return (await client.query("insert into package_versions(package_id,version_number,title,description,price_minor,currency,status) values($1,$2,$3,$4,$5,$6,'DRAFT') returning *", [packageId, next, fields.title, fields.description, fields.price_minor ?? null, fields.currency ?? null])).rows[0];
}

export async function publishPackageVersion(client, versionId) {
  return (await client.query("update package_versions set status='PUBLISHED',published_at=now(),updated_at=now() where id=$1 and status='DRAFT' returning *", [versionId])).rows[0] ?? null;
}