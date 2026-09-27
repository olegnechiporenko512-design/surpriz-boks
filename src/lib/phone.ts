const OPERATORS = new Set([
  "39",
  "50",
  "63",
  "66",
  "67",
  "68",
  "73",
  "75",
  "77",
  "91",
  "92",
  "93",
  "94",
  "95",
  "96",
  "97",
  "98",
  "99",
]);

export function isValidName(name: string): boolean {
  return name.trim().length >= 2;
}

/** Повертає 380XXXXXXXXX або null. */
export function normalizeUaPhone(input: string): string | null {
  let digits = input.replace(/\D/g, "");
  if (digits.startsWith("380") && digits.length === 12) {
    // already canonical
  } else if (digits.startsWith("80") && digits.length === 11) {
    digits = `3${digits}`;
  } else if (digits.startsWith("0") && digits.length === 10) {
    digits = `38${digits}`;
  } else if (digits.length === 9) {
    digits = `380${digits}`;
  } else {
    return null;
  }
  if (!/^380\d{9}$/.test(digits)) return null;
  if (!OPERATORS.has(digits.slice(3, 5))) return null;
  return digits;
}

export function formatUaPhone(input: string): string {
  let digits = input.replace(/\D/g, "");
  if (digits.startsWith("380")) digits = digits.slice(3);
  else if (digits.startsWith("80")) digits = digits.slice(2);
  else if (digits.startsWith("0")) digits = digits.slice(1);
  digits = digits.slice(0, 9);
  if (!digits) return "";
  let out = "+380 " + digits.slice(0, 2);
  if (digits.length > 2) out += " " + digits.slice(2, 5);
  if (digits.length > 5) out += " " + digits.slice(5, 7);
  if (digits.length > 7) out += " " + digits.slice(7, 9);
  return out;
}
