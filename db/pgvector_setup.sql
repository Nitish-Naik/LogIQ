-- Enable pgvector extension and add embedding column to logs
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column (1536 dims for OpenAI text-embedding-3-small/large variants)
ALTER TABLE logs
  ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- Create an index for ANN search
CREATE INDEX IF NOT EXISTS idx_logs_embedding ON logs USING ivfflat (embedding vector_l2_ops) WITH (lists = 100);
