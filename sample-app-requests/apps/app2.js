/**
 * App1 - E-commerce Website Example
 * 
 * This is a sample web application that demonstrates how to integrate
 * Instant Dev Logs using API key authentication.
 * 
 * Setup:
 * 1. Sign up at http://localhost:5173/signup
 * 2. Copy your API key (e.g., idl_sk_abc123...)
 * 3. Create .env file: LOG_API_KEY=your_api_key_here
 * 4. Run: node app1.js
 * 5. Visit: http://localhost:3001
 */

import express from 'express';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3002;
const APP_NAME = 'microsoft';

// Get API key from environment
const API_KEY = process.env.LOG_API_KEY2;

if (!API_KEY) {
  console.error('❌ Error: LOG_API_KEY not found in environment variables');
  console.log('');
  console.log('Setup Instructions:');
  console.log('1. Sign up at http://localhost:8080/signup');
  console.log('2. Copy your API key');
  console.log('3. Create/update .env file with: LOG_API_KEY=idl_sk_your_key_here');
  console.log('4. Restart this application');
  process.exit(1);
}

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logger utility function
async function logToCollector(level, message, meta = {}) {
  try {
    const logData = {
      timestamp: new Date().toISOString(),
      level: level,
      message: message,
      appName: APP_NAME,
      meta: {
        ...meta,
        environment: 'production',
        version: '1.0.0'
      }
    };

    await axios.post(process.env.COLLECTOR_URL || 'http://localhost:4000/logs', logData, {
      headers: {
        'X-API-Key': API_KEY,
        'Content-Type': 'application/json'
      }
    });

    console.log(`📤 [${level.toUpperCase()}] ${message}`);
  } catch (error) {
    console.error('❌ Failed to send log:', error.response?.data || error.message);
  }
}

// Home page
app.get('/', (req, res) => {
  logToCollector('info', 'Homepage visited', {
    ip: req.ip,
    userAgent: req.get('user-agent')
  });

  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>E-commerce Store - App1</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          max-width: 800px;
          margin: 50px auto;
          padding: 20px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }
        .container {
          background: rgba(255, 255, 255, 0.1);
          padding: 30px;
          border-radius: 10px;
          backdrop-filter: blur(10px);
        }
        h1 { margin-top: 0; }
        .buttons {
          display: flex;
          gap: 10px;
          margin: 20px 0;
        }
        button, a {
          padding: 10px 20px;
          background: white;
          color: #667eea;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          text-decoration: none;
          display: inline-block;
          font-weight: bold;
        }
        button:hover, a:hover {
          background: #f0f0f0;
        }
        .product {
          background: rgba(255, 255, 255, 0.2);
          padding: 15px;
          margin: 10px 0;
          border-radius: 5px;
        }
        .status {
          background: rgba(0, 255, 0, 0.2);
          padding: 10px;
          border-radius: 5px;
          margin-bottom: 20px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🛍️ Welcome to Our E-commerce Store</h1>
        
        <div class="status">
          ✅ <strong>Logging Active</strong><br>
          API Key: ${API_KEY.substring(0, 15)}...<br>
          All events are being logged to Instant Dev Logs
        </div>

        <p>This is a demo application showing how to integrate Instant Dev Logs.</p>
        
        <div class="buttons">
          <a href="/products">View Products</a>
          <a href="/login">Login</a>
          <a href="/checkout">Checkout</a>
          <a href="/error">Trigger Error</a>
        </div>

        <h3>Try these actions to see logs:</h3>
        <div class="product">
          <strong>Product Actions:</strong> Browse products, add to cart
        </div>
        <div class="product">
          <strong>User Actions:</strong> Login attempts, profile views
        </div>
        <div class="product">
          <strong>Errors:</strong> Trigger errors to see error logging
        </div>

        <p style="margin-top: 30px; font-size: 12px; opacity: 0.8;">
          📊 View all logs in your dashboard: <a href="http://localhost:8080/dashboard" style="color: black">http://localhost:8080/dashboard</a>
        </p>
      </div>
    </body>
    </html>
  `);
});

// Products page
app.get('/products', (req, res) => {
  logToCollector('info', 'Products page viewed', {
    ip: req.ip,
    userAgent: req.get('user-agent')
  });

  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Products - E-commerce Store</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          max-width: 800px;
          margin: 50px auto;
          padding: 20px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }
        .container {
          background: rgba(255, 255, 255, 0.1);
          padding: 30px;
          border-radius: 10px;
          backdrop-filter: blur(10px);
        }
        .product {
          background: rgba(255, 255, 255, 0.2);
          padding: 20px;
          margin: 15px 0;
          border-radius: 8px;
        }
        button {
          padding: 8px 16px;
          background: white;
          color: #667eea;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          font-weight: bold;
        }
        a {
          color: white;
          text-decoration: underline;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🛍️ Our Products</h1>
        <div class="product">
          <h3>Laptop - $999</h3>
          <p>High-performance laptop for developers</p>
          <button onclick="addToCart('laptop')">Add to Cart</button>
        </div>
        <div class="product">
          <h3>Smartphone - $699</h3>
          <p>Latest smartphone with amazing features</p>
          <button onclick="addToCart('smartphone')">Add to Cart</button>
        </div>
        <div class="product">
          <h3>Headphones - $199</h3>
          <p>Noise-cancelling wireless headphones</p>
          <button onclick="addToCart('headphones')">Add to Cart</button>
        </div>
        <p><a href="/">← Back to Home</a></p>
      </div>
      <script>
        function addToCart(product) {
          fetch('/api/cart/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ product })
          }).then(r => r.json()).then(data => {
            alert(data.message);
          });
        }
      </script>
    </body>
    </html>
  `);
});

