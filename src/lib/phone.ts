import { parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js";

export function normalizeE164(input: string, defaultCountry: CountryCode = "BR"): string | null {
  const trimmed = input.replace(/\s+/g, " ").trim();
  if (!trimmed) return null;
  const parsed = parsePhoneNumberFromString(trimmed, defaultCountry);
  if (!parsed?.isValid()) return null;
  return parsed.number;
}
