const fail = code =>
  Object.assign(new Error(code),{code,status:409});

const text = value =>
  typeof value === "string" ? value.trim() : "";

const normalize = value =>
  text(value).normalize("NFC").toLocaleLowerCase("tr-TR");

const validId = value =>
  typeof value === "number" &&
  Number.isSafeInteger(value) &&
  value > 0;

export function parseKgLocationR411(data,city,district) {
  if (!data ||
      data.StatusCode !== 200 ||
      data.IsSuccessful !== true ||
      data.ExceptionMessage)
    throw fail("KG_LOCATION_RESPONSE_INVALID");

  const row = data.result;

  if (!row ||
      !validId(row.CityId) ||
      !Array.isArray(row.Districts))
    throw fail("KG_LOCATION_RESPONSE_INVALID");

  if (normalize(row.CityName) !== normalize(city))
    throw fail("KG_CITY_MISMATCH");

  const matches = row.Districts.filter(item =>
    item &&
    normalize(item.DistrictName) === normalize(district)
  );

  if (matches.length !== 1)
    throw fail("KG_DISTRICT_NOT_UNIQUE");

  const selected = matches[0];

  if (!validId(selected.DistrictId))
    throw fail("KG_DISTRICT_ID_INVALID");

  return Object.freeze({
    cityId:row.CityId,
    districtId:selected.DistrictId
  });
}

export async function resolveKgReceiverR411(address,provider) {
  if (!address ||
      typeof address !== "object" ||
      Array.isArray(address))
    throw fail("KG_RECEIVER_ADDRESS_INVALID");

  const city = text(address.city);
  const district = text(address.district);

  if (!city || !district ||
      city.length > 80 ||
      district.length > 80)
    throw fail("KG_RECEIVER_LOCATION_NAMES_REQUIRED");

  if (provider?.runtime?.provider !== "KOLAYGELSIN" ||
      typeof provider.getCityDistricts !== "function")
    throw fail("KG_LOCATION_PROVIDER_REQUIRED");

  const response = await provider.getCityDistricts({
    cityName:city,
    districtName:district
  });

  const location = parseKgLocationR411(
    response,city,district
  );

  return Object.freeze({
    ...address,
    ...location
  });
}

export function readKgSenderR411(env=process.env) {
  function field(name) {
    const canonical = text(env["SHIPPING_KG_SENDER_"+name]);
    const legacy = text(env["SHIPPING_SENDER_"+name]);

    if (canonical && legacy && canonical !== legacy)
      throw fail("KG_SENDER_CONFIGURATION_CONFLICT");

    return canonical || legacy;
  }

  const address = field("ADDRESS");
  const phone = field("PHONE");
  const cityId = Number(field("CITY_ID"));
  const districtId = Number(field("DISTRICT_ID"));

  if (!address || address.length > 225 ||
      !phone ||
      !validId(cityId) ||
      !validId(districtId))
    throw fail("KG_SENDER_CONFIGURATION_REQUIRED");

  const digits = phone.replace(/\D/g,"")
    .replace(/^90(?=\d{10}$)/,"")
    .replace(/^0(?=\d{10}$)/,"");

  if (!/^[2-5]\d{9}$/.test(digits))
    throw fail("KG_SENDER_PHONE_INVALID");

  return Object.freeze({
    address,
    phone:digits,
    cityId,
    districtId
  });
}