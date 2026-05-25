// Brazilian phone helpers shared by every customer-facing identify/restore form.
// Entry is the national format (DDD + number); the server prepends +55 on
// normalize. Plausibility stays lenient (10–13 digits) so a pasted country code
// still validates; the mask formats the national portion as the user types.

const PHONE_DIGITS_RE = /^\d{10,13}$/

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, "")
}

export function isPlausibleBrazilianPhone(value: string): boolean {
  return PHONE_DIGITS_RE.test(digitsOnly(value))
}

// Live mask → "(DD) NNNNN-NNNN" (mobile) / "(DD) NNNN-NNNN" (landline). Caps at
// 11 national digits so an extra keystroke can't overflow the format.
export function formatBrazilianPhone(value: string): string {
  const digits = digitsOnly(value).slice(0, 11)
  if (digits.length === 0) return ""
  if (digits.length <= 2) return `(${digits}`
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
}
