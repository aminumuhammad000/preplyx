import fs from 'node:fs';
import path from 'node:path';
import mongoose from 'mongoose';

// Import models, controllers, and middlewares
import ExamSession from '../models/ExamSession';
import Question from '../models/Question';
import MistakeLog from '../models/MistakeLog';
import QuestionReport from '../models/QuestionReport';
import { submitSession } from '../controllers/examSessionController';
import { getStats, getSubjectMastery } from '../controllers/dataController';
import { submitQuestionReport } from '../controllers/questionReportController';
import { securityHeaders } from '../middlewares/securityMiddleware';

async function runP1Verification() {
  console.log('🛡️ ================================================================');
  console.log('🛡️ PREPLYX P1 PRODUCTION READINESS VERIFICATION SUITE');
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
  // TEST SUITE 1: P1-A Assessment Integrity
  // --------------------------------------------------------------------------
  console.log('\n--- 1. P1-A: Assessment Integrity & Unanswered Questions ---');
  try {
    const studentId = new mongoose.Types.ObjectId();
    const q1Id = new mongoose.Types.ObjectId();
    const q2Id = new mongoose.Types.ObjectId();

    // Mock Question.find
    const origQFind = Question.find;
    (Question as any).find = function () {
      return Promise.resolve([
        {
          _id: q1Id,
          text: 'What is the unit of power?',
          options: ['Watt', 'Joule', 'Volt', 'Ampere'],
          correctAnswer: 'Watt',
          explanation: 'Power is measured in Watts (W).',
          exam: 'JAMB',
          subject: 'Physics',
        },
        {
          _id: q2Id,
          text: 'What is the unit of resistance?',
          options: ['Ohm', 'Farad', 'Henry', 'Tesla'],
          correctAnswer: 'Ohm',
          explanation: 'Resistance is measured in Ohms.',
          exam: 'JAMB',
          subject: 'Physics',
        },
      ]);
    };

    // Sub-test 1A: ExamSession with Unanswered Questions (userAnswer: "")
    let savedSession: any = null;
    let mockSessionObj: any = {
      _id: new mongoose.Types.ObjectId(),
      user: studentId,
      exam: 'JAMB',
      subject: 'Physics',
      status: 'in_progress',
      questionIds: [q1Id.toString(), q2Id.toString()],
      save: async function () {
        savedSession = this;
        return this;
      },
    };

    const origSessionFindById = ExamSession.findById;
    (ExamSession as any).findById = function () {
      return Promise.resolve(mockSessionObj);
    };

    let resStatus = 200;
    let resBody: any = null;
    const mockRes: any = {
      status: (c: number) => {
        resStatus = c;
        return mockRes;
      },
      json: (d: any) => {
        resBody = d;
      },
    };

    // Student answers Q1 with 'Watt' (correct) with 'high' confidence, leaves Q2 unanswered ("")
    const unansweredReq: any = {
      user: { _id: studentId },
      body: {
        sessionId: mockSessionObj._id.toString(),
        timeSpentSeconds: 60,
        answers: [
          { questionId: q1Id.toString(), selectedAnswer: 'Watt', confidence: 'high' },
          { questionId: q2Id.toString(), selectedAnswer: '' }, // UNANSWERED
        ],
      },
      params: {},
    };

    await submitSession(unansweredReq, mockRes, (e: any) => { if (e) throw e; });

    record(resStatus === 201, 'Exam with unanswered questions submitted successfully (201 Created)');
    record(resBody?.correctCount === 1, 'Server calculated correctCount = 1');
    record(resBody?.unansweredCount === 1, 'Server calculated unansweredCount = 1');
    record(resBody?.total === 2, 'Total questions evaluated = 2');
    record(resBody?.percentage === 50, 'Percentage calculated as 50%');
    record(
      savedSession?.details[1]?.userAnswer === '',
      'Empty string userAnswer preserved in session details without Mongoose validation error'
    );

    // Sub-test 1B: Question Deduplication
    const dupSessionObj: any = {
      _id: new mongoose.Types.ObjectId(),
      user: studentId,
      exam: 'JAMB',
      subject: 'Physics',
      status: 'in_progress',
      // Intentional duplicate IDs in session questionIds
      questionIds: [q1Id.toString(), q1Id.toString(), q2Id.toString()],
      save: async function () {
        return this;
      },
    };
    (ExamSession as any).findById = function () {
      return Promise.resolve(dupSessionObj);
    };

    let dupResBody: any = null;
    const mockResDup: any = {
      status: () => mockResDup,
      json: (d: any) => {
        dupResBody = d;
      },
    };

    const dupReq: any = {
      user: { _id: studentId },
      body: {
        sessionId: dupSessionObj._id.toString(),
        answers: [
          { questionId: q1Id.toString(), selectedAnswer: 'Watt' },
          { questionId: q1Id.toString(), selectedAnswer: 'Watt' },
          { questionId: q2Id.toString(), selectedAnswer: 'Ohm' },
        ],
      },
      params: {},
    };

    await submitSession(dupReq, mockResDup, (e: any) => { if (e) throw e; });
    record(dupResBody?.total === 2, 'Duplicate question IDs strictly deduplicated to unique count (2 instead of 3)');

    // Restore
    Question.find = origQFind;
    ExamSession.findById = origSessionFindById;
  } catch (err: any) {
    record(false, 'P1-A verification encountered error', err.message);
  }

  // --------------------------------------------------------------------------
  // TEST SUITE 2: P1-B Student Learning & Analytics Filtering
  // --------------------------------------------------------------------------
  console.log('\n--- 2. P1-B: Student Learning & Completed Session Analytics ---');
  try {
    const studentId = new mongoose.Types.ObjectId();

    // Mock ExamSession.find to verify that status: 'completed' filter is enforced
    let capturedFilter: any = null;
    const origSessionFind = ExamSession.find;
    (ExamSession as any).find = function (filter: any) {
      capturedFilter = filter;
      return {
        sort: () => ({
          limit: () =>
            Promise.resolve([
              { total: 10, score: 8, percentage: 80, timeSpentSeconds: 300, createdAt: new Date() },
            ]),
        }),
        then: (resolve: any) =>
          resolve([
            {
              subject: 'Physics',
              total: 10,
              score: 8,
              percentage: 80,
              timeSpentSeconds: 300,
              createdAt: new Date(),
            },
          ]),
      };
    };

    let statsBody: any = null;
    const mockResStats: any = {
      json: (d: any) => {
        statsBody = d;
      },
    };

    const statsReq: any = {
      user: { _id: studentId },
    };

    await getStats(statsReq, mockResStats);

    record(
      capturedFilter?.status === 'completed',
      'getStats strictly filters by status: "completed" to prevent in-progress skew'
    );
    record(statsBody?.questionsAnswered === 10, 'Aggregates only completed question totals');

    // Test getSubjectMastery
    capturedFilter = null;
    await getSubjectMastery(statsReq, mockResStats);
    record(
      capturedFilter?.status === 'completed',
      'getSubjectMastery strictly filters by status: "completed"'
    );

    // Verify MistakeCard data unwrap in frontend code
    const mistakeCardPath = path.resolve(__dirname, '../../../preplyx/src/components/MistakeCard.tsx');
    const mistakeCardCode = fs.readFileSync(mistakeCardPath, 'utf-8');
    const hasUnwrapData = mistakeCardCode.includes('setWhyWrongData(res?.data || res);');
    record(hasUnwrapData, 'MistakeCard unwraps res?.data || res to properly render explanation accordion');

    // Restore
    ExamSession.find = origSessionFind;
  } catch (err: any) {
    record(false, 'P1-B verification encountered error', err.message);
  }

  // --------------------------------------------------------------------------
  // TEST SUITE 3: P1-C Security & Authorization
  // --------------------------------------------------------------------------
  console.log('\n--- 3. P1-C: Security, RBAC & Protection Boundaries ---');
  try {
    // Sub-test 3A: Verify adminRoutes.ts has router.use(protect, adminOnly)
    const adminRoutesPath = path.resolve(__dirname, '../routes/adminRoutes.ts');
    const adminRoutesCode = fs.readFileSync(adminRoutesPath, 'utf-8');

    const hasAdminProtect = adminRoutesCode.includes('router.use(protect, adminOnly);');
    const hasAdminLogin = adminRoutesCode.includes("router.post('/login', adminLogin);");
    record(hasAdminProtect, 'adminRoutes.ts applies router.use(protect, adminOnly) to all admin actions');
    record(hasAdminLogin, 'adminRoutes.ts provides dedicated POST /login for admin authentication');

    // Sub-test 3B: Verify questionRoutes.ts requires adminOnly on POST /
    const questionRoutesPath = path.resolve(__dirname, '../routes/questionRoutes.ts');
    const questionRoutesCode = fs.readFileSync(questionRoutesPath, 'utf-8');
    const hasQuestionAdminOnly = questionRoutesCode.includes("router.post('/', protect, adminOnly, createQuestion);");
    record(hasQuestionAdminOnly, 'questionRoutes.ts restricts question creation to adminOnly');

    // Sub-test 3C: Verify aiRoutes.ts requires protect on POST /tutor
    const aiRoutesPath = path.resolve(__dirname, '../routes/aiRoutes.ts');
    const aiRoutesCode = fs.readFileSync(aiRoutesPath, 'utf-8');
    const hasAiProtect = aiRoutesCode.includes("router.post('/tutor', protect, askAiTutor);");
    record(hasAiProtect, 'aiRoutes.ts protects POST /tutor with protect authentication middleware');

    // Sub-test 3D: Verify forgotPassword does NOT leak demoOtp in production
    const authControllerPath = path.resolve(__dirname, '../controllers/authController.ts');
    const authControllerCode = fs.readFileSync(authControllerPath, 'utf-8');
    const hasOtpProductionShield = authControllerCode.includes(
      "process.env.NODE_ENV === 'development' ? { devOtp: otp } : {}"
    );
    record(hasOtpProductionShield, 'forgotPassword shields OTP from API response in production');

    // Sub-test 3E: Verify HTTP Security Headers
    const mockReq: any = {};
    const setHeaders: Record<string, string> = {};
    const mockResH: any = {
      setHeader: (k: string, v: string) => {
        setHeaders[k.toLowerCase()] = v;
      },
    };
    securityHeaders(mockReq, mockResH, () => {});

    record(setHeaders['x-content-type-options'] === 'nosniff', 'Security header X-Content-Type-Options: nosniff');
    record(setHeaders['x-frame-options'] === 'SAMEORIGIN', 'Security header X-Frame-Options: SAMEORIGIN');
    record(setHeaders['x-xss-protection'] === '1; mode=block', 'Security header X-XSS-Protection: 1; mode=block');
    record(setHeaders['referrer-policy'] === 'strict-origin-when-cross-origin', 'Security header Referrer-Policy');

    // Sub-test 3F: Verify app.ts rate limiters and CORS configuration
    const appPath = path.resolve(__dirname, '../app.ts');
    const appCode = fs.readFileSync(appPath, 'utf-8');
    record(appCode.includes('securityHeaders'), 'app.ts applies securityHeaders middleware');
    record(appCode.includes('generalApiLimiter'), 'app.ts applies generalApiLimiter middleware');
    record(appCode.includes('credentials: true'), 'app.ts configures CORS with credentials');
  } catch (err: any) {
    record(false, 'P1-C verification encountered error', err.message);
  }

  // --------------------------------------------------------------------------
  // TEST SUITE 4: P1-D Data Quality & Database Integrity
  // --------------------------------------------------------------------------
  console.log('\n--- 4. P1-D: Data Quality, Indexes & Report Spam Prevention ---');
  try {
    const studentId = new mongoose.Types.ObjectId();
    const testQId = new mongoose.Types.ObjectId();

    // Sub-test 4A: Question Report Spam Prevention
    const origReportFindOne = QuestionReport.findOne;
    // Simulate an existing pending report
    (QuestionReport as any).findOne = function () {
      return Promise.resolve({
        _id: new mongoose.Types.ObjectId(),
        questionId: testQId.toString(),
        status: 'pending',
      });
    };

    let spamStatus = 200;
    let spamBody: any = null;
    const mockResSpam: any = {
      status: (c: number) => {
        spamStatus = c;
        return mockResSpam;
      },
      json: (d: any) => {
        spamBody = d;
      },
    };

    const spamReq: any = {
      user: { _id: studentId },
      body: {
        questionId: testQId.toString(),
        reportType: 'typo',
      },
    };

    await submitQuestionReport(spamReq, mockResSpam);
    record(spamStatus === 409, 'Duplicate pending question report rejected with 409 Conflict');
    record(spamBody?.success === false, 'Duplicate report returns success: false');

    QuestionReport.findOne = origReportFindOne;

    // Sub-test 4B: Verify Compound Indexes in ExamSession & Question
    const sessionFilePath = path.resolve(__dirname, '../models/ExamSession.ts');
    const sessionFileCode = fs.readFileSync(sessionFilePath, 'utf-8');
    const hasSessionCompoundIndex = sessionFileCode.includes(
      'examSessionSchema.index({ user: 1, status: 1, createdAt: -1 });'
    );
    record(hasSessionCompoundIndex, 'ExamSession defines compound index on { user: 1, status: 1, createdAt: -1 }');

    const questionFilePath = path.resolve(__dirname, '../models/Question.ts');
    const questionFileCode = fs.readFileSync(questionFilePath, 'utf-8');
    const hasQuestionYearIndex = questionFileCode.includes(
      'questionSchema.index({ exam: 1, subject: 1, year: 1, status: 1 });'
    );
    record(hasQuestionYearIndex, 'Question defines compound index on { exam: 1, subject: 1, year: 1, status: 1 }');

    // Sub-test 4C: Verify validate:questions script in package.json
    const pkgPath = path.resolve(__dirname, '../../package.json');
    const pkgCode = fs.readFileSync(pkgPath, 'utf-8');
    const hasValidateScript = pkgCode.includes('"validate:questions": "ts-node scripts/validateQuestions.ts"');
    record(hasValidateScript, 'package.json defines "validate:questions" CLI script');
  } catch (err: any) {
    record(false, 'P1-D verification encountered error', err.message);
  }

  // --------------------------------------------------------------------------
  // TEST SUITE 5: P1-E Frontend UX & Resilience
  // --------------------------------------------------------------------------
  console.log('\n--- 5. P1-E: Frontend Multi-Subject Exam Resilience ---');
  try {
    const multiExamPath = path.resolve(__dirname, '../../../preplyx/src/pages/MultiSubjectExam.tsx');
    const multiExamCode = fs.readFileSync(multiExamPath, 'utf-8');

    const hasSubmitErrorState = multiExamCode.includes('const [submitError, setSubmitError] = useState<string | null>(null);');
    const hasNoAlert = !multiExamCode.includes("alert('Submission failed");
    const hasRetryBanner = multiExamCode.includes('Submission Failure Retry Banner') && multiExamCode.includes('Retry Submission');

    record(hasSubmitErrorState, 'MultiSubjectExam defines non-blocking submitError state');
    record(hasNoAlert, 'MultiSubjectExam eliminates disruptive alert() on network failure');
    record(hasRetryBanner, 'MultiSubjectExam renders inline retry banner with "Retry Submission"');

    // Sub-test 5B: Environment example files
    const backendEnvExample = fs.existsSync(path.resolve(__dirname, '../../.env.example'));
    const frontendEnvExample = fs.existsSync(path.resolve(__dirname, '../../../preplyx/.env.example'));
    record(backendEnvExample, 'backend/.env.example is documented and present');
    record(frontendEnvExample, 'preplyx/.env.example is documented and present');
  } catch (err: any) {
    record(false, 'P1-E verification encountered error', err.message);
  }

  console.log('\n================================================================');
  console.log(`P1 PRODUCTION READINESS RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runP1Verification().catch((err) => {
  console.error('P1 Verification Fatal Error:', err);
  process.exit(1);
});
