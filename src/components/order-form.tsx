import { useId, useRef, useState, type FormEvent } from "react";
import { OFFERS, THEMES, variantLabel, type Offer, type ThemeId } from "@/lib/offers";
import { readAttribution } from "@/lib/attribution";
import { formatUaPhone, isValidName, normalizeUaPhone } from "@/lib/phone";

const SEND_ERROR = "Не вдалося відправити, спробуйте ще раз";
const PRODUCT_NAME = "Сюрприз бокс";

type LeadResponse = {
  success?: boolean;
  order_id?: string;
};

function readCookie(name: string): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  if (!match?.[1]) return "";
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

export function OrderForm({
  offer,
  theme,
  onOffer,
  onTheme,
  idPrefix,
}: {
  offer: Offer;
  theme: ThemeId | "";
  onOffer: (offer: Offer) => void;
  onTheme: (theme: ThemeId | "") => void;
  idPrefix: string;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const nameRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const nameId = useId();
  const phoneId = useId();
  const siteId = useId();

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const cleanName = name.trim().replace(/\s+/g, " ");
    if (!isValidName(cleanName)) {
      setError("Вкажіть ім’я — щонайменше 2 символи.");
      nameRef.current?.focus();
      return;
    }
    const canonical = normalizeUaPhone(phone);
    if (!canonical) {
      setError("Вкажіть повний номер: після +380 має бути 9 цифр.");
      phoneRef.current?.focus();
      return;
    }
    setError("");
    setPending(true);
    const attr = readAttribution();
    const variant = variantLabel(offer, theme);
    const payload = {
      name: cleanName,
      phone: canonical,
      quantity: offer.quantity,
      variant,
      total: offer.price,
      page: window.location.href,
      website,
      utm_source: attr.utm_source,
      utm_medium: attr.utm_medium,
      utm_campaign: attr.utm_campaign,
      utm_content: attr.utm_content,
      utm_term: attr.utm_term,
      fbclid: attr.fbclid,
      ttclid: attr.ttclid,
      gclid: attr.gclid,
      fbp: readCookie("_fbp"),
      fbc: readCookie("_fbc"),
    };
    try {
      const response = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json().catch(() => ({}))) as LeadResponse;
      if (data.success === true) {
        if (typeof data.order_id === "string" && data.order_id) {
          try {
            sessionStorage.setItem(
              "lead_order",
              JSON.stringify({
                order_id: data.order_id,
                name: cleanName,
                phone: canonical,
                variant,
                quantity: offer.quantity,
                total: offer.price,
                product: PRODUCT_NAME,
              }),
            );
          } catch {
            // sessionStorage може бути недоступний
          }
        }
        window.location.assign("/dyakuiemo");
        return;
      }
      setError(SEND_ERROR);
      setPending(false);
    } catch {
      setError(SEND_ERROR);
      setPending(false);
    }
  }

  return (
    <form className="order-form" id={idPrefix} onSubmit={onSubmit} noValidate>
      <fieldset>
        <legend>Розмір боксу</legend>
        <div className="offer-grid" role="radiogroup" aria-label="Розмір боксу">
          {OFFERS.map((item) => {
            const active = item.id === offer.id;
            return (
              <button
                key={item.id}
                type="button"
                role="radio"
                aria-checked={active}
                className={`offer-card${active ? " is-on" : ""}${item.hit ? " is-hit" : ""}`}
                onClick={() => onOffer(item)}
              >
                <span className="offer-badge">{item.badge}</span>
                <span className="offer-name">{item.name}</span>
                <span className="offer-price">{item.price} грн</span>
                <span className="offer-old">{item.oldPrice} грн</span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset>
        <legend>Тематика — за бажанням</legend>
        <div className="theme-row" role="radiogroup" aria-label="Тематика боксу">
          {THEMES.map((item) => {
            const active = theme === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="radio"
                aria-checked={active}
                className={`theme-chip${active ? " is-on" : ""}`}
                onClick={() => onTheme(active ? "" : item.id)}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </fieldset>

      <label className="field" htmlFor={nameId}>
        <span>Ім’я</span>
        <input
          ref={nameRef}
          id={nameId}
          name="name"
          autoComplete="name"
          placeholder="Як до вас звертатись"
          maxLength={80}
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            setError("");
          }}
          required
        />
      </label>
      <label className="field" htmlFor={phoneId}>
        <span>Телефон</span>
        <input
          ref={phoneRef}
          id={phoneId}
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="+380 67 123 45 67"
          maxLength={22}
          value={phone}
          onChange={(event) => {
            setPhone(formatUaPhone(event.target.value));
            setError("");
          }}
          required
        />
      </label>
      <div className="hp" aria-hidden="true">
        <label htmlFor={siteId}>Website</label>
        <input
          id={siteId}
          name="website"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(event) => setWebsite(event.target.value)}
        />
      </div>
      <button className="cta" type="submit" disabled={pending}>
        {pending ? "Надсилаємо…" : "Замовити зі знижкою"}
      </button>
      <p className="cta-note">Передплати 0 грн · дзвінок менеджера · оплата на пошті</p>
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
