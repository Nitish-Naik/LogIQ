# Processor (Stream Consumer)

Overview
- The Processor consumes log entries from the Redis stream, persists them into PostgreSQL, and republishes live events on a Redis pub/sub channel for the dashboard.

Key behaviour
- Uses Redis consumer groups to provide at-least-once processing semantics.
- Tracks per-message retries and moves repeatedly failing messages to a DLQ stream.

Quick start

```bash
cd processor
node index.js
```

Configuration
- The processor reads `REDIS_URL` and `REDIS_STREAM_KEY` from environment variables.

Important files
- `processor/services/streamProcessor.js` — consumer-group logic, retry and DLQ handling.
- `processor/models/logModel.js` — DB insert logic for persisted logs.

Notes
- For scale, run multiple processor instances in the same consumer group and monitor the pending list to detect slow consumers.
# Processor

This is the `processor` component of Instant Dev Logs.