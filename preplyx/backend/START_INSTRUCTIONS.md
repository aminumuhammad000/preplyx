# Backend Server Start Instructions

## Quick Start (Windows)

### Option 1: Using Batch Scripts (Recommended)

**For Production:**
1. Double-click `start-backend.bat`
2. This will build the TypeScript code and start the server
3. Server runs on `http://localhost:5004`

**For Development:**
1. Double-click `start-backend-dev.bat`
2. This starts the server with auto-restart on file changes
3. Server runs on `http://localhost:5004`

### Option 2: Using Command Line

**Open Command Prompt or Terminal:**

```bash
cd C:\Users\Aslam\OneDrive\Desktop\CBT\backend

# For production
npm run build
npm start

# For development (auto-restart)
npm run dev
```

## Prerequisites

Before starting the backend, ensure you have:

1. **Node.js** installed (v14 or higher)
2. **MongoDB** running locally or a MongoDB connection string in environment variables
3. **Dependencies installed** - Run `npm install` in the backend directory

## Environment Variables

Create a `.env` file in the backend directory with:

```env
MONGO_URI=mongodb://localhost:27017/cbt-database
JWT_SECRET=your-secret-key-here
PORT=5004
```

## Troubleshooting

### "Failed to fetch" in Frontend

This error means the backend server is not running. Start it using one of the methods above.

### TypeScript Build Errors

```bash
# Check for TypeScript errors
npm run build

# If you see errors, fix them in the .ts files and rebuild
```

### MongoDB Connection Errors

```bash
# Make sure MongoDB is running
# On Windows: Check Services for MongoDB
# Or start MongoDB manually if using local installation
```

### Port Already in Use

If port 5004 is already in use:

1. Change the PORT in your `.env` file
2. Or kill the process using port 5004:
   ```bash
   netstat -ano | findstr :5004
   taskkill /PID <PID> /F
   ```

## Server Health Check

Once the server is running, check health:

```
http://localhost:5004/health
```

Should return: `{"status": "ok", "timestamp": "..."}`

## Frontend Configuration

The frontend is configured to connect to:
```
http://localhost:5004/api
```

If you changed the backend port, update the frontend environment variable:

```env
NEXT_PUBLIC_API_URL=http://localhost:YOUR_PORT/api
```

## Common Issues

### PowerShell Execution Policy Error

If you get execution policy errors in PowerShell:

1. Open PowerShell as Administrator
2. Run: `Set-ExecutionPolicy RemoteSigned -Scope CurrentUser`
3. Try starting the server again

Or use Command Prompt (cmd) instead of PowerShell.

### Dependencies Not Found

```bash
cd C:\Users\Aslam\OneDrive\Desktop\CBT\backend
npm install
```

## Support

For issues not covered here, check:
- Backend console logs for error messages
- Network tab in browser dev tools
- MongoDB connection status
