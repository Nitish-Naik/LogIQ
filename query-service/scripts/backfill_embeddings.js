#!/usr/bin/env node
import dotenv from 'dotenv';
dotenv.config();
import { pool } from '../db.js';
import { getEmbedding } from '../ai/openai.js';

const BATCH = parseInt(process.env.BACKFILL_BATCH || '100', 10);
const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  console.error('OPENAI_API_KEY not set');
  process.exit(1);
}

async function run() {
  let offset = 0;
  while (true) {
    const res = await pool.query('SELECT id, message FROM logs WHERE embedding IS NULL ORDER BY id LIMIT $1 OFFSET $2', [BATCH, offset]);
    if (res.rows.length === 0) break;

    for (const row of res.rows) {
      try {
        const emb = await getEmbedding(apiKey, row.message || '');
        await pool.query('UPDATE logs SET embedding = $1 WHERE id = $2', [emb, row.id]);
        console.log('Updated embedding for', row.id);
      } catch (err) {
        console.error('Failed embedding for', row.id, err.message || err);
      }
    }

    offset += res.rows.length;
  }

  console.log('Backfill complete');
  process.exit(0);
}

run().catch(err => { console.error(err); process.exit(1); });
