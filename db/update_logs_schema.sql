-- Update logs table to include user and organization context
-- Run this to add user columns to existing logs table

-- Add new columns if they don't exist
ALTER TABLE logs ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE logs ADD COLUMN IF NOT EXISTS organization_id UUID;

-- Add foreign key constraints (optional, but recommended)
ALTER TABLE logs ADD CONSTRAINT fk_user 
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE logs ADD CONSTRAINT fk_organization 
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_logs_user_id ON logs(user_id);
CREATE INDEX IF NOT EXISTS idx_logs_organization_id ON logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_logs_level ON logs(level);
CREATE INDEX IF NOT EXISTS idx_logs_app_name ON logs(app_name);

-- Create a composite index for common query patterns
CREATE INDEX IF NOT EXISTS idx_logs_user_timestamp ON logs(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_logs_org_timestamp ON logs(organization_id, timestamp DESC);