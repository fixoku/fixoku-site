import {
  normalizeBookParcelProfile,
  parcelError
} from "./book-parcel-profiles-r408.js";

export function buildKgMeasurementPayload(referenceNo, plan) {
  if (
    typeof referenceNo !== "string" ||
    !/^[A-Za-z0-9._-]{1,50}$/.test(referenceNo)
  ) throw parcelError("KG_MEASUREMENT_REFERENCE_INVALID");

  if (
    !plan ||
    !Number.isSafeInteger(plan.bookCount) ||
    plan.bookCount < 1 ||
    !Number.isSafeInteger(plan.packageCount) ||
    plan.packageCount < 1 ||
    plan.packageCount > 999 ||
    !Array.isArray(plan.parcels) ||
    plan.parcels.length !== plan.packageCount
  ) throw parcelError("KG_MEASUREMENT_PLAN_INVALID");

  const groups = new Map();
  let totalBooks = 0;

  for (const [index,raw] of plan.parcels.entries()) {
    if (raw.parcelNo !== index+1)
      throw parcelError("KG_PARCEL_SEQUENCE_INVALID");

    const parcel = normalizeBookParcelProfile(raw);

    totalBooks += parcel.bookCount;

    const Width = Math.ceil(parcel.widthCm);
    const Length = Math.ceil(parcel.lengthCm);
    const Height = Math.ceil(parcel.heightCm);

    const Deci =
      Math.round(Width * Length * Height / 30) / 100;

    const measurement = {
      quantity:1,
      Width,
      Length,
      Height,
      Deci,
      weight:parcel.weightKg
    };

    const key = JSON.stringify([
      Width,Length,Height,Deci,parcel.weightKg
    ]);

    if (groups.has(key)) {
      groups.get(key).quantity++;
    } else {
      groups.set(key,measurement);
    }
  }

  if (totalBooks !== plan.bookCount)
    throw parcelError("KG_MEASUREMENT_BOOK_COUNT_MISMATCH");

  const measurements = [...groups.values()];

  if (measurements.reduce((n,p)=>n+p.quantity,0) !==
      plan.packageCount)
    throw parcelError("KG_MEASUREMENT_PACKAGE_COUNT_MISMATCH");

  return {
    customerReferenceNo:referenceNo,
    measurements
  };
}

export function assertKgMeasurementSuccess(response) {
  if (!response || typeof response !== "object" ||
      Array.isArray(response) ||
      response.IsSuccess !== true)
    throw parcelError("KG_MEASUREMENT_NOT_CONFIRMED");

  return true;
}