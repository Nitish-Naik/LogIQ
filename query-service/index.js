import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import { pool } from './db.js';
import { buildQuery, buildAllRowsQuery, buildCountQuery } from './queryBuilder.js'

import { WebSocketServer } from 'ws';
import Redis from 'ioredis';


dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for all routes
app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:8080'], // React and Vite default ports
    credentials: true
}));

app.use(express.json());

// Middleware to log all incoming requests
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`\n🌐 [${timestamp}] ${req.method} ${req.url}`);
    console.log(`📋 [Request] Headers:`, JSON.stringify(req.headers, null, 2));
    console.log(`📋 [Request] Query params:`, JSON.stringify(req.query, null, 2));
    console.log(`📋 [Request] Body:`, JSON.stringify(req.body, null, 2));
    
    // Log response
    const originalSend = res.send;
    res.send = function(data) {
        console.log(`📤 [Response] Status: ${res.statusCode}`);
        console.log(`📤 [Response] Data length: ${data ? data.length : 0} characters`);
        return originalSend.call(this, data);
    };
    
    next();
});

// Existing filtered logs endpoint
app.get('/logs', async (req, res) => {
    console.log('\n🔍 [/logs] Starting filtered logs query');
    console.log('🔍 [/logs] Query parameters:', req.query);
    
    try {
        console.log('🔍 [/logs] Building query...');
        const { text, values } = buildQuery(req.query);
        
        console.log('🔍 [/logs] Executing database query...');
        const startTime = Date.now();
        const result = await pool.query(text, values);
        const queryTime = Date.now() - startTime;
        
        console.log(`✅ [/logs] Query executed successfully in ${queryTime}ms`);
        console.log(`✅ [/logs] Returned ${result.rows.length} rows`);
        console.log(`✅ [/logs] Sample row:`, result.rows[0] ? JSON.stringify(result.rows[0], null, 2) : 'No rows returned');
        
        res.json({ logs: result.rows });
    } catch (err) {
        console.error('❌ [/logs] Query error details:', {
            message: err.message,
            code: err.code,
            detail: err.detail,
            where: err.where,
            stack: err.stack
        });
        res.status(500).json({ error : 'Failed to fetch logs'});
    }
});

// New endpoint to get ALL rows from logs table
app.get('/logs/all', async (req, res) => {
    console.log('\n📋 [/logs/all] Starting all logs query');
    console.log('📋 [/logs/all] Query parameters:', req.query);
    
    try {
        const options = {
            limit: req.query.limit,
            offset: req.query.offset,
            orderBy: req.query.orderBy,
            organizationId: req.query.organizationId,
        };
        
        console.log('📋 [/logs/all] Options:', options);
        console.log('📋 [/logs/all] Building query...');
        
        const { text, values } = buildAllRowsQuery(options);
        
        console.log('� [/logs/all] Executing database query...');
        const startTime = Date.now();
        const result = await pool.query(text, values);
        const queryTime = Date.now() - startTime;
        
        console.log(`✅ [/logs/all] Query executed successfully in ${queryTime}ms`);
        console.log(`✅ [/logs/all] Returned ${result.rows.length} rows`);
        
        const responseData = { 
            logs: result.rows,
            count: result.rows.length,
            limit: parseInt(req.query.limit) || 1000,
            offset: parseInt(req.query.offset) || 0
        };
        
        console.log(`✅ [/logs/all] Response metadata:`, {
            count: responseData.count,
            limit: responseData.limit,
            offset: responseData.offset
        });
        
        res.json(responseData);
    } catch (err) {
        console.error('❌ [/logs/all] Error details:', {
            message: err.message,
            code: err.code,
            detail: err.detail,
            where: err.where,
            stack: err.stack
        });
        res.status(500).json({ error: 'Failed to fetch all logs' });
    }
});

