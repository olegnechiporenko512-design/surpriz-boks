import "@tanstack/react-start/server-only";
import { waitUntil } from "@vercel/functions";

const PIXEL_ID = "3557729764386334";

export type OutboundLead = {
  order_id: string;
  name: string;
  phone: string;
  quantity: number;
  variant: string;
  total: number;
  page: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_content: string;
  utm_term: string;
  fbclid: string;
  ttclid: string;
  gclid: string;
  fbp: string;
  fbc: string;
  ip: string;
  ua: string;
};

let capiWarned = false;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function scriptUrl(): string | null {
  const raw = (process.env.GOOGLE_SCRIPT_URL || process.env.GS_URL)?.trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol === "https:") return raw;
    if (url.protocol === "http:" && (url.hostname === "localhost" || url.hostname === "127.0.0.1")) {
      return raw;
    }
    return null;
  } catch {
    return null;
  }
}

function extractJson(raw: string): string {
  const text = raw.replace(/^\uFEFF/, "").trim();
  if (text.startsWith("{") || text.startsWith("[")) return text;
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0 && end > start) return text.slice(start, end + 1);
  return text;
}

function isExplicitFailure(raw: string): boolean {
  try {
    const parsed = JSON.parse(extractJson(raw)) as {
      ok?: boolean;
      success?: boolean;
      status?: string;
      result?: string;
    };
    if (parsed.ok === false || parsed.success === false) return true;
    const state = String(parsed.status || parsed.result || "").toLowerCase();
    return state === "error" || state === "fail" || state === "failed";
  } catch {
    return false;
  }
}

function isUpstreamSuccess(status: number, raw: string): boolean {
  if (status < 200 || status >= 300) return false;
  const text = raw.replace(/^\uFEFF/, "").trim();
  if (!text) return false;
  if (isExplicitFailure(text)) return false;
  try {
    const parsed = JSON.parse(extractJson(text)) as {
      ok?: boolean;
      success?: boolean;
      status?: string;
      result?: string;
    };
    if (parsed.ok === true || parsed.success === true) return true;
    const state = String(parsed.status || parsed.result || "").toLowerCase();
    if (state === "ok" || state === "success") return true;
  } catch {
    // not JSON
  }
  return /^OK\b/i.test(text) || /"status"\s*:\s*"ok"/i.test(text);
}

function isScriptEcho(location: string, base: string): boolean {
  try {
    return new URL(location, base).hostname.endsWith("googleusercontent.com");
  } catch {
    return false;
  }
}

async function readUpstream(upstream: string, body: string): Promise<{ status: number; raw: string }> {
  const first = await fetch(upstream, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json,text/plain,*/*",
    },
    body,
    redirect: "manual",
    signal: AbortSignal.timeout(20_000),
  });

  const location = first.headers.get("location");
  if (location && isScriptEcho(location, upstream)) {
    const second = await fetch(new URL(location, upstream), {
      method: "GET",
      redirect: "follow",
      signal: AbortSignal.timeout(20_000),
    });
    const raw = await second.text();
    if (isUpstreamSuccess(second.status, raw) || isExplicitFailure(raw)) {
      return { status: second.status, raw };
    }
    return { status: 200, raw: '{"ok":true,"success":true}' };
  }

  if (first.status === 0 || (first.status >= 300 && first.status < 400)) {
    return { status: 200, raw: '{"ok":true,"success":true}' };
  }

  return { status: first.status, raw: await first.text() };
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function pageUrl(value: string): string | undefined {
  try {
    const url = new URL(value);
    if (url.protocol === "https:" || url.protocol === "http:") return url.toString();
  } catch {
    // ignore
  }
  return undefined;
}

function safeText(text: string): string {
  return text.replace(/access_token=[^&\s"]+/gi, "access_token=***").slice(0, 400);
}

async function forwardToScript(lead: OutboundLead): Promise<void> {
  const upstream = scriptUrl();
  if (!upstream) {
    console.error("[lead] GOOGLE_SCRIPT_URL missing", lead);
    return;
  }
  const body = JSON.stringify(lead);
  let last = "";
  for (let attempt = 0; attempt < 3; attempt += 1) {
    if (attempt > 0) await sleep(2000);
    try {
      const result = await readUpstream(upstream, body);
      if (isUpstreamSuccess(result.status, result.raw)) return;
      last = `${result.status} ${safeText(result.raw)}`;
    } catch (error) {
      last = error instanceof Error ? error.name : "error";
    }
  }
  console.error("[lead] apps script failed", last, lead);
}

async function sendCapi(lead: OutboundLead): Promise<void> {
  const token = process.env.META_CAPI_TOKEN?.trim();
  if (!token) {
    if (!capiWarned) {
      capiWarned = true;
      console.error("[lead] META_CAPI_TOKEN is not set");
    }
    return;
  }
  const fbc = lead.fbc || (lead.fbclid ? `fb.1.${Date.now()}.${lead.fbclid}` : "");
  const userData: Record<string, unknown> = {
    ph: [await sha256(lead.phone)],
    fn: [await sha256(lead.name.trim().toLowerCase())],
  };
  if (lead.ip) userData.client_ip_address = lead.ip;
  if (lead.ua) userData.client_user_agent = lead.ua;
  if (lead.fbp) userData.fbp = lead.fbp;
  if (fbc) userData.fbc = fbc;

  const eventTime = Math.floor(Date.now() / 1000);
  const source = pageUrl(lead.page);
  const customData = {
    value: lead.total,
    currency: "UAH",
    content_name: lead.variant,
  };
  const event = (eventName: "Lead" | "Purchase") => ({
    event_name: eventName,
    event_time: eventTime,
    event_id: lead.order_id,
    action_source: "website",
    ...(source ? { event_source_url: source } : {}),
    user_data: userData,
    custom_data: customData,
  });
  const body: Record<string, unknown> = {
    data: [event("Lead"), event("Purchase")],
  };
  const testCode = process.env.META_TEST_EVENT_CODE?.trim();
  if (testCode) body.test_event_code = testCode;

  try {
    const response = await fetch(
      `https://graph.facebook.com/v21.0/${PIXEL_ID}/events?access_token=${encodeURIComponent(token)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(15_000),
      },
    );
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      console.error("[lead] capi failed", response.status, safeText(text));
    }
  } catch (error) {
    console.error("[lead] capi error", error instanceof Error ? error.name : "unknown");
  }
}

async function run(lead: OutboundLead): Promise<void> {
  await Promise.all([forwardToScript(lead), sendCapi(lead)]);
}

export function enqueueLead(lead: OutboundLead): void {
  const job = run(lead).catch((error) => {
    console.error("[lead] background", error instanceof Error ? error.message : "unknown");
  });
  try {
    waitUntil(job);
  } catch (error) {
    console.error("[lead] waitUntil", error instanceof Error ? error.message : "unknown");
  }
}
