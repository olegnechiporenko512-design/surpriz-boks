# Сюрприз бокс

Лендінг Mystery Box для surprize-cool.click. Заявка: форма → `POST /api/lead` → одразу `{ success: true, order_id }` → у фоні Google Apps Script і Meta Conversions API.

На Vercel потрібні змінні оточення (значення не зберігаються в репозиторії):

- `GOOGLE_SCRIPT_URL` — адреса веб-додатка Apps Script (`https://script.google.com/macros/s/.../exec`)
- `META_CAPI_TOKEN` — токен Conversions API для пікселя `1749190629525376` (sensitive)
- `META_TEST_EVENT_CODE` — необов’язково, лише щоб події потрапляли в Test Events

Піксель Meta `1749190629525376` стоїть у `<head>`: PageView на всіх сторінках, ViewContent лише на головній. Lead і Purchase — тільки на `/dyakuiemo`, з `eventID` = `order_id` (той самий, що `event_id` у CAPI). TikTok `DAVD15BC77UE17RL07SG` теж у `<head>`: `page` на всіх сторінках, ViewContent лише на головній, `identify` і SubmitForm — тільки на `/dyakuiemo`.