// Add to cart API
app.post('/api/cart/add', (req, res) => {
  const { product } = req.body;
  
  logToCollector('info', `Product added to cart: ${product}`, {
    product: product,
    ip: req.ip,
    action: 'add_to_cart'
  });

  res.json({ message: `${product} added to cart! (Check your logs dashboard)` });
});

// Login page
app.get('/login', (req, res) => {
  logToCollector('info', 'Login page accessed', {
    ip: req.ip
  });

  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Login - E-commerce Store</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          max-width: 400px;
          margin: 100px auto;
          padding: 20px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }
        .container {
          background: rgba(255, 255, 255, 0.1);
          padding: 30px;
          border-radius: 10px;
          backdrop-filter: blur(10px);
        }
        input {
          width: 100%;
          padding: 10px;
          margin: 10px 0;
          border: none;
          border-radius: 5px;
          box-sizing: border-box;
        }
        button {
          width: 100%;
          padding: 12px;
          background: white;
          color: #667eea;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          font-weight: bold;
          margin-top: 10px;
        }
        a { color: white; }
      </style>
    </head>
    <body>
      <div class="container">
        <h2>🔐 Login</h2>
        <form id="loginForm">
          <input type="email" placeholder="Email" id="email" required>
          <input type="password" placeholder="Password" id="password" required>
          <button type="submit">Login</button>
        </form>
        <p><a href="/">← Back to Home</a></p>
      </div>
      <script>
        document.getElementById('loginForm').addEventListener('submit', async (e) => {
          e.preventDefault();
          const email = document.getElementById('email').value;
          const password = document.getElementById('password').value;
          
          const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
          });
          
          const data = await response.json();
          alert(data.message);
        });
      </script>
    </body>
    </html>
  `);
});

// Login API
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  
  // Simulate login logic
  if (email && password === 'demo123') {
    logToCollector('info', `User logged in successfully: ${email}`, {
      email: email,
      ip: req.ip,
      action: 'login_success'
    });
    
    res.json({ message: 'Login successful! Check your logs dashboard.' });
  } else {
    logToCollector('warn', `Failed login attempt: ${email}`, {
      email: email,
      ip: req.ip,
      action: 'login_failed',
      reason: 'invalid_credentials'
    });
    
    res.status(401).json({ message: 'Invalid credentials. (Hint: password is "demo123")' });
  }
});

// Checkout page
app.get('/checkout', (req, res) => {
  logToCollector('info', 'Checkout initiated', {
    ip: req.ip,
    action: 'checkout_started'
  });

  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Checkout - E-commerce Store</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          max-width: 600px;
          margin: 50px auto;
          padding: 20px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }
        .container {
          background: rgba(255, 255, 255, 0.1);
          padding: 30px;
          border-radius: 10px;
          backdrop-filter: blur(10px);
        }
        button {
          width: 100%;
          padding: 15px;
          background: white;
          color: #667eea;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          font-weight: bold;
          font-size: 16px;
          margin-top: 20px;
        }
        a { color: white; }
      </style>
    </head>
    <body>
      <div class="container">
        <h2>💳 Checkout</h2>
        <p>Total: $1,897.00</p>
        <p>Items in cart: 3</p>
        <button onclick="completeOrder()">Complete Order</button>
        <p><a href="/">← Back to Home</a></p>
      </div>
      <script>
        function completeOrder() {
          fetch('/api/order/complete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ total: 1897, items: 3 })
          }).then(r => r.json()).then(data => {
            alert(data.message);
          });
        }
      </script>
    </body>
    </html>
  `);
});

