export function parcelError(code) {
  return Object.assign(new Error(code), { code, status: 409 });
}

function positive(value, maximum, code) {
  if (
    !["number", "string"].includes(typeof value) ||
    String(value).trim() === ""
  ) throw parcelError(code);

  const number = Number(value);

  if (
    !Number.isFinite(number) ||
    number <= 0 ||
    number > maximum ||
    Math.abs(number * 1000 - Math.round(number * 1000)) > 0.000001
  ) throw parcelError(code);

  return number;
}

export function normalizeBookParcelProfile(profile) {
  const bookCount = Number(profile?.bookCount);

  if (!Number.isSafeInteger(bookCount) ||
      bookCount < 1 || bookCount > 10)
    throw parcelError("BOOK_PROFILE_COUNT_INVALID");

  if (Number(profile?.packageCount) !== 1)
    throw parcelError("BOOK_PROFILE_SINGLE_PARCEL_REQUIRED");

  const widthCm = positive(
    profile.widthCm, 1000, "PARCEL_WIDTH_INVALID"
  );
  const lengthCm = positive(
    profile.lengthCm, 1000, "PARCEL_LENGTH_INVALID"
  );
  const heightCm = positive(
    profile.heightCm, 1000, "PARCEL_HEIGHT_INVALID"
  );
  const weightKg = positive(
    profile.weightKg, 1000, "PARCEL_WEIGHT_INVALID"
  );

  return {
    bookCount,
    packageCount: 1,
    widthCm,
    lengthCm,
    heightCm,
    weightKg,
    estimatedDesi:
      Math.round(widthCm * lengthCm * heightCm / 30) / 100
  };
}

export function validateBookParcelProfiles(profiles, complete = true) {
  if (!Array.isArray(profiles) || profiles.length > 10)
    throw parcelError("BOOK_PROFILES_INVALID");

  const normalized = profiles.map(normalizeBookParcelProfile);
  const counts = new Set(normalized.map(p => p.bookCount));

  if (counts.size !== normalized.length)
    throw parcelError("BOOK_PROFILE_DUPLICATE");

  if (complete && counts.size !== 10)
    throw parcelError("BOOK_PROFILES_INCOMPLETE");

  return normalized.sort((a,b) => a.bookCount - b.bookCount);
}

export function countShipmentBooks(items) {
  if (!Array.isArray(items))
    throw parcelError("SHIPMENT_ITEMS_INVALID");

  let total = 0;

  for (const item of items) {
    const quantity = Number(item?.quantity);

    if (!Number.isSafeInteger(quantity) || quantity < 1)
      throw parcelError("BOOK_QUANTITY_INVALID");

    const subtype = String(
      item.r6ProductType ?? item.r6_product_type ?? ""
    ).toUpperCase();

    const type = String(
      item.productType ?? item.product_type ?? ""
    ).toUpperCase();

    if (subtype === "BOOK" || (!subtype && type === "BOOK")) {
      total += quantity;
    } else if (
      ["SOFTWARE","TRAINING_SERVICE","DIGITAL"].includes(subtype) ||
      type === "DIGITAL"
    ) {
      continue;
    } else {
      throw parcelError("NON_BOOK_PHYSICAL_ITEM_REVIEW_REQUIRED");
    }

    if (!Number.isSafeInteger(total) || total > 9990)
      throw parcelError("BOOK_COUNT_LIMIT_EXCEEDED");
  }

  return total;
}

export function buildBookParcelPlan(bookCount, profiles) {
  if (!Number.isSafeInteger(bookCount) ||
      bookCount < 0 || bookCount > 9990)
    throw parcelError("BOOK_COUNT_INVALID");

  if (bookCount === 0) {
    return {
      bookCount: 0,
      packageCount: 0,
      totalWeightKg: 0,
      totalEstimatedDesi: 0,
      parcels: []
    };
  }

  const map = new Map(
    validateBookParcelProfiles(profiles, false)
      .map(profile => [profile.bookCount, profile])
  );

  const parcels = [];
  let remaining = bookCount;

  while (remaining > 0) {
    const size = Math.min(10, remaining);
    const profile = map.get(size);

    if (!profile)
      throw parcelError("BOOK_PARCEL_PROFILE_MISSING");

    parcels.push({
      parcelNo: parcels.length + 1,
      ...profile
    });

    remaining -= size;
  }

  return {
    bookCount,
    packageCount: parcels.length,
    totalWeightKg:
      Math.round(parcels.reduce(
        (sum,p) => sum + p.weightKg, 0
      ) * 1000) / 1000,
    totalEstimatedDesi:
      Math.round(parcels.reduce(
        (sum,p) => sum + p.estimatedDesi, 0
      ) * 100) / 100,
    parcels
  };
}