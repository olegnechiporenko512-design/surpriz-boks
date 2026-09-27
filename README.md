# Сюрприз бокс

Лендінг Mystery Box. Заявка: форма → `POST /api/lead` → Google Apps Script → таблиця + LP-CRM.

На Vercel додайте змінну оточення:

`GOOGLE_SCRIPT_URL` = адреса веб-додатка Apps Script (`https://script.google.com/macros/s/.../exec`)

Пікселі Meta `3557729764386334` і TikTok `DAS6203C77U3N3HEQL7G` стоять у `<head>`. Події Lead і SubmitForm відправляються тільки після `success: true`.
