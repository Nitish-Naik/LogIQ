const redis = require('../config/redisClient');
const { insertLogs } = require('../models/logModel');

const Redis = require('ioredis');
const pub = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const STREAM_KEY = process.env.REDIS_STREAM_KEY || 'logs-stream';
const GROUP = process.env.REDIS_CONSUMER_GROUP || 'log_consumers';
const CONSUMER = `${require('os').hostname()}:${process.pid}`;
const DLQ_STREAM = `${STREAM_KEY}-dlq`;
const MAX_DELIVERIES = parseInt(process.env.MAX_DELIVERIES || '5', 10);

// Track failed delivery attempts in Redis with a small key per message id
function failureKey(id) {
  return `proc_fail:${STREAM_KEY}:${id}`;
}

async function ensureGroup() {
  try {
    await redis.xgroup('CREATE', STREAM_KEY, GROUP, '$', 'MKSTREAM');
    console.log(`🔧 Created consumer group ${GROUP} on ${STREAM_KEY}`);
  } catch (err) {
    // Ignore if group exists
    if (err && !/BUSYGROUP/.test(err.message || '')) {
      console.error('Failed to create consumer group:', err);
    }
  }
}

async function processEntry(id, entries) {
  const obj = {};
  for (let i = 0; i < entries.length; i += 2) {
    const key = entries[i];
    let value = entries[i + 1];
    try { value = JSON.parse(value); } catch (_) {}
    obj[key] = value;
  }

  // Attempt to insert and publish
  try {
    await insertLogs([obj]);

    // Publish to live channel
    await pub.publish('logs-live', JSON.stringify(obj));

    // Acknowledge message
    await redis.xack(STREAM_KEY, GROUP, id);

    // cleanup failure counter if exists
    await redis.del(failureKey(id));

    return true;
  } catch (err) {
    console.error(`❌ Failed to process entry ${id}:`, err.message || err);

    const attempts = await redis.incr(failureKey(id));
    // Keep a short TTL for the failure counter
    await redis.expire(failureKey(id), 60 * 60); // 1 hour

    if (attempts >= MAX_DELIVERIES) {
      console.warn(`⚠️ Moving message ${id} to DLQ after ${attempts} attempts`);

      // Read original message fields
      const range = await redis.xrange(STREAM_KEY, id, id);
      if (range && range.length) {
        const [, entriesArr] = range[0];
        // store raw payload into DLQ as JSON string under field 'payload'
        const payload = {};
        for (let i = 0; i < entriesArr.length; i += 2) {
          const k = entriesArr[i];
          let v = entriesArr[i+1];
          try { v = JSON.parse(v); } catch (_) {}
          payload[k] = v;
        }

        await redis.xadd(DLQ_STREAM, '*', 'original_id', id, 'payload', JSON.stringify(payload));
      }

      // Acknowledge and delete original message to avoid redelivery
      await redis.xack(STREAM_KEY, GROUP, id);
      try { await redis.xdel(STREAM_KEY, id); } catch (_) {}
      await redis.del(failureKey(id));
    }

    return false;
  }
}

async function startStreamProcessor() {
  console.log('🔁 Starting stream processor (consumer group)...');

  await ensureGroup();

  while (true) {
    try {
      // First, attempt to claim any pending messages that have been idle for a while
      try {
        const pending = await redis.xpending(STREAM_KEY, GROUP, '-', '+', 10);
        if (Array.isArray(pending) && pending.length) {
          for (const p of pending) {
            // p = [id, consumer, ms_idle, deliveries]
            const [id, , msIdle, deliveries] = p;
            const idleSeconds = Math.floor(msIdle / 1000);
            if (deliveries >= MAX_DELIVERIES) {
              console.warn(`⚠️ Pending ${id} has ${deliveries} deliveries; moving to DLQ`);
              // move to DLQ
              const range = await redis.xrange(STREAM_KEY, id, id);
              if (range && range.length) {
                const [, entriesArr] = range[0];
                const payload = {};
                for (let i = 0; i < entriesArr.length; i += 2) {
                  const k = entriesArr[i];
                  let v = entriesArr[i+1];
                  try { v = JSON.parse(v); } catch (_) {}
                  payload[k] = v;
                }
                await redis.xadd(DLQ_STREAM, '*', 'original_id', id, 'payload', JSON.stringify(payload));
              }
              await redis.xack(STREAM_KEY, GROUP, id);
              try { await redis.xdel(STREAM_KEY, id); } catch (_) {}
              await redis.del(failureKey(id));
            }
          }
        }
      } catch (err) {
        // non-fatal
        // console.error('Pending check error:', err);
      }

      // Read new messages for this consumer
      const resp = await redis.xreadgroup('GROUP', GROUP, CONSUMER, 'BLOCK', 5000, 'COUNT', 10, 'STREAMS', STREAM_KEY, '>');
      if (!resp) continue;

      const [_, messages] = resp[0];

      for (const [id, entries] of messages) {
        await processEntry(id, entries);
      }

    } catch (err) {
      console.error('❌ Error in stream processor main loop:', err);
      // backoff briefly
      await new Promise(r => setTimeout(r, 1000));
    }
  }
}

module.exports = { startStreamProcessor };
