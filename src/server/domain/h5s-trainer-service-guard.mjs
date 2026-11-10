// R60C-20H5S: fail-closed validation before any package component DELETE/INSERT.
// Pure function, no database access or side effects.
const approved = Object.freeze({
  'FX-TRN-PRIMARY-FAST': [739000, 'PRIMARY_FAST'],
  'FX-TRN-MIDDLE-FAST': [739000, 'MIDDLE_FAST'],
  'FX-TRN-HIGH-FAST': [794000, 'HIGH_FAST'],
  'FX-TRN-ADULT-FAST': [794000, 'ADULT_FAST'],
  'FX-TRN-MIDDLE-PARAGRAPH': [844000, 'MIDDLE_PARAGRAPH'],
  'FX-TRN-HIGH-PARAGRAPH': [944000, 'HIGH_PARAGRAPH'],
});
export function assertTrainerServiceProducts(components, products) {
  if (!Array.isArray(components) || !Array.isArray(products)) throw new Error('TRAINER_INPUT_INVALID');
  const byId = new Map(products.map(p=>[String(p.id),p]));
  const seen = new Set();
  for (const c of components) {
    if (String(c.componentType) !== 'TRAINER_SERVICE' || c.isActive === false) continue;
    const id=String(c.physicalProductId || c.productId || c.referenceId || '');
    const p=byId.get(id);
    if (!p || String(p.productType)!=='TRAINING_SERVICE') throw new Error('TRAINER_PRODUCT_INVALID');
    const approvedItem=approved[String(p.sku)];
    if (!approvedItem) throw new Error('TRAINER_SKU_NOT_APPROVED');
    if (!Number.isSafeInteger(Number(p.listGrossMinor)) || Number(p.listGrossMinor)!==approvedItem[0] || Number(p.vatRateBps)!==2000)
      throw new Error('TRAINER_PRODUCT_PRICE_VAT_MISMATCH');
    if (seen.has(p.sku)) throw new Error('TRAINER_SPECIALTY_DUPLICATED');
    seen.add(p.sku);
    if (Number(c.quantity)!==1) throw new Error('TRAINER_QUANTITY_INVALID');
  }
  return {valid:true,trainerSpecialtyCount:seen.size};
}
