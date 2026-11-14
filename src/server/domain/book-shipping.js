// All prices are VAT-inclusive Turkish kurus.
// Prefer the Owner catalog subtype BOOK over the broad PHYSICAL type.

export function countPhysicalBooks(lines) {
  if (!Array.isArray(lines)) throw new TypeError("SHIPPING_LINES_INVALID");
  return lines.reduce((sum, item) => {
    const quantity = Number(item?.quantity ?? 1);
    if (!Number.isSafeInteger(quantity) || quantity < 1)
      throw new RangeError("BOOK_QUANTITY_INVALID");

    const physical = String(item?.productType || "").toUpperCase() === "PHYSICAL";
    const subtype = String(item?.r6ProductType || "").toUpperCase();

    if (physical && subtype && subtype !== "BOOK")
      throw new Error("UNSUPPORTED_PHYSICAL_SHIPPING_TYPE");

    // Legacy catalogs may lack r6ProductType entirely.
    const book = subtype === "BOOK" ||
      (physical && !subtype);

    const next = sum + (book ? quantity : 0);
    if (!Number.isSafeInteger(next))
      throw new RangeError("BOOK_QUANTITY_OVERFLOW");
    return next;
  }, 0);
}

export function shippingForBookCount(bookCount) {
  if (!Number.isSafeInteger(bookCount) || bookCount < 0)
    throw new RangeError("BOOK_COUNT_INVALID");
  return bookCount === 1 ? 10000 : bookCount === 2 ? 15000 : 0;
}

export function shippingForPhysicalBooks(lines) {
  return shippingForBookCount(countPhysicalBooks(lines));
}

export function shippingForStudentCartItems(items) {
  if (!Array.isArray(items))
    throw new TypeError("SHIPPING_CART_INVALID");

  let standaloneBooks = 0;
  let familyShippingMinor = 0;

  for (const item of items) {
    if (item?.kind === "FAMILY_OFFER") {
      const amount = Number(item.shippingMinor ?? 0);
      if (!Number.isSafeInteger(amount) || amount < 0)
        throw new RangeError("FAMILY_SHIPPING_INVALID");
      familyShippingMinor += amount;
      continue;
    }

    const parts = item?.components || [];
    const books = countPhysicalBooks(parts);

    const bundled = parts.some((part) => {
      const type = String(part?.productType || "").toUpperCase();
      const subtype = String(part?.r6ProductType || "").toUpperCase();
      return type === "DIGITAL" ||
        subtype === "SOFTWARE" ||
        subtype === "TRAINING_SERVICE";
    }) || (item?.entitlementDefinitions || []).some((definition) =>
      ["TRAINER_LED", "HYBRID"].includes(
        String(definition?.deliveryMode || "").toUpperCase()
      )
    );

    // Books inside education/software bundles ship free.
    // Only books in standalone book items enter the tariff.
    if (!bundled) standaloneBooks += books;
  }

  if (!Number.isSafeInteger(standaloneBooks))
    throw new RangeError("BOOK_QUANTITY_OVERFLOW");

  return shippingForBookCount(standaloneBooks) + familyShippingMinor;
}