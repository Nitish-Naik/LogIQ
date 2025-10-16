-- API Keys Table Schema
-- This table stores API keys that users generate to authenticate their applications
-- API keys replace the need for applications to know userId and organizationId

CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Security: Store hash, not plain key
  key_hash VARCHAR(255) NOT NULL UNIQUE,
  
  -- Display: Show first few characters (e.g., "idl_sk_abc123...")
  key_prefix VARCHAR(20) NOT NULL,
  
  -- User context: Who owns this key?
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Metadata
  name VARCHAR(100) NOT NULL DEFAULT 'Default API Key',
  description TEXT,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Usage tracking
  last_used_at TIMESTAMP,
  
  -- Timestamps
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP  -- Optional: Key can expire
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_organization_id ON api_keys(organization_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_is_active ON api_keys(is_active);

-- Trigger to update updated_at if you add that column later
CREATE OR REPLACE FUNCTION update_api_keys_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    NEW.last_used_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Comment on table
COMMENT ON TABLE api_keys IS 'Stores API keys for authenticating external applications';
COMMENT ON COLUMN api_keys.key_hash IS 'SHA-256 hash of the actual API key';
COMMENT ON COLUMN api_keys.key_prefix IS 'First 12 characters of key for display (e.g., idl_sk_abc123...)';
COMMENT ON COLUMN api_keys.user_id IS 'User who owns this API key';
COMMENT ON COLUMN api_keys.organization_id IS 'Organization this key belongs to';
COMMENT ON COLUMN api_keys.is_active IS 'Whether this key can be used (for revocation)';
