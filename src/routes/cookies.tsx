import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal-page";

export const Route = createFileRoute("/cookies")({
  head: () => ({ meta: [{ title: "Файли cookie — Сюрприз бокс" }] }),
  component: Cookies,
});

function Cookies() {
  return (
    <LegalPage title="Файли cookie">
      <p>
        Сторінка зберігає мітки реклами (utm, fbclid, ttclid, gclid) у sessionStorage браузера,
        щоб передати їх разом із заявкою. Вони живуть, поки відкрита вкладка.
      </p>
      <p>
        Рекламні пікселі Meta і TikTok можуть ставити власні cookie, щоб рахувати перегляди і
        підтверджені заявки. Подія покупки відправляється лише після успішної заявки, на сторінці
        подяки.
      </p>
    </LegalPage>
  );
}
