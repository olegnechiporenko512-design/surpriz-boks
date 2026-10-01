import { createFileRoute } from "@tanstack/react-router";
import { ATTR_FIELDS, type Attribution } from "@/lib/attribution";
import { isValidName, normalizeUaPhone } from "@/lib/phone";
import type { OutboundLead } from "@/lib/lead-forward.server";

function clip(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.replace(/[\u0000-\u001F\u007F]/g, "").trim().slice(0, max);
}

function hostOf(value: string | null): string | null {
  if (!value) return null;
  try {
    return new URL(value).host.toLowerCase();
  } catch {
    return null;
  }
}

function allowedHosts(request: Request): Set<string> {
  const hosts = new Set<string>();
  const add = (value: string | null | undefined) => {
    if (!value) return;
    hosts.add(value.toLowerCase());
  };
  add(request.headers.get("host"));
  add(request.headers.get("x-forwarded-host")?.split(",")[0]?.trim());
  try {
    add(new URL(request.url).host);
  } catch {
    // ignore malformed request url
  }
  for (const raw of (process.env.ALLOWED_ORIGINS ?? "").split(",")) {
    const item = raw.trim();
    if (!item) continue;
    add(hostOf(item) ?? item);
  }
  hosts.add("localhost:8080");
  hosts.add("127.0.0.1:8080");
  hosts.add("surprize-cool.click");
  hosts.add("www.surprize-cool.click");
  return hosts;
}

function originAllowed(request: Request): boolean {
  const site = request.headers.get("sec-fetch-site");
  if (site === "same-origin" || site === "same-site") return true;
  const source = hostOf(request.headers.get("origin")) ?? hostOf(request.headers.get("referer"));
  if (!source) return false;
  return allowedHosts(request).has(source);
}

function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  if (first) return first.slice(0, 64);
  return (request.headers.get("x-real-ip") ?? "").slice(0, 64);
}

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

function makeOrderId(): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Kyiv",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const pick = (type: string) => parts.find((part) => part.type === type)?.value ?? "00";
  const stamp = `${pick("year")}${pick("month")}${pick("day")}${pick("hour")}${pick("minute")}${pick("second")}`;
  const rand = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  return `${stamp}-${rand}`;
}

export const Route = createFileRoute("/api/lead")({
  server: {
    handlers: {
      GET: async () => {
        return json({
          ok: true,
          scriptUrlConfigured: Boolean((process.env.GOOGLE_SCRIPT_URL || process.env.GS_URL)?.trim()),
          capiConfigured: Boolean(process.env.META_CAPI_TOKEN?.trim()),
        });
      },
      POST: async ({ request }) => {
        if (!originAllowed(request)) return json({ success: false, error: "bad_request" }, 400);

        const declared = Number(request.headers.get("content-length") ?? "0");
        if (declared > 8_000) return json({ success: false, error: "bad_request" }, 400);

        let text = "";
        try {
          text = await request.text();
        } catch {
          return json({ success: false, error: "bad_request" }, 400);
        }
        if (text.length > 8_000) return json({ success: false, error: "bad_request" }, 400);

        let body: Record<string, unknown>;
        try {
          const parsed = JSON.parse(text) as unknown;
          if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
            return json({ success: false, error: "bad_request" }, 400);
          }
          body = parsed as Record<string, unknown>;
        } catch {
          return json({ success: false, error: "bad_request" }, 400);
        }

        if (clip(body.website, 200)) return json({ success: true });

        const name = clip(body.name, 80);
        if (!isValidName(name)) return json({ success: false, error: "bad_name" }, 400);

        const phone = normalizeUaPhone(clip(body.phone, 32));
        if (!phone) return json({ success: false, error: "bad_phone" }, 400);

        const quantityRaw = Number(body.quantity);
        if (!Number.isInteger(quantityRaw) || quantityRaw < 1 || quantityRaw > 20) {
          return json({ success: false, error: "bad_request" }, 400);
        }
        const totalRaw = Number(body.total);
        if (!Number.isFinite(totalRaw) || totalRaw < 1 || totalRaw > 100_000) {
          return json({ success: false, error: "bad_request" }, 400);
        }
        const variant = clip(body.variant, 160);
        if (variant.length < 2) return json({ success: false, error: "bad_request" }, 400);

        const attr: Attribution = {
          utm_source: "",
          utm_medium: "",
          utm_campaign: "",
          utm_content: "",
          utm_term: "",
          fbclid: "",
          ttclid: "",
          gclid: "",
        };
        for (const field of ATTR_FIELDS) attr[field] = clip(body[field], 300);

        const order_id = makeOrderId();
        const lead: OutboundLead = {
          order_id,
          name,
          phone,
          quantity: quantityRaw,
          variant,
          total: Math.round(totalRaw),
          page: clip(body.page, 500),
          utm_source: attr.utm_source,
          utm_medium: attr.utm_medium,
          utm_campaign: attr.utm_campaign,
          utm_content: attr.utm_content,
          utm_term: attr.utm_term,
          fbclid: attr.fbclid,
          ttclid: attr.ttclid,
          gclid: attr.gclid,
          fbp: clip(body.fbp, 200),
          fbc: clip(body.fbc, 200),
          ip: clientIp(request),
          ua: clip(request.headers.get("user-agent"), 300),
        };

        try {
          const { enqueueLead } = await import("@/lib/lead-forward.server");
          enqueueLead(lead);
        } catch (error) {
          console.error("[lead] enqueue failed", error instanceof Error ? error.message : "unknown", lead);
        }

        return json({ success: true, order_id });
      },
    },
  },
});
