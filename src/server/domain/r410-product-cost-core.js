export const COST_TYPES = Object.freeze(["PHYSICAL", "SOFTWARE"]);
export function parseOwnerCost(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw Object.assign(new Error("COST_INPUT_INVALID"),{status:400});
  const productId = String(input.productId || "");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu.test(productId)) throw Object.assign(new Error("COST_PRODUCT_ID_INVALID"),{status:400});
  const raw = input.costMinor;
  if (typeof raw !== "number" || !Number.isSafeInteger(raw) || raw < 0 || raw > 2147483647) throw Object.assign(new Error("COST_AMOUNT_INVALID"),{status:400});
  if (raw === 0 && input.zeroCostConfirmed !== true) throw Object.assign(new Error("ZERO_COST_CONFIRMATION_REQUIRED"),{status:400});
  const note = typeof input.note === "string" ? input.note.trim() : "";
  if (note.length > 500) throw Object.assign(new Error("COST_NOTE_TOO_LONG"),{status:400});
  if (!Number.isSafeInteger(input.expectedVersion) || input.expectedVersion < 0) throw Object.assign(new Error("COST_STALE_VERSION"),{status:409});
  return Object.freeze({ productId, costMinor:raw, expectedVersion:input.expectedVersion, note, zeroCostConfirmed:input.zeroCostConfirmed === true });
}
export function computeKnownProductCost(items, costMap) {
  if (!Array.isArray(items)) throw new Error("COST_ITEMS_INVALID");
  let total = 0;
  const missing = [];
  for (const item of items) {
    const quantity=Number(item.quantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) throw new Error("COST_QUANTITY_INVALID");
    const unit=costMap?.[item.productId];
    if (!Number.isSafeInteger(unit) || unit<0) { missing.push(item.productId); continue; }
    const line = quantity*unit;
    if (!Number.isSafeInteger(line) || !Number.isSafeInteger(total+line)) throw new Error("COST_SUM_OVERFLOW");
    total+=line;
  }
  return { status:missing.length ? "INCOMPLETE" : "COMPLETE", costMinor:missing.length?null:total, missingProductIds:[...new Set(missing)] };
}
