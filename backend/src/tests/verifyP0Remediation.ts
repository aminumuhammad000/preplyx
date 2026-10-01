import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import mongoose from 'mongoose';

// Import controllers and models
import { getQuestions } from '../controllers/questionController';
import { submitSession } from '../controllers/examSessionController';
import { explainWhyWrong } from '../controllers/mistakeController';
import { submitQuestionReport } from '../controllers/questionReportController';
import Question from '../models/Question';
import ExamSession from '../models/ExamSession';
import QuestionReport from '../models/QuestionReport';

async function runVerification() {
  console.log('🛡️ ================================================================');
  console.log('🛡️ PREPLYX P0 LAUNCH-BLOCKER REMEDIATION VERIFICATION SUITE');
  console.log('🛡️ ================================================================\n');

  let passed = 0;
  let failed = 0;

  function record(condition: boolean, title: string, details?: any) {
    if (condition) {
      console.log(`  ✅ PASS: ${title}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${title}`);
      if (details) console.error('     Detail:', details);
      failed++;
    }
  }

  // --------------------------------------------------------------------------
  // TEST 1: P0-01 - Answer Leakage in Question API Projection
  // --------------------------------------------------------------------------
  console.log('\n--- 1. P0-01: Question API Answer Leakage Prevention ---');
  try {
    let capturedPipeline: any = null;
    const origAggregate = Question.aggregate;
    // Intercept Question.aggregate to verify the projection stage
    (Question as any).aggregate = function (pipeline: any[]) {
      capturedPipeline = pipeline;
      return Promise.resolve([
        {
          _id: new mongoose.Types.ObjectId(),
          text: 'What is the SI unit of force?',
          options: ['Newton', 'Joule', 'Watt', 'Pascal'],
          exam: 'JAMB',
          subject: 'Physics',
        },
      ]);
    };

    let responseData: any = null;
    const mockReq: any = { query: { exam: 'JAMB', subject: 'Physics' } };
    const mockRes: any = {
      json: (data: any) => {
        responseData = data;
      },
    };
    const mockNext = (err: any) => {
      if (err) throw err;
    };

    await getQuestions(mockReq, mockRes, mockNext);

    // Restore original aggregate
    Question.aggregate = origAggregate;

    const projectStage = capturedPipeline?.find((stage: any) => stage.$project);
    record(!!projectStage, 'Aggregation pipeline contains an explicit $project stage');

    const projectedFields = projectStage?.$project || {};
    const hasForbiddenFields =
      'correctAnswer' in projectedFields ||
      'explanation' in projectedFields ||
      'cognitiveTrap' in projectedFields ||
      'conceptSummary' in projectedFields;

    record(
      !hasForbiddenFields,
      'Projection EXCLUDES correctAnswer, explanation, cognitiveTrap, conceptSummary'
    );
    record(projectedFields._id === 1 && projectedFields.text === 1 && projectedFields.options === 1,
      'Projection INCLUDES safe fields (_id, text, options)'
    );

    record(
      responseData &&
        responseData[0].correctAnswer === undefined &&
        responseData[0].explanation === undefined,
      'Response payload does NOT contain correctAnswer or explanation'
    );
  } catch (err: any) {
    record(false, 'P0-01 verification encountered error', err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 2: P0-02 - Authoritative Server-Side Grading & Score Forgery Prevention
  // --------------------------------------------------------------------------
  console.log('\n--- 2. P0-02: Server-Side Grading & Score Forgery Prevention ---');
  try {
    const student1Id = new mongoose.Types.ObjectId();
    const student2Id = new mongoose.Types.ObjectId();
    const testQuestionId = new mongoose.Types.ObjectId();

    // Mock Question.find
    const origQFind = Question.find;
    (Question as any).find = function () {
      return Promise.resolve([
        {
          _id: testQuestionId,
          text: 'What is the SI unit of force?',
          options: ['Newton', 'Joule', 'Watt', 'Pascal'],
          correctAnswer: 'Newton',
          explanation: 'The SI unit of force is the Newton.',
          exam: 'JAMB',
          subject: 'Physics',
          topic: 'Mechanics',
        },
      ]);
    };

    // Sub-test 2A: Score Forgery Override
    let mockSessionObj: any = {
      _id: new mongoose.Types.ObjectId(),
      user: student1Id,
      exam: 'JAMB',
      subject: 'Physics',
      status: 'in_progress',
      questionIds: [testQuestionId.toString()],
      save: async function () {
        return this;
      },
    };

    const origSessionFindById = ExamSession.findById;
    (ExamSession as any).findById = function (id: any) {
      return Promise.resolve(mockSessionObj);
    };

    let responseStatus: number = 200;
    let responseBody: any = null;
    const mockRes2A: any = {
      status: (code: number) => {
        responseStatus = code;
        return mockRes2A;
      },
      json: (data: any) => {
        responseBody = data;
      },
    };

    // Malicious student payload: submits wrong answer 'Joule' but claims score = 100
    const maliciousReq: any = {
      user: { _id: student1Id },
      body: {
        sessionId: mockSessionObj._id.toString(),
        score: 100, // FORGED
        percentage: 100, // FORGED
        correctCount: 100, // FORGED
        answers: [
          {
            questionId: testQuestionId.toString(),
            selectedAnswer: 'Joule', // WRONG (correct is 'Newton')
          },
        ],
      },
      params: {},
    };

    await submitSession(maliciousReq, mockRes2A, (e: any) => { if (e) throw e; });

    record(responseStatus === 201, 'Graded session returned 201 Created');
    record(responseBody?.score === 0, 'Server OVERRODE forged score: 0 instead of 100');
    record(responseBody?.percentage === 0, 'Server OVERRODE forged percentage: 0% instead of 100%');
    record(responseBody?.correctCount === 0, 'Authoritative correctCount = 0');
    record(responseBody?.incorrectCount === 1, 'Authoritative incorrectCount = 1');
    record(mockSessionObj.status === 'completed', 'Session status set to "completed" in database');

    // Sub-test 2B: Session Ownership (403 Forbidden)
    let ownershipStatus = 0;
    let ownershipBody: any = null;
    const mockRes2B: any = {
      status: (code: number) => {
        ownershipStatus = code;
        return mockRes2B;
      },
      json: (data: any) => {
        ownershipBody = data;
      },
    };

    const hijackReq: any = {
      user: { _id: student2Id }, // Student 2 attempts to submit Student 1's session
      body: {
        sessionId: mockSessionObj._id.toString(),
        answers: [{ questionId: testQuestionId.toString(), selectedAnswer: 'Newton' }],
      },
      params: {},
    };

    await submitSession(hijackReq, mockRes2B, (e: any) => { if (e) throw e; });
    record(ownershipStatus === 403, 'Session hijacking attempt rejected with 403 Forbidden');

    // Sub-test 2C: Double Submission Idempotency
    mockSessionObj.status = 'completed';
    mockSessionObj.score = 0;
    mockSessionObj.percentage = 0;

    let idempStatus = 200;
    let idempBody: any = null;
    const mockRes2C: any = {
      status: (code: number) => {
        idempStatus = code;
        return mockRes2C;
      },
      json: (data: any) => {
        idempBody = data;
      },
    };

    const doubleReq: any = {
      user: { _id: student1Id },
      body: {
        sessionId: mockSessionObj._id.toString(),
        answers: [{ questionId: testQuestionId.toString(), selectedAnswer: 'Newton' }],
      },
      params: {},
    };

    await submitSession(doubleReq, mockRes2C, (e: any) => { if (e) throw e; });
    record(idempStatus === 200, 'Duplicate submission returns 200 OK (idempotent)');
    record(idempBody?.message === 'Exam session already graded', 'Returns existing session without regrading');

    // Restore original methods
    Question.find = origQFind;
    ExamSession.findById = origSessionFindById;
  } catch (err: any) {
    record(false, 'P0-02 verification encountered error', err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 3: P0-03 - "Why Was My Answer Wrong?" Contract & Resilience
  // --------------------------------------------------------------------------
  console.log('\n--- 3. P0-03: "Why Was My Answer Wrong?" Contract ---');
  try {
    const testQId = new mongoose.Types.ObjectId();
    const origQFindById = Question.findById;
    (Question as any).findById = function () {
      return Promise.resolve({
        _id: testQId,
        text: 'What is the SI unit of force?',
        options: ['Newton', 'Joule', 'Watt', 'Pascal'],
        correctAnswer: 'Newton',
        explanation: 'Force is measured in Newtons (N = kg*m/s^2).',
        cognitiveTrap: 'Confusing force with energy (Joule) or power (Watt).',
        conceptSummary: 'Newton is the SI unit of force.',
      });
    };

    let whyStatus = 200;
    let whyBody: any = null;
    const mockRes3: any = {
      status: (code: number) => {
        whyStatus = code;
        return mockRes3;
      },
      json: (data: any) => {
        whyBody = data;
      },
    };

    const whyReq: any = {
      user: { _id: new mongoose.Types.ObjectId() },
      body: {
        questionId: testQId.toString(),
        selectedAnswer: 'Joule',
      },
    };

    await explainWhyWrong(whyReq, mockRes3);

    record(whyStatus === 200, 'POST /api/mistakes/why-wrong returns 200 OK');
    record(whyBody?.success === true, 'Response contains success: true');
    record(whyBody?.data !== undefined, 'Response contains data object');
    record(whyBody?.data?.correctAnswer === 'Newton', 'data.correctAnswer matches authoritative key');
    record(typeof whyBody?.data?.whySelectedIsIncorrect === 'string', 'data.whySelectedIsIncorrect is string');
    record(typeof whyBody?.data?.whySelectedIsTempting === 'string', 'data.whySelectedIsTempting is string');
    record(typeof whyBody?.data?.relevantConcept === 'string', 'data.relevantConcept is string');
    record(typeof whyBody?.data?.correctReasoning === 'string', 'data.correctReasoning is string');

    // Restore
    Question.findById = origQFindById;
  } catch (err: any) {
    record(false, 'P0-03 verification encountered error', err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 4: P0-04 - Question Reporting Contract & Admin Authorization
  // --------------------------------------------------------------------------
  console.log('\n--- 4. P0-04: Question Reporting & Admin Access Control ---');
  try {
    const studentUserId = new mongoose.Types.ObjectId();

    // Sub-test 4A: Normalizing aliased fields (issueType -> reportType, description -> userNotes)
    let savedReportData: any = null;
    const origReportCreate = QuestionReport.create;
    (QuestionReport as any).create = async function (data: any) {
      savedReportData = data;
      return { _id: new mongoose.Types.ObjectId(), ...data };
    };

    const origReportFindOne = QuestionReport.findOne;
    (QuestionReport as any).findOne = function () {
      return Promise.resolve(null);
    };

    const origQFindById = Question.findById;
    (Question as any).findById = function () {
      return Promise.resolve({
        text: 'What is the SI unit of force?',
        exam: 'JAMB',
        subject: 'Physics',
      });
    };

    let reportStatus = 200;
    let reportBody: any = null;
    const mockRes4: any = {
      status: (code: number) => {
        reportStatus = code;
        return mockRes4;
      },
      json: (data: any) => {
        reportBody = data;
      },
    };

    const aliasedReq: any = {
      user: { _id: studentUserId },
      body: {
        questionId: new mongoose.Types.ObjectId().toString(),
        questionText: 'What is the SI unit of force?',
        exam: 'JAMB',
        subject: 'Physics',
        issueType: 'wrong_answer', // Aliased input
        description: 'Option B should be Newton', // Aliased input
      },
    };

    await submitQuestionReport(aliasedReq, mockRes4);

    record(reportStatus === 201, 'Student successfully created report (201 Created)');
    record(savedReportData?.reportType === 'wrong_answer', 'Normalized issueType -> reportType');
    record(savedReportData?.userNotes === 'Option B should be Newton', 'Normalized description -> userNotes');
    record(savedReportData?.user?.toString() === studentUserId.toString(), 'Automatically bound to req.user._id');

    // Sub-test 4B: Validation failure on missing reportType
    let badStatus = 200;
    let badBody: any = null;
    const mockRes4B: any = {
      status: (code: number) => {
        badStatus = code;
        return mockRes4B;
      },
      json: (data: any) => {
        badBody = data;
      },
    };

    const invalidReq: any = {
      user: { _id: studentUserId },
      body: {
        questionId: new mongoose.Types.ObjectId().toString(),
      },
    };

    await submitQuestionReport(invalidReq, mockRes4B);
    record(badStatus === 400, 'Missing reportType rejected with 400 Bad Request');

    // Sub-test 4C: Inspect questionReportRoutes.ts for adminOnly middleware
    const routeFilePath = path.resolve(__dirname, '../routes/questionReportRoutes.ts');
    const routeContent = fs.readFileSync(routeFilePath, 'utf-8');

    const hasAdminOnlyImport = routeContent.includes("adminOnly");
    const hasAdminOnlyOnGet = routeContent.includes("router.get('/', protect, adminOnly, getQuestionReports)");
    const hasAdminOnlyOnPut = routeContent.includes("router.put('/:id/status', protect, adminOnly, updateQuestionReportStatus)");

    record(hasAdminOnlyImport, 'questionReportRoutes imports adminOnly middleware');
    record(hasAdminOnlyOnGet, 'GET /api/question-reports is protected with adminOnly');
    record(hasAdminOnlyOnPut, 'PUT /api/question-reports/:id/status is protected with adminOnly');

    // Restore
    QuestionReport.create = origReportCreate;
    QuestionReport.findOne = origReportFindOne;
    Question.findById = origQFindById;
  } catch (err: any) {
    record(false, 'P0-04 verification encountered error', err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 5: P0-05 - Autosave, Session Resumption & Submission Retry
  // --------------------------------------------------------------------------
  console.log('\n--- 5. P0-05: Autosave, Session Resumption & Retry Logic ---');
  try {
    const cbtFilePath = path.resolve(__dirname, '../../../preplyx/src/pages/CbtExamRunner.tsx');
    const cbtContent = fs.readFileSync(cbtFilePath, 'utf-8');

    // Check 5A: verify clearActiveSession is NOT called on unmount
    const hasUnmountClear = /return\s*\(\)\s*=>\s*\{[^}]*clearActiveSession\(\)/.test(cbtContent);
    record(!hasUnmountClear, 'CbtExamRunner does NOT clear active session on component unmount');

    // Check 5B: verify Resume Exam prompt exists
    const hasResumePrompt = cbtContent.includes('Resume Unfinished Exam') || cbtContent.includes('showResumeModal');
    record(hasResumePrompt, 'CbtExamRunner includes "Resume Unfinished Exam" prompt modal');

    // Check 5C: verify submission error retains answers and provides retry
    const hasRetryUi = cbtContent.includes('submitError') && cbtContent.includes('Retry Submission');
    record(hasRetryUi, 'CbtExamRunner preserves answers on submission failure and provides retry UI');

    // Check 5D: verify storage.ts has sessionId and confidences
    const storageFilePath = path.resolve(__dirname, '../../../preplyx/src/lib/storage.ts');
    const storageContent = fs.readFileSync(storageFilePath, 'utf-8');
    const hasStorageSessionId = storageContent.includes('sessionId?: string;') && storageContent.includes('confidences?:');
    record(hasStorageSessionId, 'storage.ts includes sessionId and confidences in session data types');
  } catch (err: any) {
    record(false, 'P0-05 verification encountered error', err.message);
  }

  console.log('\n================================================================');
  console.log(`P0 VERIFICATION RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runVerification().catch((err) => {
  console.error('P0 Verification Fatal Error:', err);
  process.exit(1);
});
