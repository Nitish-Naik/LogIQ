const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'devlogs',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'logsdb',
  password: process.env.DB_PASSWORD || 'devlogs',
  port: process.env.DB_PORT || 5432,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Test database connection
const testConnection = async () => {
  try {
    const client = await pool.connect();
    console.log('✅ Database connected successfully');
    client.release();
    return true;
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
    console.error('Connection details:', {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'logsdb',
      user: process.env.DB_USER || 'devlogs'
    });
    return false;
  }
};

module.exports = pool;
module.exports.testConnection = testConnection;
