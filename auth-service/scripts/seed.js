#!/usr/bin/env node
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const pool = require('../src/config/db');
const { generateApiKey } = require('../src/utils/apiKeyGenerator');

async function run() {
  const email = process.env.SEED_ADMIN_EMAIL || 'admin@example.com';
  const password = process.env.SEED_ADMIN_PASSWORD || 'demo123';
  const orgName = process.env.SEED_ORG_NAME || 'Demo Organization';

  try {
    // Check existing user
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      console.log('Admin user already exists. Skipping seed.');
      process.exit(0);
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const organizationId = uuidv4();
      await client.query('INSERT INTO organizations (id, name) VALUES ($1, $2)', [organizationId, orgName]);

      const userId = uuidv4();
      const passwordHash = await bcrypt.hash(password, 10);

      await client.query(
        `INSERT INTO users (id, email, password_hash, organization_id, role, is_active, created_at)
         VALUES ($1, $2, $3, $4, $5, true, NOW())`,
        [userId, email, passwordHash, organizationId, 'admin']
      );

      // Create API key for this user
      const { apiKey, keyHash, keyPrefix } = generateApiKey();

      await client.query(
        `INSERT INTO api_keys (user_id, organization_id, key_hash, key_prefix, name, is_active, created_at)
         VALUES ($1, $2, $3, $4, $5, true, NOW())`,
        [userId, organizationId, keyHash, keyPrefix, 'Seeded Admin Key']
      );

      await client.query('COMMIT');

      console.log('✅ Seed complete. Admin user created:');
      console.log(`  email: ${email}`);
      console.log(`  password: ${password}`);
      console.log(`  apiKey (store this now, shown only once): ${apiKey}`);

    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Seed failed:', err);
      process.exit(1);
    } finally {
      client.release();
    }

  } catch (err) {
    console.error('Seed error:', err);
    process.exit(1);
  } finally {
    // allow process to exit cleanly
    setTimeout(() => process.exit(0), 100);
  }
}

run();
