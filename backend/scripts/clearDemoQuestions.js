const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

// Define schemas inline or require models
const questionSchema = new mongoose.Schema(
  {
    exam: { type: String, required: true },
    subject: { type: String, required: true },
    topic: { type: String, default: 'General' },
    year: { type: String, default: '2024' },
    difficulty: { type: String, default: 'medium' },
    status: { type: String, default: 'published' },
    text: { type: String, required: true },
    options: [{ type: String, required: true }],
    correctAnswer: { type: String, required: true },
    explanation: { type: String },
    qualityFlags: [{ type: String }],
  },
  { timestamps: true }
);

const Question = mongoose.models.Question || mongoose.model('Question', questionSchema);

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    cleanRelated: true,
    dryRun: false,
    backup: true,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--help' || arg === '-h') {
      console.log(`
========================================================================
             PREPLYX - PAST QUESTIONS CLEANUP SCRIPT (JS)
========================================================================
Usage:
  node scripts/clearDemoQuestions.js [options]

Options:
  --all                   Delete ALL questions (default behavior)
  --exam <NAME>           Delete questions only for a specific exam (e.g. JAMB, WAEC, NECO)
  --subject <NAME>        Delete questions only for a specific subject
  --no-related            Do NOT delete dependent generated quizzes, sessions, or challenges
  --no-backup             Do NOT create a JSON backup before deletion
  --dry-run               Preview matching records without actually deleting anything
  --help, -h              Show this help message
========================================================================
      `);
      process.exit(0);
    } else if (arg === '--exam' && args[i + 1]) {
      options.exam = args[++i];
    } else if (arg === '--subject' && args[i + 1]) {
      options.subject = args[++i];
    } else if (arg === '--no-related') {
      options.cleanRelated = false;
    } else if (arg === '--no-backup') {
      options.backup = false;
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    }
  }

  return options;
}

async function runCleanup() {
  const options = parseArgs();
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/cbt';

  console.log('\n========================================================================');
  console.log('🧹 PREPLYX PAST QUESTIONS CLEANUP SCRIPT (Node.js)');
  console.log('========================================================================');
  console.log(`📍 Connecting to MongoDB: ${mongoUri}`);

  try {
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to database successfully!\n');

    const query = {};
    if (options.exam && options.exam !== 'All') {
      query.exam = new RegExp(`^${options.exam}$`, 'i');
    }
    if (options.subject && options.subject !== 'All') {
      query.subject = new RegExp(`^${options.subject}$`, 'i');
    }

    const totalQuestionsInDB = await Question.countDocuments();
    const targetQuestionsCount = await Question.countDocuments(query);

    console.log(`📊 Current Database Status:`);
    console.log(`   • Total questions in DB: ${totalQuestionsInDB}`);
    console.log(`   • Questions targeted for deletion: ${targetQuestionsCount}`);

    if (options.exam) console.log(`   • Exam filter: ${options.exam}`);
    if (options.subject) console.log(`   • Subject filter: ${options.subject}`);

    const breakdown = await Question.aggregate([
      {
        $group: {
          _id: { exam: '$exam', subject: '$subject' },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.exam': 1, '_id.subject': 1 } },
    ]);

    if (breakdown.length > 0) {
      console.log('\n📋 Breakdown of questions found in database:');
      breakdown.forEach((item) => {
        console.log(
          `   - [${item._id.exam || 'Unknown'}] ${item._id.subject || 'General'}: ${item.count} question(s)`
        );
      });
    }

    if (targetQuestionsCount === 0) {
      console.log('\n⚠️  No questions matched the criteria. (Question collection is empty).');
    }

    if (options.backup && targetQuestionsCount > 0 && !options.dryRun) {
      const backupDir = path.resolve(__dirname, '../data/backups');
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      const timestamp = new Date()
        .toISOString()
        .replace(/[:.]/g, '-')
        .replace('T', '_')
        .split('.')[0];
      const backupFilePath = path.join(
        backupDir,
        `questions_backup_${timestamp}.json`
      );

      console.log(`\n💾 Creating backup of questions before deletion...`);
      const questionsToBackup = await Question.find(query).lean();
      fs.writeFileSync(
        backupFilePath,
        JSON.stringify(questionsToBackup, null, 2),
        'utf-8'
      );
      console.log(`   ✅ Backed up ${questionsToBackup.length} questions to:`);
      console.log(`      📁 ${backupFilePath}`);
    }

    if (options.dryRun) {
      console.log('\n🔍 [DRY-RUN MODE] No changes have been made to the database.');
      console.log(`   Would delete ${targetQuestionsCount} questions.`);
      await mongoose.disconnect();
      console.log('\n👋 Dry run finished.');
      process.exit(0);
    }

    console.log('\n🗑️  Executing deletion...');
    if (targetQuestionsCount > 0) {
      const deleteResult = await Question.deleteMany(query);
      console.log(`   ✅ Deleted ${deleteResult.deletedCount} question(s) from 'questions' collection.`);
    }

    if (options.cleanRelated && (!options.exam && !options.subject)) {
      console.log('\n🧹 Cleaning dependent demo quiz & session collections...');
      const db = mongoose.connection.db;
      const collectionsToClean = [
        'generatedquizzes',
        'dailychallenges',
        'dailychallengesubmissions',
        'examsessions',
        'studentsubjectperformances',
        'studenttopicperformances',
        'studyrecommendations',
        'adaptiveprofiles',
        'competitionsubmissions',
      ];

      for (const colName of collectionsToClean) {
        try {
          const res = await db.collection(colName).deleteMany({});
          console.log(`   ✅ Cleared ${res.deletedCount} documents from '${colName}'`);
        } catch (e) {
          // ignore if collection doesn't exist
        }
      }
    }

    const remainingCount = await Question.countDocuments();
    console.log('\n========================================================================');
    console.log('🎉 CLEANUP COMPLETED SUCCESSFULLY!');
    console.log('========================================================================');
    console.log(`✨ Remaining questions in database: ${remainingCount}`);
    console.log('🚀 Your server is now completely ready for adding fresh real past questions!');
    console.log('========================================================================\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error during cleanup:', error);
    process.exit(1);
  }
}

runCleanup();
