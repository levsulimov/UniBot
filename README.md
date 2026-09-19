# UniBot

Базовый MAX-бот для абитуриентов и первокурсников Финансового университета. Реализован только стартовый сценарий, выбор роли, ввод группы первокурсника и меню-заглушки.

## Архитектура

- `src/max-client.js` получает обновления MAX через long polling при запуске процесса; отдельная настройка webhook и публичный URL для локального запуска не требуются.
- `src/server.js` запускает HTTP-проверку `GET /health`; `POST /max/webhook` оставлен как совместимый дополнительный способ доставки событий.
- `src/max-client.js` отправляет сообщения через официальный endpoint MAX Bot API `POST /messages` с Bearer-токеном и inline-клавиатурой.
- `src/bot-service.js` содержит конечный автомат сценария и не знает деталей HTTP/MAX.
- `src/user-repository.js` хранит профиль в SQLite. Таблица `users` содержит `max_user_id`, `role`, `study_group`, `created_at`, `updated_at`; файл базы по умолчанию — `data/unibot.sqlite`, поэтому группа переживает перезапуск процесса.

## Запуск

Требуется Node.js **22.5+** (используется встроенный `node:sqlite`; внешние пакеты не нужны).

```bash
cp .env.example .env
# заполните MAX_BOT_TOKEN
set -a; . ./.env; set +a
npm start
```

После `npm start` бот начинает получать обновления MAX через long polling с токеном из `.env`; настраивать webhook или туннель для локального запуска не нужно. Проверка работоспособности сервера: `GET /health`.

## Переменные окружения

| Переменная | Обязательна | Назначение |
| --- | --- | --- |
| `MAX_BOT_TOKEN` | да | токен бота MAX |
| `PORT` | нет | порт HTTP-сервера, по умолчанию `3000` |
| `DATABASE_PATH` | нет | путь к SQLite, по умолчанию `./data/unibot.sqlite` |
| `MAX_API_BASE_URL` | нет | URL API MAX, по умолчанию `https://platform-api2.max.ru` |

## Проверка

```bash
npm test
npm run check
```
