# Query Service

Overview
- The Query Service provides a REST API and WebSocket endpoint to search, paginate, and stream logs stored in PostgreSQL. It also hosts experimental AI endpoints for summarization and semantic search.

Quick start

```bash
cd query-service
npm install
npm run dev
```

Configuration
- See `query-service/.env.example`.
- Important variables: `PORT`, `PG_URL`, `REDIS_URL`, `OPENAI_API_KEY` (optional).

Key endpoints
- `GET /logs` — filtered log search (see `queryBuilder.js` for filters)
- `GET /logs/all` — paginated listing (requires `organizationId`)
- `GET /logs/count` — total log count
- `WS /ws` — live streaming of logs published by the processor

AI endpoints (experimental)
- `POST /ai/summarize` — redacts PII and sends a sample of logs to an external LLM to generate a concise summary.
- `POST /ai/semantic-search` — uses embeddings (OpenAI) and `pgvector` to find semantically similar logs.

Backfill embeddings
- A backfill script is provided at `scripts/backfill_embeddings.js`. This will compute embeddings for existing logs and store them to the `embedding` column (requires `OPENAI_API_KEY` and `pgvector` enabled).

Notes
- Ensure `db/pgvector_setup.sql` has been applied before running semantic search.
- AI calls send redacted log content to external services; follow privacy guidelines.
# Query-service

This is the `query-service` component of Instant Dev Logs.

# 🎯 Goal of the Query Service

- A REST API that lets you search logs - from PostgreSQL based on:

- Timestamp range (from, to)

- Log level (info, error, etc.)

- App name

- Keywords in message

- Pagination



# 🧱 Tech Stack
| Part          | Choice                               |
| ------------- | ------------------------------------ |
| Language      | Node.js                              |
| Framework     | Express                              |
| DB Client     | `pg` (PostgreSQL)                    |
| Pagination    | Limit + Offset                       |
| Output Format | JSON                                 |
| Optional      | Add caching layer later (e.g. Redis) |



# 🗂️ Folder Structure
```
query-service/
├── index.js           ← Express app entry point
├── db.js              ← DB connection
├── queryBuilder.js    ← dynamic SQL filter builder
├── .env
└── package.json

```