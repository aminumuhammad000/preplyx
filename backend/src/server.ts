import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

import app from './app';
import { connectDB } from './config/db';
import { getRedisClient } from './config/redis';
import { registerEventHandlers } from './events/eventHandlers';
import { WorkerManager } from './workers/workerManager';
import { AutomationScheduler } from './schedulers/automationScheduler';
import { QueueManager } from './queues/queueManager';

const PORT = process.env.PORT || 5004;

async function startServer() {
  // 1. Connect MongoDB
  await connectDB();

  // 2. Initialize Redis connection
  getRedisClient();

  // 3. Register Event Bus Listeners
  registerEventHandlers();

  // 4. Initialize BullMQ Background Workers
  WorkerManager.initWorkers();

  // 5. Initialize Automated Schedulers (Africa/Lagos)
  await AutomationScheduler.initScheduler();

  const server = app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`🚀 Preplyx Server & Automation Engine running on port ${PORT}`);
    console.log(`🌐 Mode: ${process.env.NODE_ENV || 'development'}`);
    console.log(`⏰ Timezone: ${process.env.APP_TIMEZONE || 'Africa/Lagos'}`);
    console.log(`=======================================================`);
  });

  // Graceful shutdown handling
  const shutdown = async (signal: string) => {
    console.log(`\n[Server] Received ${signal}. Starting graceful shutdown...`);
    server.close(async () => {
      console.log('[Server] HTTP server closed.');
      AutomationScheduler.stopAll();
      await WorkerManager.closeAll();
      await QueueManager.closeAll();
      console.log('[Server] Graceful shutdown completed.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

startServer();
