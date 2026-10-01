import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Banknote, Package, PhoneCall, ShieldCheck, Truck } from "lucide-react";
import { OrderForm } from "@/components/order-form";
import { OFFERS, getOffer, type Offer, type ThemeId } from "@/lib/offers";

const FAQ = [
  {
    q: "Що всередині, якщо бокс закритий?",
    a: "Склад лишається сюрпризом до відкриття. Small — набір трендових речей, і в кожному 10-му є електроніка. Medium і більші бокси містять гарантовану техніку. Тематику (жінка, чоловік, дитина) можна вказати у формі — менеджер передасть її на збірку.",
  },
  {
    q: "Чи треба платити зараз?",
    a: "Ні. Заявка нічого не списує. Оплата тільки при отриманні на Новій пошті. Якщо бокс не забираєте — нічого не платите.",
  },
  {
    q: "Коли передзвонять?",
    a: "Менеджер телефонує в робочий час, зазвичай протягом 15 хвилин, щоб підтвердити розмір, тематику і відділення.",
  },
  {
    q: "Як швидко приїде?",
    a: "Після підтвердження відправляємо Новою поштою. Термін залежить від вашого відділення, зазвичай 1–3 дні.",
  },
  {
    q: "Чому ціна нижча за магазин?",
    a: "Бокс збирається набором, а не по одній позиції з вітрини. Акція −35% діє до опівночі, далі ціна повертається до звичайної.",
  },
];

const REVIEWS = [
  { src: "/media/review-1.webp", alt: "Відгук Марини: я в шоці, це точно мені" },
  { src: "/media/review-2.webp", alt: "Відгук Олени: дякую, класний бокс" },
  { src: "/media/review-3.webp", alt: "Відгук: це прям топ" },
  { src: "/media/review-4.webp", alt: "Відгук: найкращий бокс" },
];

function useCountdown() {
  const [parts, setParts] = useState({ h: "00", m: "00", s: "00" });
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const end = new Date(now);
      end.setHours(24, 0, 0, 0);
      let diff = Math.max(0, end.getTime() - now.getTime());
      const h = Math.floor(diff / 3_600_000);
      diff -= h * 3_600_000;
      const m = Math.floor(diff / 60_000);
      diff -= m * 60_000;
      const s = Math.floor(diff / 1000);
      const pad = (n: number) => String(n).padStart(2, "0");
      setParts({ h: pad(h), m: pad(m), s: pad(s) });
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);
  return parts;
}

function Timer({ parts }: { parts: { h: string; m: string; s: string } }) {
  const cells = [
    [parts.h[0], parts.h[1], "годин"],
    [parts.m[0], parts.m[1], "хвилин"],
    [parts.s[0], parts.s[1], "секунд"],
  ] as const;
  return (
    <div className="timer" aria-label={`До кінця акції ${parts.h} годин ${parts.m} хвилин ${parts.s} секунд`}>
      {cells.map(([a, b, label]) => (
        <div key={label} className="timer-cell">
          <div className="timer-digits">
            <span>{a}</span>
            <span>{b}</span>
          </div>
          <p>{label}</p>
        </div>
      ))}
    </div>
  );
}

function PriceBlock({ offer }: { offer: Offer }) {
  const off = Math.round((1 - offer.price / offer.oldPrice) * 100);
  return (
    <div className="price-block">
      <p className="price-kicker">Звичайна ціна</p>
      <p className="price-old">
        <s>{offer.oldPrice} грн</s>
        <span>−{off}%</span>
      </p>
      <p className="price-now">
        {offer.price} <small>грн</small>
      </p>
      <p className="price-size">
        {offer.name} · 1 бокс до відправки
      </p>
    </div>
  );
}

