import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

import Question from '../src/models/Question';
import GeneratedQuiz from '../src/models/GeneratedQuiz';
import DailyChallenge from '../src/models/DailyChallenge';
import DailyChallengeSubmission from '../src/models/DailyChallengeSubmission';
import ExamSession from '../src/models/ExamSession';
import StudentSubjectPerformance from '../src/models/StudentSubjectPerformance';
import StudentTopicPerformance from '../src/models/StudentTopicPerformance';
import StudyRecommendation from '../src/models/StudyRecommendation';
import AdaptiveProfile from '../src/models/AdaptiveProfile';
import CompetitionSubmission from '../src/models/CompetitionSubmission';

interface ScriptOptions {
  exam?: string;
  subject?: string;
  cleanRelated: boolean;
  dryRun: boolean;
  backup: boolean;
}

function parseArgs(): ScriptOptions {
  const args = process.argv.slice(2);
  const options: ScriptOptions = {
    cleanRelated: true, // Clean dependent quiz/session records by default
    dryRun: false,
    backup: true, // Backup questions to JSON before deleting
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--help' || arg === '-h') {
      console.log(`
========================================================================
             PREPLYX - PAST QUESTIONS CLEANUP SCRIPT
========================================================================
Usage:
  npx ts-node scripts/clearDemoQuestions.ts [options]
  or: npm run clear:questions -- [options]

Options:
  --all                   Delete ALL questions (default behavior)
  --exam <NAME>           Delete questions only for a specific exam (e.g. JAMB, WAEC, NECO)
  --subject <NAME>        Delete questions only for a specific subject
  --no-related            Do NOT delete dependent generated quizzes, sessions, or challenges
  --no-backup             Do NOT create a JSON backup before deletion
  --dry-run               Preview matching records without actually deleting anything
  --help, -h              Show this help message

Examples:
  npx ts-node scripts/clearDemoQuestions.ts
  npx ts-node scripts/clearDemoQuestions.ts --exam JAMB
  npx ts-node scripts/clearDemoQuestions.ts --dry-run
  npx ts-node scripts/clearDemoQuestions.ts --no-backup
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
    } else if (arg === '--all') {
      // default
    }
  }

  return options;
}

async function runCleanup() {
  const options = parseArgs();
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/cbt';

  console.log('\n========================================================================');
  console.log('🧹 PREPLYX PAST QUESTIONS CLEANUP SCRIPT');
  console.log('========================================================================');
  console.log(`📍 Connecting to MongoDB: ${mongoUri}`);

  try {
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to database successfully!\n');

    // Build question query filter
    const query: any = {};
    if (options.exam && options.exam !== 'All') {
      query.exam = new RegExp(`^${options.exam}$`, 'i');
    }
    if (options.subject && options.subject !== 'All') {
      query.subject = new RegExp(`^${options.subject}$`, 'i');
    }

    // Inspect existing questions before deletion
    const totalQuestionsInDB = await Question.countDocuments();
    const targetQuestionsCount = await Question.countDocuments(query);

    console.log(`📊 Current Database Status:`);
    console.log(`   • Total questions in DB: ${totalQuestionsInDB}`);
    console.log(`   • Questions targeted for deletion: ${targetQuestionsCount}`);

    if (options.exam) console.log(`   • Exam filter: ${options.exam}`);
    if (options.subject) console.log(`   • Subject filter: ${options.subject}`);

    // Group breakdown of questions in database
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

    // Backup questions if requested and there are questions to backup
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
      if (options.cleanRelated) {
        const [quizzes, sessions, challenges] = await Promise.all([
          GeneratedQuiz.countDocuments(),
          ExamSession.countDocuments(),
          DailyChallenge.countDocuments(),
        ]);
        console.log(`   Would also clean dependent collections:`);
        console.log(`     - Generated Quizzes: ${quizzes}`);
        console.log(`     - Exam Sessions: ${sessions}`);
        console.log(`     - Daily Challenges: ${challenges}`);
      }
      await mongoose.disconnect();
      console.log('\n👋 Dry run finished.');
      process.exit(0);
    }

    // Perform Deletion
    console.log('\n🗑️  Executing deletion...');

    // 1. Delete questions
    if (targetQuestionsCount > 0) {
      const deleteResult = await Question.deleteMany(query);
      console.log(`   ✅ Deleted ${deleteResult.deletedCount} question(s) from 'questions' collection.`);
    } else {
      console.log(`   ℹ️ 'questions' collection had 0 matching records.`);
    }

    // 2. Clean dependent / demo collections if requested
    if (options.cleanRelated && (!options.exam && !options.subject)) {
      console.log('\n🧹 Cleaning dependent demo quiz & session collections...');
      
      const [
        quizzesRes,
        challengesRes,
        challengeSubRes,
        sessionsRes,
        perfSubRes,
        perfTopRes,
        recomRes,
        adaptiveRes,
        compSubRes,
      ] = await Promise.all([
        GeneratedQuiz.deleteMany({}),
        DailyChallenge.deleteMany({}),
        DailyChallengeSubmission.deleteMany({}),
        ExamSession.deleteMany({}),
        StudentSubjectPerformance.deleteMany({}),
        StudentTopicPerformance.deleteMany({}),
        StudyRecommendation.deleteMany({}),
        AdaptiveProfile.deleteMany({}),
        CompetitionSubmission.deleteMany({}),
      ]);

      console.log(`   ✅ Deleted ${quizzesRes.deletedCount} generated quizzes`);
      console.log(`   ✅ Deleted ${challengesRes.deletedCount} daily challenges & ${challengeSubRes.deletedCount} submissions`);
      console.log(`   ✅ Deleted ${sessionsRes.deletedCount} demo exam practice sessions`);
      console.log(`   ✅ Cleared ${perfSubRes.deletedCount + perfTopRes.deletedCount} cached student performance records`);
      console.log(`   ✅ Cleared ${recomRes.deletedCount} AI study recommendations`);
      console.log(`   ✅ Cleared ${adaptiveRes.deletedCount} adaptive profile states`);
      console.log(`   ✅ Cleared ${compSubRes.deletedCount} competition submissions`);
    }

    // Verification
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
