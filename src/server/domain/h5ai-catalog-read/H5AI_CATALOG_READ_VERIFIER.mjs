import plan from './H5AI_APPROVED_PLAN.json' with { type: 'json' };
const trainingByCode = new Map(plan.products.map(p => [p.code, p]));
const knownPackages = new Map(plan.packages.map(p => [p.slug, p]));
const amount = value => Number.isSafeInteger(Number(value)) ? Number(value) : null;
function catalogIndex(products) {
  const m = new Map(); const duplicates = new Set();
  for (const p of products) {
    if (!p?.sku) continue;
    if (m.has(p.sku)) duplicates.add(p.sku);
    m.set(p.sku, p);
  }
  return {m,duplicates};
}
// Read-only consistency projection. Does not claim invoice/DB migration complete.
export function verifyTrainerCatalogRead(packages, products) {
  const {m,duplicates} = catalogIndex(products);
  const result = {};
  for(const pkg of packages) {
    const expected = knownPackages.get(pkg.slug);
    if(!expected) continue;
    const problems=[];
    if(duplicates.size)problems.push('DUPLICATE_SKU');
    if(amount(pkg.priceGrossMinor)!==expected.grossMinor)problems.push('PACKAGE_PRICE_MISMATCH');
    const required = [...expected.bookSkus, ...(expected.software ? ['FIXOKU-SOFTWARE-AI'] : []), ...expected.trainingCodes.map(code=>trainingByCode.get(code).sku)];
    const selected=(pkg.components||[]).filter(c=>c.isActive!==false && c.componentType!=='TEXT_ITEM');
    const actual = selected.map(c=>c.sku).filter(Boolean);
    for(const sku of required) {
      const product=m.get(sku);
      if(!product){ problems.push(`MISSING_CATALOG_PRODUCT:${sku}`); continue; }
      if(!product.id)problems.push(`MISSING_PRODUCT_ID:${sku}`);
      if(product.isActive===false)problems.push(`INACTIVE_PRODUCT:${sku}`);
      if(expected.bookSkus.includes(sku)) {
        if(amount(product.unitPriceMinor)!==55000)problems.push(`BOOK_PRICE_NOT_550:${sku}`);
        if(product.productType!=='PHYSICAL')problems.push(`BOOK_TYPE_INVALID:${sku}`);
      }
      const service=plan.products.find(x=>x.sku===sku);
      if(service && (product.productType!=='SERVICE'||amount(product.unitPriceMinor)!==service.grossMinor||product.trainingCode!==service.code))problems.push(`TRAINING_PRODUCT_MISMATCH:${sku}`);
    }
    for(const sku of required)if(!actual.includes(sku))problems.push(`NOT_LINKED_TO_VERSION:${sku}`);
    for(const sku of actual)if(!required.includes(sku))problems.push(`UNEXPECTED_OR_LEGACY_COMPONENT:${sku}`);
    // Duplicate links also fail closed.
    if(new Set(actual).size!==actual.length)problems.push('DUPLICATE_COMPONENT');
    result[pkg.id||pkg.slug]={status:problems.length?'REQUIRES_MIGRATION_OR_REVIEW':'CATALOG_LINKS_VERIFIED',issues:[...new Set(problems)],packageVersionId:pkg.packageVersionId||null,expectedComponentCount:required.length,linkedComponentCount:actual.length,dbWritesPerformed:false,invoiceVerified:false};
  }
  return result;
}