// New endpoint to get total count of logs
app.get('/logs/count', async (req, res) => {
    console.log('\n📊 [/logs/count] Starting count query');
    const organizationId = req.query.organizationId;
    try {
        console.log('📊 [/logs/count] Building count query...');
        const { text, values } = buildCountQuery(organizationId);
        
        console.log('📊 [/logs/count] Executing database query...');
        const startTime = Date.now();
        const result = await pool.query(text, values);
        const queryTime = Date.now() - startTime;
        
        console.log(`✅ [/logs/count] Query executed successfully in ${queryTime}ms`);
        console.log(`✅ [/logs/count] Raw result:`, result.rows[0]);
        
        const responseData = { 
            total: parseInt(result.rows[0].total),
            timestamp: new Date().toISOString()
        };
        
        console.log(`✅ [/logs/count] Final response:`, responseData);
        
        res.json(responseData);
    } catch (err) {
        console.error('❌ [/logs/count] Error details:', {
            message: err.message,
            code: err.code,
            detail: err.detail,
            where: err.where,
            stack: err.stack
        });
        res.status(500).json({ error: 'Failed to get log count' });
    }
});


// New endpoint to get organization details
app.get('/getOrgDetails', async (req, res) => {
    console.log('\n📊 Starting organization details query');
    
    try {
        console.log('📊 [/logs/getOrgDetails] Building organization details  query...');
        const { text, values } = buildOrganizationDetailsQuery();
        
        console.log('📊 [/logs/getOrgDetails] Executing database query...');
        const startTime = Date.now();
        const result = await pool.query(text, values);
        const queryTime = Date.now() - startTime;
        
        console.log(`✅ [/logs/getOrgDetails] Query executed successfully in ${queryTime}ms`);
        console.log(`✅ [/logs/getOrgDetails] Raw result:`, result.rows[0]);
        
        const responseData = { 
            name: result.name
            // total: parseInt(result.rows[0].total),
            // timestamp: new Date().toISOString()
        };
        
        console.log(`✅ [/logs/getOrgDetails] Final response:`, responseData);
        
        res.json(responseData);
    } catch (err) {
        console.error('❌ [/logs/getOrgDetails] Error details:', {
            message: err.message,
            code: err.code,
            detail: err.detail,
            where: err.where,
            stack: err.stack
        });
        res.status(500).json({ error: 'Failed to get log count' });
    }
});

// app.listen(PORT, () => {
//     console.log(`\n� =================================`);
//     console.log(`�🔍 Query Service running on http://localhost:${PORT}`);
//     console.log(`🚀 =================================`);
//     console.log(`📊 Available endpoints:`);
//     console.log(`   GET /logs           - Filtered logs`);
//     console.log(`   GET /logs/all       - All logs (with pagination)`);
//     console.log(`   GET /logs/count     - Total log count`);
//     console.log(`🚀 =================================\n`);
// })


const server = app.listen(PORT, () => {
  console.log(`🔍 Query Service running on http://localhost:${PORT}`);
});

// 🔌 WebSocket server bound to same HTTP server

const wss = new WebSocketServer({ server, path: '/ws'});


// Track clients (optional filters can be added later)

wss.on('connection', (ws) => {
    console.log('🌐 WS client connected');

  ws.on('close', () => console.log('❌ WS client disconnected'));

  // Optional: accept client-sent filters later
  ws.on('message', (raw) => {
    // const msg = JSON.parse(raw.toString());
    // ws.filters = msg.filters;
  });
})

// 📡 Redis subscriber for live logs
const sub = new Redis(process.env.REDIS_URL);
sub.subscribe('logs-live', (err) => {
  if (err) console.error('Failed to subscribe to logs-live:', err);
  else console.log('📡 Subscribed to logs-live channel');
});

sub.on('message', (_channel, message) => {
  // Broadcast to all connected WS clients
  for (const client of wss.clients) {
    if (client.readyState === 1) {
      client.send(message); // message is JSON string of a log
    }
  }
});