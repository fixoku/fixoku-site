// FIXOKU R57: Deterministic gross-price allocation, integer kurus only.
// Largest-remainder method keeps the sum exactly equal to the package price.
export function allocatePackageGross(priceMinor, weights) {
  if (!Number.isSafeInteger(priceMinor) || priceMinor < 0) throw new Error("PACKAGE_PRICE_INVALID");
  if (!Array.isArray(weights) || weights.length === 0 || weights.some(w => !Number.isSafeInteger(w) || w < 0)) throw new Error("PACKAGE_COMPONENT_WEIGHTS_INVALID");
  const positiveTotal = weights.reduce((total, w) => total + BigInt(w), 0n);
  const effective = positiveTotal === 0n ? weights.map(() => 1n) : weights.map(w => BigInt(w));
  const total = effective.reduce((n, w) => n + w, 0n);
  const target = BigInt(priceMinor);
  const shares = effective.map(w => (target * w) / total);
  let left = target - shares.reduce((n, w) => n + w, 0n);
  const ranked = effective.map((w, i) => ({i, rem: (target * w) % total})).sort((a,b) => a.rem === b.rem ? a.i - b.i : a.rem > b.rem ? -1 : 1);
  for (const {i} of ranked) { if (left === 0n) break; shares[i] += 1n; left -= 1n; }
  const result = shares.map(w => Number(w));
  if (result.some(w => !Number.isSafeInteger(w)) || result.reduce((a,b) => a + b, 0) !== priceMinor) throw new Error("PACKAGE_ALLOCATION_OVERFLOW");
  return result;
}
