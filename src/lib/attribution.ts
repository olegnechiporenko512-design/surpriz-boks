const STORAGE_KEY = "lead_tracking";

export const ATTR_FIELDS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "fbclid",
  "ttclid",
  "gclid",
] as const;

export type AttrField = (typeof ATTR_FIELDS)[number];
export type Attribution = Record<AttrField, string>;

function emptyAttribution(): Attribution {
  return {
    utm_source: "",
    utm_medium: "",
    utm_campaign: "",
    utm_content: "",
    utm_term: "",
    fbclid: "",
    ttclid: "",
    gclid: "",
  };
}

function clip(value: string, max: number): string {
  return value.replace(/[\u0000-\u001F\u007F]/g, "").trim().slice(0, max);
}

/** Перше завантаження: знімаємо мітки з URL і тримаємо їх до кінця сесії. */
export function captureAttribution(): void {
  if (typeof window === "undefined") return;
  try {
    const existing = sessionStorage.getItem(STORAGE_KEY);
    if (existing) return;
  } catch {
    // sessionStorage може бути недоступний
  }
  const params = new URLSearchParams(window.location.search);
  const out = emptyAttribution();
  for (const field of ATTR_FIELDS) {
    out[field] = clip(params.get(field) ?? "", 300);
  }
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(out));
  } catch {
    // ignore
  }
}

export function readAttribution(): Attribution {
  const result = emptyAttribution();
  if (typeof window === "undefined") return result;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return result;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return result;
    for (const field of ATTR_FIELDS) {
      const value = (parsed as Record<string, unknown>)[field];
      if (typeof value === "string") result[field] = clip(value, 300);
    }
    return result;
  } catch {
    return result;
  }
}
