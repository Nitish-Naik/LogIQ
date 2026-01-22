// Test database connection
const { Pool } = require('pg');

const pool = new Pool({
  user: 'devlogs',
  host: 'localhost',
  database: 'logsdb',
  password: 'devlogs',
  port: 5432,
});

async function testConnection() {
  try {
    console.log('Testing database connection...');
    const client = await pool.connect();
    console.log('✅ Connected successfully!');
    
    const result = await client.query('SELECT NOW()');
    console.log('✅ Query executed:', result.rows[0]);
    
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log('✅ Tables in database:', tablesResult.rows.map(r => r.table_name).join(', '));
    
    client.release();
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('❌ Connection failed:', err.message);
    console.error('Error details:', err);
    process.exit(1);
  }
}

testConnection();
