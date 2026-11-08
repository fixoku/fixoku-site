// Shared, fail-closed handling for package component pricing.  Draft and
// component edits may create new component UUIDs, so pricing must be copied by
// the stable catalog identity rather than by UUID.

export function componentKey(row) {
  const type = String(row.component_type || row.componentType || "");
  if (type === "TEXT_ITEM") return `${type}:order:${Number(row.display_order ?? row.displayOrder ?? -1)}`;
  return `${type}:product:${String(row.physical_product_id || row.reference_id || row.product_id || row.productId || "")}`;
}

function groupByKey(rows) {
  const groups = new Map();
  for (const row of rows) {
    const key = componentKey(row);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }
  return groups;
}

export async function snapshotComponentPricing(client, versionId) {
  return (await client.query(`
    select pc.id as source_component_id, pc.component_type, pc.reference_id, pc.physical_product_id,
      pc.display_order, p.list_gross_minor, p.effective_sale_gross_minor,
      p.discount_minor, p.discount_percent_bps, p.vat_rate_bps,
      p.net_minor, p.vat_minor, p.currency
    from package_components pc
    join r6_package_component_pricing p on p.package_component_id=pc.id
    where pc.package_version_id=$1
    order by pc.display_order, pc.id
  `, [versionId])).rows;
}

export async function restoreComponentPricing(client, versionId, snapshot) {
  if (!Array.isArray(snapshot) || !snapshot.length) {
    const activeCommercial = (await client.query(`
      select id from package_components
      where package_version_id=$1 and is_active=true and component_type <> 'TEXT_ITEM'
      limit 1
    `, [versionId])).rows;
    if (activeCommercial.length) {
      throw Object.assign(new Error("COMPONENT_PRICING_REVIEW_REQUIRED"), {
        code: "COMPONENT_PRICING_REVIEW_REQUIRED",
        status: 409,
        details: { missing: activeCommercial.map((row) => row.id), reason: "EMPTY_PRICING_SNAPSHOT" },
      });
    }
    return { copied: 0, missing: [], ambiguous: [] };
  }
  const components = (await client.query(`
    select id, component_type, reference_id, physical_product_id, display_order, is_active
    from package_components where package_version_id=$1 order by display_order,id
  `, [versionId])).rows;
  const sourceGroups = groupByKey(snapshot.filter((row) => String(row.component_type || "") !== "TEXT_ITEM"));
  const targetGroups = groupByKey(components.filter((row) => row.is_active !== false && String(row.component_type || "") !== "TEXT_ITEM"));
  const missing = [];
  const ambiguous = [];
  const pairs = [];

  for (const [key, sourceRows] of sourceGroups) {
    const targetRows = targetGroups.get(key) || [];
    // No target row means that the Owner intentionally removed this old
    // component. Its historical price is retained on the old component and
    // does not need to be copied into the new version.
    if (!targetRows.length) continue;
    if (sourceRows.length !== targetRows.length) {
      if (sourceRows.length > 1 && targetRows.length > 0) ambiguous.push({ key, sourceCount: sourceRows.length, targetCount: targetRows.length });
      else if (targetRows.length > sourceRows.length) missing.push({ key, reason: "NEW_COMPONENT_REQUIRES_OWNER_PRICE", targetCount: targetRows.length, sourceCount: sourceRows.length });
      continue;
    }
    // Prefer a preserved component UUID when editing the same draft. This keeps
    // two identical products tied to their own prices even if their display
    // order was changed. New draft UUIDs fall back to the deterministic order.
    const sourceById = new Map(sourceRows.filter((row) => row.source_component_id).map((row) => [String(row.source_component_id), row]));
    const pairedSource = new Set();
    const pairedTarget = new Set();
    targetRows.forEach((target, targetIndex) => {
      const source = sourceById.get(String(target.id));
      if (source) {
        pairs.push({ source, target });
        pairedSource.add(source);
        pairedTarget.add(targetIndex);
      }
    });
    const remainingSources = sourceRows.filter((source) => !pairedSource.has(source));
    const remainingTargets = targetRows.filter((_, index) => !pairedTarget.has(index));
    remainingSources.forEach((source, index) => pairs.push({ source, target: remainingTargets[index] }));
  }
  for (const [key, targetRows] of targetGroups) {
    if (!sourceGroups.has(key)) missing.push({ key, reason: "NEW_COMPONENT_REQUIRES_OWNER_PRICE", targetCount: targetRows.length, sourceCount: 0 });
  }
  if (ambiguous.length) {
    throw Object.assign(new Error("COMPONENT_PRICING_MAPPING_AMBIGUOUS"), { code: "COMPONENT_PRICING_MAPPING_AMBIGUOUS", status: 409, details: { ambiguous, missing } });
  }
  if (missing.length) {
    throw Object.assign(new Error("COMPONENT_PRICING_REVIEW_REQUIRED"), { code: "COMPONENT_PRICING_REVIEW_REQUIRED", status: 409, details: { missing } });
  }
  let copied = 0;
  for (const { source, target } of pairs) {
    await client.query(`
      insert into r6_package_component_pricing
        (package_component_id,list_gross_minor,effective_sale_gross_minor,
         discount_minor,discount_percent_bps,vat_rate_bps,net_minor,vat_minor,currency)
      values($1,$2,$3,$4,$5,$6,$7,$8,$9)
      on conflict (package_component_id) do update set
        list_gross_minor=excluded.list_gross_minor,
        effective_sale_gross_minor=excluded.effective_sale_gross_minor,
        discount_minor=excluded.discount_minor,
        discount_percent_bps=excluded.discount_percent_bps,
        vat_rate_bps=excluded.vat_rate_bps,
        net_minor=excluded.net_minor,
        vat_minor=excluded.vat_minor,
        currency=excluded.currency,
        updated_at=now()
    `, [target.id, source.list_gross_minor, source.effective_sale_gross_minor,
      source.discount_minor, source.discount_percent_bps, source.vat_rate_bps,
      source.net_minor, source.vat_minor, source.currency]);
    copied += 1;
  }
  return { copied, missing: [], ambiguous: [] };
}

export async function assertComponentPricingIntegrity(client, versionIds) {
  if (!Array.isArray(versionIds) || !versionIds.length) return;
  const errors = (await client.query(`
    select pc.package_version_id, pc.id as package_component_id,
      pc.component_type, pc.reference_id, pc.physical_product_id,
      p.list_gross_minor, p.effective_sale_gross_minor, p.discount_minor,
      p.vat_rate_bps, p.net_minor, p.vat_minor
    from package_components pc
    left join r6_package_component_pricing p on p.package_component_id=pc.id
    where pc.package_version_id=any($1::uuid[]) and pc.is_active=true
      and pc.component_type <> 'TEXT_ITEM'
      and (p.package_component_id is null
        or p.effective_sale_gross_minor <> p.list_gross_minor - p.discount_minor
        or p.net_minor + p.vat_minor <> p.effective_sale_gross_minor)
  `, [versionIds])).rows;
  if (errors.length) {
    const missing = errors.filter((row) => row.list_gross_minor == null).map((row) => row.package_component_id);
    const invalid = errors.filter((row) => row.list_gross_minor != null).map((row) => row.package_component_id);
    const error = Object.assign(new Error("MISSING_COMPONENT_PRICING"), {
      code: missing.length ? "MISSING_COMPONENT_PRICING" : "COMPONENT_PRICING_ARITHMETIC_INVALID",
      status: 409,
      details: { missing, invalid },
    });
    throw error;
  }
}
