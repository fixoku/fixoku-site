// H5Y: fail-closed publication gate for approved trainer seed packages. No data mutations.
export const APPROVED_TRAINER_PRICES = Object.freeze({
  'ilkokul-akici-hizli-okuma-egitimi':1199000,
  'ortaokul-hizli-okuma-egitimi':1199000,
  'lise-hizli-okuma-egitimi':1199000,
  'yetiskin-hizli-okuma-egitimi':1199000,
  'ortaokul-paragraf-teknikleri-egitmen-egitimi-lgs':899000,
  'lise-paragraf-teknikleri-egitmen-egitimi-tyt-ayt':999000,
  'ortaokul-lise-yetiskin-hizli-okuma-egitimi':1750000,
  'ortaokul-lise-paragraf-egitmen-egitimi-ikili-set':1250000
});
export const PACKAGE_TRAININGS = Object.freeze({
  'ilkokul-akici-hizli-okuma-egitimi':['FX-TRN-PRIMARY-FAST'],
  'ortaokul-hizli-okuma-egitimi':['FX-TRN-MIDDLE-FAST'],
  'lise-hizli-okuma-egitimi':['FX-TRN-HIGH-FAST'],
  'yetiskin-hizli-okuma-egitimi':['FX-TRN-ADULT-FAST'],
  'ortaokul-paragraf-teknikleri-egitmen-egitimi-lgs':['FX-TRN-MIDDLE-PARAGRAPH'],
  'lise-paragraf-teknikleri-egitmen-egitimi-tyt-ayt':['FX-TRN-HIGH-PARAGRAPH'],
  'ortaokul-lise-yetiskin-hizli-okuma-egitimi':['FX-TRN-MIDDLE-FAST','FX-TRN-HIGH-FAST','FX-TRN-ADULT-FAST'],
  'ortaokul-lise-paragraf-egitmen-egitimi-ikili-set':['FX-TRN-MIDDLE-PARAGRAPH','FX-TRN-HIGH-PARAGRAPH']
});
export function assertApprovedTrainerPublication({slug,priceGrossMinor,components}) {
 if (!Object.hasOwn(APPROVED_TRAINER_PRICES,slug)) return {scope:'CUSTOM_PACKAGE_UNCHANGED'};
 if (!Number.isSafeInteger(Number(priceGrossMinor)) || Number(priceGrossMinor)!==APPROVED_TRAINER_PRICES[slug]) throw Object.assign(new Error('TRAINER_APPROVED_PRICE_MISMATCH'),{status:409});
 if (!Array.isArray(components)) throw Object.assign(new Error('TRAINER_COMPONENTS_NOT_VERIFIED'),{status:409});
 const active=components.filter(c=>c.isActive!==false);
 if(active.some(c=>c.componentType==='TRAINER_SERVICE' && c.productType!=='TRAINING_SERVICE')) throw Object.assign(new Error('TRAINER_LEGACY_SERVICE_PRESENT'),{status:409});
 const services=active.filter(c=>c.componentType==='TRAINER_SERVICE');
 const actual=services.map(c=>c.sku);
 const expected=PACKAGE_TRAININGS[slug];
 if(actual.length!==expected.length || new Set(actual).size!==actual.length || actual.some(s=>!expected.includes(s)))throw Object.assign(new Error('TRAINER_SPECIALTY_COMPONENT_MISMATCH'),{status:409});
 if(services.some(c=>Number(c.vatRateBps)!==2000 || !Number.isSafeInteger(Number(c.listGrossMinor)) || Number(c.listGrossMinor)<=0))throw Object.assign(new Error('TRAINER_SERVICE_PRICE_OR_VAT_INVALID'),{status:409});
 return {scope:'APPROVED',trainingCount:services.length};
}
export async function assertTrainerPublicationFromDb(client,{slug,versionId}) {
 if (!Object.hasOwn(APPROVED_TRAINER_PRICES,slug)) return {scope:'CUSTOM_PACKAGE_UNCHANGED'};
 const version=(await client.query('select price_gross_minor as "priceGrossMinor" from package_versions where id=$1',[versionId])).rows[0];
 if(!version)throw Object.assign(new Error('TRAINER_VERSION_NOT_FOUND'),{status:404});
 const components=(await client.query(`select c.component_type as "componentType",c.is_active as "isActive",p.sku,p.product_type as "productType",p.vat_rate_bps as "vatRateBps",p.list_gross_minor as "listGrossMinor" from package_components c left join physical_products p on p.id=c.physical_product_id where c.package_version_id=$1`,[versionId])).rows;
 return assertApprovedTrainerPublication({slug,priceGrossMinor:version.priceGrossMinor,components});
}
