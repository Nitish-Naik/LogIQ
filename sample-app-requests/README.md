# 🚀 Sample Applications - Instant Dev Logs Integration

This directory contains sample applications demonstrating how to integrate Instant Dev Logs into your projects using **API Key authentication**.

## 📋 Prerequisites

1. **Sign up** for Instant Dev Logs
   - Visit: http://localhost:5173/signup
   - Create an account
   - **Copy your API key** (e.g., `idl_sk_abc123...`)
   - ⚠️ **Important:** You'll only see the API key once!

2. **Services Running**
   - Auth Service: http://localhost:3003
   - Collector Service: http://localhost:4000
   - Dashboard: http://localhost:5173

## 🎯 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Your API Key
Create/update the `.env` file in this directory:
```bash
LOG_API_KEY=idl_sk_your_actual_api_key_here
COLLECTOR_URL=http://localhost:4000/logs
```

### 3. Run Sample Application
```bash
npm run app1
```

### 4. Visit the Web App
Open your browser: **http://localhost:3001**

### 5. View Logs in Dashboard
Open: **http://localhost:5173/dashboard**

## 🌐 App1 - E-commerce Website Demo

**What it is:** A realistic e-commerce web application demonstrating real-world logging scenarios.

**Features:**
- 🏠 Homepage with logging status
- 🛍️ Product catalog
- 🛒 Shopping cart actions
- 🔐 User authentication
- 💳 Checkout process
- ⚠️ Error handling

**Run it:**
```bash
npm run app1
```

**Visit:** http://localhost:3001

**Try these actions:**
1. **Homepage** → Logs page view
2. **View Products** → Logs product browsing
3. **Add to Cart** → Logs cart actions
4. **Login** (password: `demo123`) → Logs authentication attempts
5. **Complete Checkout** → Logs order completion
6. **Trigger Error** → Logs application errors

## 📝 Integration Example

Here's how App1 integrates logging:

```javascript
import axios from 'axios';

const API_KEY = process.env.LOG_API_KEY;

async function logToCollector(level, message, meta = {}) {
  await axios.post('http://localhost:4000/logs', {
    timestamp: new Date().toISOString(),
    level: level,        // 'info', 'warn', 'error', 'debug'
    message: message,
    appName: 'ecommerce-app',
    meta: meta
  }, {
    headers: {
      'X-API-Key': API_KEY,  // ← API key for authentication!
      'Content-Type': 'application/json'
    }
  });
}

// Usage
app.get('/products', (req, res) => {
  logToCollector('info', 'Products page viewed', {
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
  
  res.render('products');
});
```

## 🔐 Security

**✅ DO:**
- Store API key in `.env` file
- Add `.env` to `.gitignore`
- Use environment variables in code

**❌ DON'T:**
- Hardcode API keys in code
- Commit API keys to Git
- Share API keys in plain text

## 📊 Log Levels

| Level   | Example Use Case |
|---------|------------------|
| `info`  | User login, page views, API calls |
| `warn`  | Low stock, failed validation |
| `error` | Exceptions, failed operations |
| `debug` | Development debugging |

## 🚨 Troubleshooting

### "API key is required"
→ Create `.env` file with `LOG_API_KEY=your_key`

### "Connection refused"
→ Start collector: `cd ../collector && npm run dev`

### "No logs in dashboard"
→ Verify:
1. API key is correct
2. Collector is running (port 4000)
3. Services are started

## 📚 More Resources

- API Documentation: `../collector/API_KEY_AUTHENTICATION.md`
- Implementation Guide: `../collector/IMPLEMENTATION_SUMMARY.md`
- Dashboard: http://localhost:5173/dashboard

Happy logging! 🚀