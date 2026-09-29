import { parsePhoneNumberFromString } from "libphonenumber-js/max";

export function parseProfilePhone(value, country = "RO") {
  if (typeof value !== "string" || !value.trim()) return null;
  // Accept a pasted international dialling prefix without inventing country rules.
  const input = value.trim().replace(/^00/, "+");
  if (!/^[+\d\s().-]+$/.test(input)) return null;
  try {
    const phone = parsePhoneNumberFromString(input, { defaultCountry: country, extract: false });
    return phone?.country && phone.isValid() && !phone.ext ? phone : null;
  } catch {
    return null;
  }
}

export function normalizeProfilePhone(value, country = "RO") {
  return parseProfilePhone(value, country)?.number || null;
}

export function profilePhoneDisplay(value, country = "RO") {
  const phone = parseProfilePhone(value, country);
  return phone ? {
    country: phone.country || country,
    national: phone.formatInternational().slice(phone.countryCallingCode.length + 2),
  } : { country, national: value || "" };
}

export function isValidRomanianMobilePhone(phone) {
  // Existing listing callers keep accepting legacy Romanian mobiles while
  // recognizing the international E.164 values now saved by the profile page.
  return typeof phone === "string" && (
    /^07[0-9]{8}$/.test(phone) ||
    (/^\+[1-9]\d{1,14}$/.test(phone) && Boolean(parseProfilePhone(phone)))
  );
}
