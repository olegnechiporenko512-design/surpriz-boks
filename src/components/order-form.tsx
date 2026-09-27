import { useId, useRef, useState, type FormEvent } from "react";
import { OFFERS, THEMES, variantLabel, type Offer, type ThemeId } from "@/lib/offers";
import { readAttribution } from "@/lib/attribution";
import { formatUaPhone, isValidName, normalizeUaPhone } from "@/lib/phone";

type LeadResponse = {
  success?: boolean;
  error?: string;
};

export type DoneOrder = {
  name: string;
  variant: string;
  total: number;
  quantity: number;
};

function messageFor(code: string | undefined): string {
  if (code === "bad_name") return "Перевірте ім’я — щонайменше 2 символи.";
  if (code === "bad_phone") return "Перевірте номер: потрібен український мобільний, наприклад 067 123 45 67.";
  return "Не вдалося надіслати замовлення. Спробуйте ще раз за хвилину.";
}

function trackPixels(total: number, variant: string, phone: string) {
  const win = window as Window & {
    ttq?: {
      identify?: (payload: Record<string, string>) => void;
      track: (event: string, payload?: Record<string, unknown>) => void;
    };
    fbq?: (...args: unknown[]) => void;
  };
  const canonical = normalizeUaPhone(phone);
  try {
    if (canonical) win.ttq?.identify?.({ phone_number: `+${canonical}` });
  } catch {
    // піксель не має ламати форму
  }
  try {
    win.ttq?.track("SubmitForm", { value: total, currency: "UAH" });
  } catch {
    // піксель не має ламати форму
  }
  try {
    win.fbq?.("track", "Lead", {
      value: total,
      currency: "UAH",
      content_name: variant,
    });
  } catch {
    // піксель не має ламати форму
  }
}

export function OrderForm({
  offer,
  theme,
  onOffer,
  onTheme,
  done,
  onDone,
  idPrefix,
}: {
  offer: Offer;
  theme: ThemeId | "";
  onOffer: (offer: Offer) => void;
  onTheme: (theme: ThemeId | "") => void;
  done: DoneOrder | null;
  onDone: (order: DoneOrder) => void;
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
    if (pending || done) return;
    const cleanName = name.trim().replace(/\s+/g, " ");
    if (!isValidName(cleanName)) {
      setError(messageFor("bad_name"));
      nameRef.current?.focus();
      return;
    }
    if (!normalizeUaPhone(phone)) {
      setError(messageFor("bad_phone"));
      phoneRef.current?.focus();
      return;
    }
    setError("");
    setPending(true);
    const attr = readAttribution();
    const variant = variantLabel(offer, theme);
    const payload = {
      name: cleanName,
      phone,
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
    };
    try {
      const response = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json().catch(() => ({}))) as LeadResponse;
      if (data.success === true) {
        trackPixels(offer.price, variant, phone);
        onDone({
          name: cleanName,
          variant,
          total: offer.price,
          quantity: offer.quantity,
        });
        return;
      }
      setError(messageFor(data.error));
    } catch {
      setError(messageFor(undefined));
    } finally {
      setPending(false);
    }
  }

  if (done) {
    return (
      <div className="thanks" role="status">
        <p className="thanks-kicker">Заявку прийнято</p>
        <h2>Дякуємо, {done.name.split(" ")[0]}!</h2>
        <p>
          Менеджер передзвонить, щоб уточнити відділення Нової пошти. Оплата — тільки коли
          заберете бокс. Якщо не підійде, просто не оплачуєте.
        </p>
        <dl>
          <div>
            <dt>Бокс</dt>
            <dd>{done.variant}</dd>
          </div>
          <div>
            <dt>До відправки</dt>
            <dd>{done.quantity} шт.</dd>
          </div>
          <div>
            <dt>Сума</dt>
            <dd>{done.total} грн</dd>
          </div>
        </dl>
      </div>
    );
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
          placeholder="067 123 45 67"
          maxLength={20}
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
