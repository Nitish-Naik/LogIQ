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
  console.error('Unexpected error on idle PostgreSQL client', err);
});

module.exports = pool;
