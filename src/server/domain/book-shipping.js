// All amounts are VAT-included integer kuruş. Only actual physical books count.
export function countPhysicalBooks(lines) {
  if (!Array.isArray(lines)) throw new TypeError("SHIPPING_LINES_INVALID");
  return lines.reduce((total, line) => {
    const type = String(line?.productType ?? line?.r6ProductType ?? "").toUpperCase();
    const quantity = Number(line?.quantity ?? 1);
    if (!Number.isSafeInteger(quantity) || quantity < 1) throw new RangeError("BOOK_QUANTITY_INVALID");
    const next = total + (type === "PHYSICAL" || type === "BOOK" ? quantity : 0);
    if (!Number.isSafeInteger(next)) throw new RangeError("BOOK_QUANTITY_OVERFLOW");
    return next;
  }, 0);
}

export function shippingForBookCount(bookCount) {
  if (!Number.isSafeInteger(bookCount) || bookCount < 0) throw new RangeError("BOOK_COUNT_INVALID");
  return bookCount === 1 ? 10_000 : bookCount === 2 ? 15_000 : 0;
}

export function shippingForPhysicalBooks(lines) {
  return shippingForBookCount(countPhysicalBooks(lines));
}
