// H5AJ: Owner-only read projection from real package_components / physical_products rows.
// No DB write, pricing inference, invoice authority or product creation.
const canonical = value => typeof value === 'string' ? value.trim() : '';
const nonempty = value => typeof value === 'string' && value.trim().length > 0;
export function projectCatalogLinkedComponents(packages, products) {
  if (!Array.isArray(packages) || !Array.isArray(products)) throw new TypeError('H5AJ_INPUT_INVALID');
  const productById = new Map();
  const ambiguous = new Set();
  for (const p of products) {
    if (!p || !nonempty(p.id)) continue;
    if (productById.has(p.id)) ambiguous.add(p.id);
    else productById.set(p.id, p);
  }
  return packages.map(pkg => {
    const components = Array.isArray(pkg?.components) ? pkg.components : [];
    const links = components.filter(c => c?.isActive !== false).map(c => {
      const id = canonical(c?.physicalProductId || c?.productId);
      const product = productById.get(id);
      const sku = canonical(c?.sku);
      let status = 'LINK_OK';
      if (!id || !product || ambiguous.has(id)) status = 'PRODUCT_ID_NOT_RESOLVED';
      else if (!sku || sku !== canonical(product.sku)) status = 'SKU_MISMATCH';
      else if (sku.includes('INDIVIDUAL')) status = 'LEGACY_STUDENT_SERVICE';
      else if (product.isActive === false) status = 'PRODUCT_INACTIVE';
      else if (Number(c.quantity) <= 0 || !Number.isSafeInteger(Number(c.quantity))) status = 'QUANTITY_INVALID';
      return {
        componentId: c?.componentId ?? null,
        productId: id || null,
        sku: sku || null,
        productTitle: product?.title ?? c?.title ?? null,
        componentType: c?.componentType ?? null,
        quantity: c?.quantity ?? null,
        status,
        // No synthetic prices; only raw catalog amount if server returned a verified number.
        catalogUnitGrossMinor: Number.isSafeInteger(product?.unitPriceMinor) && product.unitPriceMinor > 0 ? product.unitPriceMinor : null
      };
    });
    return {packageId:pkg?.id ?? null, packageVersionId:pkg?.packageVersionId ?? null,
      slug:pkg?.slug ?? null, source:'DATABASE_READ', ready:links.length > 0 && links.every(link => link.status === 'LINK_OK'), links};
  });
}
