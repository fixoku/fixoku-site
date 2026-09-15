/* global process */
/** Direct-carrier contracts. Endpoint and field details stay undefined until
 * the selected carrier's official integration is researched and configured.
 * Keeping the boundary provider-neutral allows additional carriers later. */
export const directCarrierContracts = Object.freeze({
  SENDEO: Object.freeze({ name: "SENDEO", selection: "SELECTED", endpoint: null, credentials: null }),
  MNG: Object.freeze({ name: "MNG", selection: "AVAILABLE", endpoint: null, credentials: null }),
  YURTICI: Object.freeze({ name: "YURTICI", selection: "AVAILABLE", endpoint: null, credentials: null }),
  ARAS: Object.freeze({ name: "ARAS", selection: "AVAILABLE", endpoint: null, credentials: null }),
});

export function selectedCarrier(env = process.env) {
  const value = String(env.SHIPPING_PROVIDER || "").toUpperCase();
  return directCarrierContracts[value] || null;
}