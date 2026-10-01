import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal-page";

export const Route = createFileRoute("/returns")({
  head: () => ({ meta: [{ title: "Повернення товару — Сюрприз бокс" }] }),
  component: Returns,
});

function Returns() {
  return (
    <LegalPage title="Повернення товару">
      <p>Послуга «Легке повернення» Нової Пошти не підтримується.</p>
      <p>
        Якщо бокс приїхав пошкодженим або це не той розмір, скажіть менеджеру до оплати або
        одразу після огляду. Повернення погоджуємо окремо і підказуємо, як відправити назад.
      </p>
      <p>
        До оплати від посилки можна відмовитись на відділенні — тоді нічого платити не потрібно.
        Відкритий бокс, яким уже користувались, назад не приймаємо.
      </p>
    </LegalPage>
  );
}
