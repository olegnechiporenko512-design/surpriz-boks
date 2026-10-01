import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal-page";

export const Route = createFileRoute("/delivery")({
  head: () => ({ meta: [{ title: "Оплата та доставка — Сюрприз бокс" }] }),
  component: Delivery,
});

function Delivery() {
  return (
    <LegalPage title="Оплата та доставка">
      <p>Оплата — при отриманні у відділенні або поштоматі Нової Пошти. Передоплати немає.</p>
      <p>Після заявки менеджер телефонує, уточнює місто, відділення і розмір боксу.</p>
      <p>Відправка по Україні. Термін у дорозі зазвичай 1–3 дні, залежить від відділення.</p>
      <p>
        Small — 599 грн, Medium — 999 грн, Maxi — 1499 грн, Ultra — 1999 грн. Сума вказана на
        сторінці замовлення.
      </p>
    </LegalPage>
  );
}
