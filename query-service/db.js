import pkg from "pg";
import dotenv from "dotenv";
dotenv.config();

const { Pool } = pkg;

console.log('🔧 [DB] Initializing database connection...');
console.log('🔧 [DB] Connection string:', process.env.PG_URL ? 'Set' : 'Missing');

export const pool = new Pool({
  connectionString: process.env.PG_URL,
});

// Test the connection
pool.on('connect', (client) => {
  console.log('✅ [DB] New client connected to database');
});

pool.on('error', (err, client) => {
  console.error('❌ [DB] Unexpected error on idle client:', err);
});

// Test initial connection
pool.query('SELECT NOW() as current_time, version() as postgres_version')
  .then(result => {
    console.log('✅ [DB] Database connection successful');
    console.log('✅ [DB] Current time:', result.rows[0].current_time);
    console.log('✅ [DB] PostgreSQL version:', result.rows[0].postgres_version);
  })
  .catch(err => {
    console.error('❌ [DB] Database connection failed:', err.message);
  });
