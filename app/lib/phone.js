export function isValidRomanianMobilePhone(phone) {
  return typeof phone === "string" && /^07[0-9]{8}$/.test(phone);
}
