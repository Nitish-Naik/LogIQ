# Collector Service

Overview
- The Collector exposes an HTTP ingestion endpoint that accepts structured JSON logs from client applications. Incoming requests are authenticated via API key middleware. Valid logs are pushed to a Redis stream for asynchronous processing.

Quick start

```bash
cd collector
npm install
npm run dev
```

Configuration
- See `collector/.env.example`.
- Important variables: `PORT`, `REDIS_URL`, `REDIS_STREAM_KEY`, `DB_*`, `RATE_LIMIT_PER_MIN`.

Endpoint
- `POST /logs` — ingest a log event. Must include `X-API-Key` header or `Authorization: Bearer <apiKey>`.

Middleware
- `apiKeyAuth` — validates API keys against the `api_keys` table and attaches `req.userContext`.
- `rateLimit` — per-key rate limiting backed by Redis; configurable via `RATE_LIMIT_PER_MIN`.

Notes
- The collector purposefully does minimal validation and relies on the processor to persist logs.
- Extend `collector/src/validators/logSchema.js` to enforce stricter schemas.
# Collector

This is the `collector` component of Instant Dev Logs.




### ✅ The **Collector** is the **first service** in the entire pipeline.

---

### 🔁 Here's the flow again:

```
[ Apps / Services generating logs ]
            ⬇
🚀 **[ Collector Service ]**
  - Accepts logs via HTTP POST
  - Validates log payload
  - Pushes logs into a queue (Redis Stream or Kafka)
            ⬇
[ Processor Service ]
[ Database ]
[ Query Service ]
[ Dashboard (optional) ]
```

---

### 🔹 Why is Collector first?

Because:

* It's the **entry point** to the logging system
* It receives log events from other applications (like your `sample-app`)
* It makes the system **language-agnostic** — any app that can call HTTP can send logs

---