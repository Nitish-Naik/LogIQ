import express from 'express';
import { buildQuery } from '../queryBuilder.js';
import { pool } from '../db.js';
import { redactText, redactObject } from './pii.js';
import { summarizeWithOpenAI, getEmbedding } from './openai.js';

const router = express.Router();

// POST /ai/summarize
// Body: { filters: { ...same as /logs }, maxLogs }
router.post('/summarize', async (req, res) => {
  try {
    const filters = req.body?.filters || req.query || {};
    const maxLogs = parseInt(req.body?.maxLogs || req.query?.maxLogs || '50', 10);

    // Build query using existing builder
    const { text, values } = buildQuery(filters);

    // Ensure we limit to a reasonable number
    const limitedQuery = text.replace(/LIMIT \d+/i, `LIMIT ${Math.min(maxLogs, 200)}`);

    const result = await pool.query(limitedQuery, values);
    const logs = result.rows || [];

    if (logs.length === 0) return res.json({ summary: 'No logs matched the query', count: 0 });

    // Redact sensitive fields and create prompt
    const redacted = logs.map(l => redactObject(l));

    const prompt = `Summarize the following ${redacted.length} logs. Provide: 1) a 2-3 sentence summary, 2) top 3 observed issues, 3) suggested next steps. Include references to source log indices.
\nLogs:\n${redacted.slice(0, 100).join('\n---\n')}`;

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return res.status(400).json({ error: 'OPENAI_API_KEY not configured' });

    const summary = await summarizeWithOpenAI(apiKey, prompt, { maxTokens: 512 });

    res.json({ summary, count: logs.length });
  } catch (err) {
    console.error('AI summarize error:', err);
    res.status(500).json({ error: 'Failed to summarize logs', detail: err.message });
  }
});

// POST /ai/semantic-search
// Body: { query: string, k: number }
router.post('/semantic-search', async (req, res) => {
  try {
    const q = req.body?.query || req.query?.query;
    const k = parseInt(req.body?.k || req.query?.k || '10', 10);

    if (!q) return res.status(400).json({ error: 'query is required' });

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return res.status(400).json({ error: 'OPENAI_API_KEY not configured' });

    const emb = await getEmbedding(apiKey, q);

    // Query Postgres using pgvector <-> operator
    // Note: requires pgvector extension and logs.embedding column
    const sql = `SELECT id, timestamp, level, app_name, message, organization_id, embedding <-> $1 as distance
                 FROM logs
                 WHERE embedding IS NOT NULL
                 ORDER BY embedding <-> $1
                 LIMIT $2`;

    const result = await pool.query(sql, [emb, k]);
    const rows = result.rows || [];

    res.json({ query: q, results: rows });
  } catch (err) {
    console.error('AI semantic-search error:', err);
    res.status(500).json({ error: 'Failed to perform semantic search', detail: err.message });
  }

export default router;
