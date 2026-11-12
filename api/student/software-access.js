import pg from "pg";
import {
  resolvePrincipal,
  requirePermission
} from "../../src/server/auth/authorization.js";
import {
  resolveBeneficiary,
  UUID_PATTERN
} from "../../src/server/domain/commerce.js";

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.end(JSON.stringify(body));
}

function headersOf(req) {
  return new Headers(
    Object.entries(req.headers || {}).map(
      ([name, value]) => [
        name,
        Array.isArray(value) ? value.join(",") : String(value)
      ]
    )
  );
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return json(res, 405, { error: "METHOD_NOT_ALLOWED" });
  }

  const principal = await resolvePrincipal(headersOf(req));

  if (!principal?.user) {
    return json(res, 401, { error: "UNAUTHENTICATED" });
  }

  const roleAllowed = principal.memberships.some(
    item => ["STUDENT", "GUARDIAN"].includes(item.role)
  );

  if (!roleAllowed) {
    return json(res, 403, { error: "FORBIDDEN" });
  }

  const denied = requirePermission(principal, "package.read");

  if (denied) {
    return json(res, denied.status, denied.body);
  }

  const query = new URL(req.url, "http://local").searchParams;

  const requested =
    query.get("childProfileId") ||
    query.get("studentProfileId") ||
    null;

  if (requested && !UUID_PATTERN.test(requested)) {
    return json(res, 403, { error: "FORBIDDEN" });
  }

  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL
  });

  let client;

  try {
    client = await pool.connect();

    const beneficiary = await resolveBeneficiary(
      client,
      principal,
      requested
    );

    const result = await client.query(`
      select distinct
        p.slug,
        pv.title,
        pe.source_type as "sourceType"
      from package_entitlements pe
      join packages p
        on p.id=pe.package_id
      join package_versions pv
        on pv.id=pe.package_version_id
      where pe.beneficiary_student_user_id=$1
        and pe.beneficiary_child_profile_id
          is not distinct from $2::uuid
        and pe.status='ACTIVE'
        and pe.revoked_at is null
        and pe.effective_at<=now()
        and (
          pe.expires_at is null
          or pe.expires_at>now()
        )
        and (
          pe.source_type='OWNER_MANUAL'
          or exists (
            select 1 from orders o
            where o.id=pe.source_order_id
              and o.status in ('PAID','PARTIALLY_REFUNDED')
          )
        )
        and p.audience='STUDENT'
        and p.catalog_scope='STUDENT_COMMERCE'
        and exists (
          select 1
          from package_components pc
          join physical_products pp
            on pp.id=coalesce(
              pc.physical_product_id,
              pc.reference_id
            )
          where pc.package_version_id=pe.package_version_id
            and pc.is_active=true
            and pc.component_type='DIGITAL_ACCESS'
            and pp.product_type='DIGITAL'
        )
      order by p.slug,pv.title,pe.source_type
    `, [
      beneficiary.studentUserId,
      beneficiary.childProfileId || null
    ]);

    const packages = result.rows.map(row => ({
      slug: row.slug,
      title: row.title,
      source:
        row.sourceType === "OWNER_MANUAL"
          ? "OWNER_FREE"
          : "PURCHASED"
    }));

    return json(res, 200, {
      softwareRightRecorded: packages.length > 0,
      softwareActivation: "NOT_CONNECTED",
      softwareUsable: false,
      packages
    });

  } catch (error) {
    const allowedError =
      Number.isInteger(error?.status) &&
      error.status >= 400 &&
      error.status < 500;

    return json(
      res,
      allowedError ? error.status : 503,
      {
        error: allowedError
          ? (error.code || "FORBIDDEN")
          : "SOFTWARE_RIGHTS_READ_FAILED"
      }
    );
  } finally {
    if (client) client.release();
    await pool.end();
  }
}
