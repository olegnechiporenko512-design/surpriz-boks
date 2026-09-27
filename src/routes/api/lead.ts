import { createFileRoute } from "@tanstack/react-router";
import { ATTR_FIELDS, type Attribution } from "@/lib/attribution";
import { isValidName, normalizeUaPhone } from "@/lib/phone";

const hits = new Map<string, number[]>();

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

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((stamp) => now - stamp < 10 * 60 * 1000);
  if (recent.length >= 8) {
    hits.set(ip, recent);
    return true;
  }
  recent.push(now);
  hits.set(ip, recent);
  return false;
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

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export const Route = createFileRoute("/api/lead")({
  server: {
    handlers: {
      GET: async () => {
        return json({ ok: true, scriptUrlConfigured: Boolean(scriptUrl()) });
      },
      POST: async ({ request }) => {
        if (!originAllowed(request)) return json({ success: false, error: "upstream_failed" });

        const ip = clientIp(request) || "unknown";
        if (rateLimited(ip)) return json({ success: false, error: "upstream_failed" });

        const declared = Number(request.headers.get("content-length") ?? "0");
        if (declared > 8_000) return json({ success: false, error: "upstream_failed" });

        let text = "";
        try {
          text = await request.text();
        } catch {
          return json({ success: false, error: "bad_name" }, 400);
        }
        if (text.length > 8_000) return json({ success: false, error: "upstream_failed" });

        let body: Record<string, unknown>;
        try {
          const parsed = JSON.parse(text) as unknown;
          if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
            return json({ success: false, error: "bad_name" }, 400);
          }
          body = parsed as Record<string, unknown>;
        } catch {
          return json({ success: false, error: "bad_name" }, 400);
        }

        if (clip(body.website, 200)) return json({ success: true });

        const name = clip(body.name, 80);
        if (!isValidName(name)) return json({ success: false, error: "bad_name" }, 400);

        const phone = normalizeUaPhone(clip(body.phone, 32));
        if (!phone) return json({ success: false, error: "bad_phone" }, 400);

        const quantityRaw = Number(body.quantity);
        const quantity = Number.isInteger(quantityRaw) ? Math.min(Math.max(quantityRaw, 1), 20) : 1;
        const totalRaw = Number(body.total);
        const total = Number.isFinite(totalRaw) ? Math.round(totalRaw) : 0;

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

        const payload = {
          name,
          phone,
          quantity,
          variant: clip(body.variant, 160),
          total,
          page: clip(body.page, 300),
          utm_source: attr.utm_source,
          utm_medium: attr.utm_medium,
          utm_campaign: attr.utm_campaign,
          utm_content: attr.utm_content,
          utm_term: attr.utm_term,
          fbclid: attr.fbclid,
          ttclid: attr.ttclid,
          gclid: attr.gclid,
          ip,
          ua: clip(request.headers.get("user-agent"), 300),
        };

        const upstream = scriptUrl();
        if (!upstream) {
          if (process.env.VERCEL) return json({ success: false, error: "upstream_failed" });
          return json({ success: true });
        }

        try {
          const upstreamResult = await readUpstream(upstream, JSON.stringify(payload));
          if (!isUpstreamSuccess(upstreamResult.status, upstreamResult.raw)) {
            console.error(
              "[lead] upstream failed",
              upstreamResult.status,
              upstreamResult.raw.slice(0, 180).replace(/\d{6,}/g, "…"),
            );
            return json({ success: false, error: "upstream_failed" });
          }
          return json({ success: true });
        } catch (error) {
          console.error("[lead] upstream error", error instanceof Error ? error.name : "unknown");
          return json({ success: false, error: "upstream_failed" });
        }
      },
    },
  },
});