// Complete order API
app.post('/api/order/complete', (req, res) => {
  const { total, items } = req.body;
  const orderId = Math.random().toString(36).substring(7).toUpperCase();
  
  logToCollector('info', `Order completed: ${orderId}`, {
    orderId: orderId,
    total: total,
    items: items,
    ip: req.ip,
    action: 'order_completed'
  });

  res.json({ message: `Order ${orderId} completed! Check your logs dashboard.` });
});

// Error page (to demonstrate error logging)
app.get('/error', (req, res) => {
  logToCollector('error', 'User triggered error page', {
    ip: req.ip,
    path: req.path,
    action: 'error_triggered'
  });

  // Simulate an error
  try {
    throw new Error('This is a simulated error for testing');
  } catch (error) {
    logToCollector('error', `Application error: ${error.message}`, {
      errorName: error.name,
      errorMessage: error.message,
      stack: error.stack,
      ip: req.ip
    });

    res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Error - E-commerce Store</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            max-width: 600px;
            margin: 100px auto;
            padding: 20px;
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
            color: white;
          }
          .container {
            background: rgba(255, 255, 255, 0.1);
            padding: 30px;
            border-radius: 10px;
            backdrop-filter: blur(10px);
          }
          a {
            color: white;
            background: rgba(255, 255, 255, 0.2);
            padding: 10px 20px;
            text-decoration: none;
            border-radius: 5px;
            display: inline-block;
            margin-top: 20px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>⚠️ Oops! Something went wrong</h1>
          <p>An error has occurred and has been logged to our monitoring system.</p>
          <p><strong>Error:</strong> ${error.message}</p>
          <p>Check your logs dashboard to see the error details!</p>
          <a href="/">← Back to Home</a>
        </div>
      </body>
      </html>
    `);
  }
});

// 404 handler
app.use((req, res) => {
  logToCollector('warn', `404 Page not found: ${req.path}`, {
    path: req.path,
    method: req.method,
    ip: req.ip
  });

  res.status(404).send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>404 - Page Not Found</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          max-width: 600px;
          margin: 100px auto;
          padding: 20px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          text-align: center;
        }
        a {
          color: white;
          background: rgba(255, 255, 255, 0.2);
          padding: 10px 20px;
          text-decoration: none;
          border-radius: 5px;
          display: inline-block;
          margin-top: 20px;
        }
      </style>
    </head>
    <body>
      <h1>404 - Page Not Found</h1>
      <p>The page you're looking for doesn't exist.</p>
      <a href="/">Go Home</a>
    </body>
    </html>
  `);
});

// Start server
app.listen(PORT, () => {
  console.log('');
  console.log('🚀 E-commerce Demo Application Started!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📍 Server: http://localhost:${PORT}`);
  console.log(`🔑 API Key: ${API_KEY.substring(0, 20)}...`);
  console.log(`📊 Logs Dashboard: http://localhost:8080/dashboard`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('Try these actions to see logs in real-time:');
  console.log('  → Visit homepage');
  console.log('  → Browse products and add to cart');
  console.log('  → Try logging in (password: demo123)');
  console.log('  → Complete checkout');
  console.log('  → Trigger an error');
  console.log('');
  
  // Log application startup
  logToCollector('info', 'Application started successfully', {
    port: PORT,
    environment: 'production',
    version: '1.0.0',
    nodeVersion: process.version
  });
});
