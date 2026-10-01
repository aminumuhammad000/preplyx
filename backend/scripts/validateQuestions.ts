import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

import mongoose from 'mongoose';
import Question from '../src/models/Question';
import { QuestionQualityService } from '../src/services/questionQualityService';

async function validateQuestions() {
  console.log('🔍 ================================================================');
  console.log('🔍 PREPLYX QUESTION QUALITY & INTEGRITY AUDITOR');
  console.log('🔍 ================================================================\n');

  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/cbt';
  try {
    await mongoose.connect(mongoUri);
    console.log(`📦 Connected to MongoDB at ${mongoUri}\n`);
  } catch (err: any) {
    console.error('❌ Could not connect to MongoDB:', err.message);
    console.log('ℹ️  Skipping live database question validation (database offline).');
    process.exit(0);
  }

  try {
    const totalCount = await Question.countDocuments();
    console.log(`Total questions in database: ${totalCount}`);

    if (totalCount === 0) {
      console.log('No questions found in database.');
      await mongoose.disconnect();
      process.exit(0);
    }

    const batchSize = 100;
    let processed = 0;
    let errorCount = 0;
    let warningCount = 0;
    const issues: Array<{ id: string; subject: string; exam: string; text: string; errors: string[]; warnings: string[] }> = [];

    const cursor = Question.find().cursor({ batchSize });

    for await (const q of cursor) {
      processed++;
      const audit = await QuestionQualityService.validateAndAuditQuestion(q, q._id.toString());

      if (!audit.isValid || audit.warnings.length > 0) {
        if (!audit.isValid) errorCount++;
        if (audit.warnings.length > 0) warningCount++;

        issues.push({
          id: q._id.toString(),
          subject: q.subject,
          exam: q.exam,
          text: q.text.substring(0, 60) + '...',
          errors: audit.errors,
          warnings: audit.warnings,
        });
      }
    }

    console.log('\n--- AUDIT SUMMARY ---');
    console.log(`Scanned: ${processed}`);
    console.log(`Valid: ${processed - errorCount}`);
    console.log(`Errors: ${errorCount}`);
    console.log(`Warnings: ${warningCount}`);

    if (issues.length > 0) {
      console.log('\n--- FLAGGED QUESTIONS (Sample up to 10) ---');
      issues.slice(0, 10).forEach((issue, idx) => {
        console.log(`\n#${idx + 1} [ID: ${issue.id}] [${issue.exam} - ${issue.subject}]`);
        console.log(`  Question: "${issue.text}"`);
        if (issue.errors.length > 0) {
          console.log(`  ❌ Errors: ${issue.errors.join('; ')}`);
        }
        if (issue.warnings.length > 0) {
          console.log(`  ⚠️ Warnings: ${issue.warnings.join('; ')}`);
        }
      });
    }

    await mongoose.disconnect();

    if (errorCount > 0) {
      console.log('\n❌ Question validation completed with integrity errors.');
      process.exit(1);
    } else {
      console.log('\n✅ All questions passed integrity validation.');
      process.exit(0);
    }
  } catch (error: any) {
    console.error('Fatal error during question validation:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

validateQuestions();
