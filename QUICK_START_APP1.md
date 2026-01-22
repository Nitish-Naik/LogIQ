# 🎯 Quick Start: Running App1 with API Key

## For Users Who Just Signed Up

Congratulations! You've signed up and received your API key. Here's how to test it with our sample e-commerce application.

## Step-by-Step Guide

### Step 1: Copy Your API Key
You should have copied your API key during signup. It looks like:
```
idl_sk_xY3nP8mQ2kL9vB5zF7hR4jW6cA1sD0eT
```

⚠️ **Important:** If you didn't copy it, you'll need to generate a new one from the dashboard.

### Step 2: Set Up Environment
Navigate to the sample apps directory and create a `.env` file:

```bash
cd sample-app-requests
```

Create or edit the `.env` file with:
```
LOG_API_KEY=idl_sk_your_actual_api_key_here
COLLECTOR_URL=http://localhost:4000/logs
```

### Step 3: Install Dependencies
```bash
npm install
```

### Step 4: Start the Sample App
```bash
npm run app1
```

You should see:
```
🚀 E-commerce Demo Application Started!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 Server: http://localhost:3001
🔑 API Key: idl_sk_xY3nP8mQ2k...
📊 Logs Dashboard: http://localhost:5173/dashboard
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Step 5: Visit the Application
Open your browser and go to:
```
http://localhost:3001
```

### Step 6: Test Different Actions
Try these to generate different types of logs:

1. **Click "View Products"** → Generates `INFO` log
2. **Click "Add to Cart" on any product** → Generates `INFO` log with product details
3. **Click "Login"** → Try logging in with:
   - Email: `test@example.com`
   - Password: `demo123`
   - Generates `INFO` log on success, `WARN` on failure
4. **Click "Checkout"** → Complete an order → Generates `INFO` log with order details
5. **Click "Trigger Error"** → Generates `ERROR` log with stack trace

### Step 7: View Logs in Dashboard
Open another browser tab:
```
http://localhost:5173/dashboard
```

You should see all your logs appearing in real-time! 🎉

## What's Happening Behind the Scenes?

```
Your Browser           App1 (Port 3001)      Collector (Port 4000)    Dashboard
     |                        |                        |                    |
     |-- Click Button ------->|                        |                    |
     |                        |                        |                    |
     |                        |-- POST /logs --------->|                    |
     |                        |   X-API-Key: idl_sk_...|                    |
     |                        |                        |                    |
     |                        |                        |-- Validate API Key |
     |                        |                        |-- Extract userId   |
     |                        |                        |-- Store Log ------>|
     |                        |                        |                    |
     |<-- Page Response ------|                        |                    |
     |                        |                        |                    |
                                                                     You see the log!
```

## Troubleshooting

### "API key is required"
- Make sure you created the `.env` file
- Check that `LOG_API_KEY` is set correctly
- Restart the app after creating `.env`

### "Cannot find module 'express'"
- Run `npm install` in the `sample-app-requests` directory

### "Port 3001 already in use"
- Stop any other app running on port 3001
- Or change the PORT in `app1.js`

### "Connection refused to localhost:4000"
- Make sure the collector service is running:
  ```bash
  cd collector
  npm run dev
  ```

### No logs appearing in dashboard
- Verify your API key is correct
- Check collector logs for errors
- Make sure PostgreSQL and Redis are running:
  ```bash
  docker ps
  ```

## Next Steps

1. ✅ You've successfully sent logs using API key!
2. 📝 Explore the code in `apps/app1.js` to see how it's done
3. 🔧 Integrate into your own application
4. 📊 Set up alerts and monitoring in the dashboard
5. 👥 Invite team members

## Need Help?

- 📚 Full API Documentation: `collector/API_KEY_AUTHENTICATION.md`
- 🏗️ Architecture Guide: `DISTRIBUTED_ARCHITECTURE_VIEW.md`
- 💡 More Examples: `sample-app-requests/README.md`

Happy logging! 🚀
