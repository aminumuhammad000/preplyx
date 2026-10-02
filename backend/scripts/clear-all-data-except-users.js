const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/cbt';

// Collections to strictly preserve
const PRESERVED_COLLECTIONS = new Set(['users', 'wallets']);

async function clearAllDataExceptUsers() {
  console.log('========================================================================');
  console.log('       PREPLYX - DATABASE RESET SCRIPT (PRESERVES USERS & WALLETS)       ');
  console.log('========================================================================\n');

  try {
    console.log(`Connecting to MongoDB at: ${mongoUri}...`);
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB successfully.\n');

    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database handle is undefined.');
    }

    const collections = await db.collections();
    console.log(`Discovered ${collections.length} total collections in database:\n`);

    let totalDeletedCount = 0;

    for (const collection of collections) {
      const colName = collection.collectionName.toLowerCase();

      if (PRESERVED_COLLECTIONS.has(colName)) {
        const count = await collection.countDocuments();
        console.log(`🛡️  PRESERVED: ${collection.collectionName} (${count} documents preserved)`);
      } else {
        const countBefore = await collection.countDocuments();
        if (countBefore > 0) {
          const deleteResult = await collection.deleteMany({});
          const deleted = deleteResult.deletedCount || 0;
          totalDeletedCount += deleted;
          console.log(`🗑️  CLEARED:   ${collection.collectionName} (${deleted} documents removed)`);
        } else {
          console.log(`ℹ️  EMPTY:     ${collection.collectionName} (0 documents)`);
        }
      }
    }

    console.log('\n========================================================================');
    console.log('                         EXECUTION SUMMARY                              ');
    console.log('========================================================================');
    console.log(`Total Old Records Deleted: ${totalDeletedCount}`);
    const userCol = collections.find(c => c.collectionName.toLowerCase() === 'users');
    const userCount = userCol ? await userCol.countDocuments() : 0;
    console.log(`Total User Accounts Kept:  ${userCount}`);
    console.log('All questions, exam sessions, attempts, notifications, and logs have been reset.\n');

  } catch (error) {
    console.error('❌ Error clearing database:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB connection closed.');
    process.exit(0);
  }
}

clearAllDataExceptUsers();
