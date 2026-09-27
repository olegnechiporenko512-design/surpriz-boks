export const THEMES = [
  { id: "woman", label: "для жінки" },
  { id: "man", label: "для чоловіка" },
  { id: "child", label: "для дитини" },
] as const;

export type ThemeId = (typeof THEMES)[number]["id"];

export const OFFERS = [
  {
    id: "small",
    name: "Small",
    price: 599,
    oldPrice: 922,
    quantity: 1,
    badge: "Старт",
    hit: false,
    text: "Набір трендових товарів. У кожному 10-му боксі — бездротові навушники, смарт-годинник, планшет або смартфон.",
  },
  {
    id: "medium",
    name: "Medium",
    price: 999,
    oldPrice: 1539,
    quantity: 1,
    badge: "Хіт",
    hit: true,
    text: "Ще більше трендових товарів і гарантована електроніка в кожному боксі.",
  },
  {
    id: "maxi",
    name: "Maxi",
    price: 1499,
    oldPrice: 2306,
    quantity: 1,
    badge: "Більше",
    hit: false,
    text: "Велика кількість трендових товарів, гарантована електроніка, смартфон або ноутбук.",
  },
  {
    id: "ultra",
    name: "Ultra",
    price: 1999,
    oldPrice: 3075,
    quantity: 1,
    badge: "Топ",
    hit: false,
    text: "Найдорожчі позиції: є шанс на техніку Apple, ноутбук або грошовий приз.",
  },
] as const;

export type OfferId = (typeof OFFERS)[number]["id"];
export type Offer = (typeof OFFERS)[number];

export function getOffer(id: string): Offer {
  return OFFERS.find((item) => item.id === id) ?? OFFERS[0];
}

export function variantLabel(offer: Offer, theme: ThemeId | ""): string {
  const base = `${offer.name} Box - ${offer.price} грн`;
  const themeLabel = THEMES.find((item) => item.id === theme)?.label;
  return themeLabel ? `${base} · ${themeLabel}` : base;
}