export function Landing() {
  const parts = useCountdown();
  const [offer, setOffer] = useState<Offer>(OFFERS[0]);
  const [theme, setTheme] = useState<ThemeId | "">("");
  const [playing, setPlaying] = useState(false);
  const [sticky, setSticky] = useState(false);
  const orderedToday = 16 + (new Date().getDate() % 9);

  useEffect(() => {
    const hero = document.getElementById("order");
    if (!hero || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(
      ([entry]) => setSticky(!entry.isIntersecting),
      { threshold: 0.15 },
    );
    observer.observe(hero);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="page">
      <div className="sheet">
        <p className="topbar">Акція −35% до опівночі · оплата при отриманні</p>
        <img className="ribbon" src="/media/ribbon-top.webp" alt="" />

        <header className="hero">
          <p className="eyebrow">Mystery Box</p>
          <h1>Сюрприз бокс</h1>
          <p className="lede">
            Закрита коробка з трендовими товарами. Ціна відома одразу, вміст — ні.
            Збираємо з любов’ю, відкриваєте вдома.
          </p>
        </header>

        <div className="hero-frame">
          <img src="/media/hero.webp" alt="Закритий сюрприз бокс з золотим бантом" />
          <p className="sale-badge">
            акція
            <strong>−35%</strong>
          </p>
        </div>

        <section className="offer-zone" id="order">
          <h2>До кінця акції залишилось</h2>
          <Timer parts={parts} />
          <PriceBlock offer={offer} />
          <p className="social-proof">Сьогодні бокс уже замовили {orderedToday} людей</p>
          <OrderForm
            idPrefix="lead-top"
            offer={offer}
            theme={theme}
            onOffer={setOffer}
            onTheme={setTheme}
          />
          <p className="stock">
            залишилось <strong>7</strong> одиниць зі знижкою
          </p>
        </section>

        <ul className="trust">
          <li>
            <Truck aria-hidden="true" />
            <span>Нова пошта по Україні</span>
          </li>
          <li>
            <Banknote aria-hidden="true" />
            <span>Оплата, коли забираєте</span>
          </li>
          <li>
            <PhoneCall aria-hidden="true" />
            <span>Дзвінок для підтвердження</span>
          </li>
          <li>
            <ShieldCheck aria-hidden="true" />
            <span>Не підійшло — не платите</span>
          </li>
        </ul>

        <img className="ribbon" src="/media/ribbon.webp" alt="" loading="lazy" />

        <section className="story">
          <h2>Твій бокс чекає на тебе</h2>
          <p>
            Наповнення коробочки лишається загадкою. Всередині — комбінація трендових
            товарів, зібраних так, щоб відкриття було в задоволення, а не в розчарування.
          </p>
          <video
            className="unbox"
            src="/media/unbox.mp4"
            autoPlay
            muted
            loop
            playsInline
            aria-label="Розпаковка сюрприз боксу"
          />
          <h2>4 розміри — оберіть свій</h2>
          <ul className="sizes">
            {OFFERS.map((item) => (
              <li key={item.id}>
                <button type="button" onClick={() => setOffer(getOffer(item.id))}>
                  <strong>
                    {item.name}
                    <em>{item.price} грн</em>
                  </strong>
                  <span>{item.text}</span>
                </button>
              </li>
            ))}
          </ul>
          <p>Обирайте тематику: для жінки, чоловіка або дитини — напишемо це в замовлення.</p>
          <img src="/media/themes.webp" alt="Бокси для жінки, чоловіка і дитини" loading="lazy" />
          <p>
            Після заявки лишається тільки дочекатись пакунка і відкрити його. Всі люблять
            сюрпризи — особливо коли чек уже зі знижкою, а платити треба лише на пошті.
          </p>
          <a className="cta cta-link" href="#order">
            Замовити зі знижкою
          </a>
        </section>

        <img className="bleed" src="/media/wide.webp" alt="Сюрприз бокс збоку" loading="lazy" />

        <section className="perks">
          <h2>Чому цей бокс беруть</h2>
          <article>
            <img src="/media/benefit-1.webp" alt="Наповнення боксу" loading="lazy" />
            <p>Трендові речі за ціною, нижчою за окрему покупку кожної.</p>
          </article>
          <article className="flip">
            <img src="/media/benefit-2.webp" alt="Косметика і аксесуари з боксу" loading="lazy" />
            <p>У Medium, Maxi і Ultra найцікавіше наповнення — з гарантованою електронікою.</p>
          </article>
          <article>
            <img src="/media/benefit-3.webp" alt="Навушники, годинник і гаджети" loading="lazy" />
            <p>Ефект несподіванки: дізнаєтесь, що всередині, тільки коли відкриєте.</p>
          </article>
        </section>

        <section className="video-block">
          <h2>30 секунд, як це виглядає</h2>
          {playing ? (
            <iframe
              src="https://www.youtube-nocookie.com/embed/ktafdjRD434?autoplay=1"
              title="Секретний бокс"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          ) : (
            <button type="button" className="video-poster" onClick={() => setPlaying(true)}>
              <img src="/media/hero.webp" alt="" loading="lazy" />
              <span>Дивитись відео</span>
            </button>
          )}
        </section>

        <section className="steps">
          <img className="ribbon" src="/media/ribbon.webp" alt="" loading="lazy" />
          <h2>Як зробити замовлення</h2>
          <ol>
            <li>
              <span>1</span>
              <p>Залишаєте ім’я і телефон — це займає пів хвилини.</p>
            </li>
            <li>
              <span>2</span>
              <p>Менеджер уточнює розмір, тематику і відділення.</p>
            </li>
            <li>
              <span>3</span>
              <p>Нова пошта привозить закритий бокс.</p>
            </li>
            <li>
              <span>4</span>
              <p>Платите при отриманні. Не забираєте — не платите.</p>
            </li>
          </ol>
        </section>

        <section className="reviews">
          <h2>Відгуки покупців</h2>
          <div className="review-row">
            {REVIEWS.map((item) => (
              <img key={item.src} src={item.src} alt={item.alt} loading="lazy" />
            ))}
          </div>
        </section>

        <section className="faq">
          <h2>Питання перед замовленням</h2>
          {FAQ.map((item) => (
            <details key={item.q}>
              <summary>{item.q}</summary>
              <p>{item.a}</p>
            </details>
          ))}
        </section>

        <img className="ribbon" src="/media/ribbon.webp" alt="" loading="lazy" />

        <section className="offer-zone finale" id="order-bottom">
          <h2>Замовляйте прямо зараз</h2>
          <p className="lede center">Сюрприз бокс · акція −35%</p>
          <Timer parts={parts} />
          <PriceBlock offer={offer} />
          <OrderForm
            idPrefix="lead-bottom"
            offer={offer}
            theme={theme}
            onOffer={setOffer}
            onTheme={setTheme}
          />
          <p className="stock">
            залишилось <strong>7</strong> одиниць зі знижкою
          </p>
        </section>

        <footer className="foot">
          <img className="ribbon" src="/media/ribbon.webp" alt="" loading="lazy" />
          <p>Оплата при отриманні. Передплата не потрібна.</p>
          <nav className="foot-links" aria-label="Документи">
            <Link to="/delivery">Оплата та доставка</Link>
            <Link to="/privacy">Політика конфіденційності</Link>
            <Link to="/offer">Публічна оферта</Link>
            <Link to="/returns">Повернення товару</Link>
            <Link to="/cookies">Файли cookie</Link>
          </nav>
          <p className="fine">
            <Package aria-hidden="true" />1 бокс = 1 одиниця у відправленні
          </p>
        </footer>
      </div>

      <a className={`sticky${sticky ? " is-on" : ""}`} href="#order">
        <span>
          {offer.name} · {offer.price} грн
        </span>
        <strong>Замовити</strong>
      </a>
    </div>
  );
}
