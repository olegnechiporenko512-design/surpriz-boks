export function isValidName(name: string): boolean {
  return name.trim().length >= 2;
}

/** Повертає 380XXXXXXXXX або null. Будь-які 9 цифр після 380, без білого списку операторів. */
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
  return digits;
}

function nationalDigits(input: string): string {
  const trimmed = input.trim();
  let digits = trimmed.replace(/\D/g, "");
  if (trimmed.startsWith("+")) {
    if (digits.startsWith("380")) digits = digits.slice(3);
    return digits.slice(0, 9);
  }
  if (digits.startsWith("380") && digits.length > 9) return digits.slice(3, 12);
  if (digits.startsWith("80") && digits.length > 9) return digits.slice(2, 11);
  if (digits.startsWith("0")) return digits.slice(1, 10);
  return digits.slice(0, 9);
}

/** 067…, 67…, 380…, +380…, 80… → +380 67 123 45 67 */
export function formatUaPhone(input: string): string {
  const national = nationalDigits(input);
  if (!national) {
    if (input.trim() === "") return "";
    if (input === "+380" || input === "+38" || input === "+3" || input === "+" || input === "+380 ") {
      return "";
    }
    return "+380 ";
  }
  let out = "+380 " + national.slice(0, 2);
  if (national.length > 2) out += " " + national.slice(2, 5);
  if (national.length > 5) out += " " + national.slice(5, 7);
  if (national.length > 7) out += " " + national.slice(7, 9);
  return out;
}
