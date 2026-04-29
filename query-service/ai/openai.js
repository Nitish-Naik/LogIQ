import fetch from 'node-fetch';

export async function summarizeWithOpenAI(apiKey, prompt, opts = {}) {
  if (!apiKey) throw new Error('OPENAI_API_KEY not set');

  const model = opts.model || 'gpt-3.5-turbo';
  const maxTokens = opts.maxTokens || 512;

  const body = {
    model,
    messages: [
      { role: 'system', content: 'You are an assistant that summarizes logs. Produce concise summaries, highlight top issues, and suggest next steps.' },
      { role: 'user', content: prompt }
    ],
    max_tokens: maxTokens,
    temperature: opts.temperature ?? 0.2
  };

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`OpenAI error: ${res.status} ${t}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  return content;
}

export async function getEmbedding(apiKey, text, opts = {}) {
  if (!apiKey) throw new Error('OPENAI_API_KEY not set');
  const model = opts.model || 'text-embedding-3-small';

  const body = {
    model,
    input: text
  };

  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`OpenAI embeddings error: ${res.status} ${t}`);
  }

  const data = await res.json();
  const emb = data.data?.[0]?.embedding;
  return emb;
}
