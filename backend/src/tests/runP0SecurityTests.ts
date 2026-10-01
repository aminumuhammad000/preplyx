import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { connectDB } from '../config/db';
import User from '../models/User';
import Question from '../models/Question';
import ExamSession from '../models/ExamSession';
import MistakeLog from '../models/MistakeLog';
import QuestionReport from '../models/QuestionReport';

// Express app for direct supertest / route verification
import app from '../app';
import request from 'supertest';

async function runP0Tests() {
  console.log('🛡️ =======================================================');
  console.log('🛡️ PREPLYX P0 LAUNCH-BLOCKER SECURITY & INTEGRITY SUITE');
  console.log('🛡️ =======================================================\n');

  await connectDB();

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: any) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`, detail !== undefined ? detail : '');
      failed++;
    }
  }

  // Setup Test Users (Student 1, Student 2, Admin)
  const student1Email = `student1_${Date.now()}@preplyx.test`;
  const student2Email = `student2_${Date.now()}@preplyx.test`;
  const adminEmail = `admin_${Date.now()}@preplyx.test`;

  const student1 = await User.create({
    name: 'Student One',
    email: student1Email,
    password: 'password123',
    role: 'student',
  });

  const student2 = await User.create({
    name: 'Student Two',
    email: student2Email,
    password: 'password123',
    role: 'student',
  });

  const adminUser = await User.create({
    name: 'Admin User',
    email: adminEmail,
    password: 'password123',
    role: 'admin',
  });

  const jwtSecret = process.env.JWT_SECRET || 'secret';
  const tokenStudent1 = jwt.sign({ id: student1._id }, jwtSecret, { expiresIn: '1h' });
  const tokenStudent2 = jwt.sign({ id: student2._id }, jwtSecret, { expiresIn: '1h' });
  const tokenAdmin = jwt.sign({ id: adminUser._id }, jwtSecret, { expiresIn: '1h' });

  // Setup Seed Question
  const testQuestion = await Question.create({
    exam: 'JAMB',
    subject: 'Physics',
    topic: 'Mechanics',
    text: 'What is the SI unit of force?',
    options: ['Newton', 'Joule', 'Watt', 'Pascal'],
    correctAnswer: 'Newton',
    explanation: 'The SI unit of force is the Newton (N), defined as 1 kg*m/s^2.',
    cognitiveTrap: 'Confusing force with energy (Joule) or pressure (Pascal).',
    conceptSummary: 'Force equals mass times acceleration (F = ma).',
    status: 'published',
  });

  try {
    // ----------------------------------------------------
    // TEST 1: P0-01 Answer Leakage in Question API
    // ----------------------------------------------------
    console.log('\n--- 1. P0-01: Question API Answer Leakage ---');
    const qRes = await request(app)
      .get('/api/questions?exam=JAMB&subject=Physics')
      .set('Authorization', `Bearer ${tokenStudent1}`);

    assert(qRes.status === 200, 'GET /api/questions returns 200 OK');
    assert(Array.isArray(qRes.body), 'Response is an array of questions');

    const returnedQ = qRes.body.find((q: any) => q._id === testQuestion._id.toString());
    assert(returnedQ !== undefined, 'Target test question was retrieved');

    if (returnedQ) {
      assert(returnedQ.correctAnswer === undefined, 'CRITICAL: correctAnswer is ABSENT from response');
      assert(returnedQ.explanation === undefined, 'CRITICAL: explanation is ABSENT from response');
      assert(returnedQ.cognitiveTrap === undefined, 'CRITICAL: cognitiveTrap is ABSENT from response');
      assert(returnedQ.conceptSummary === undefined, 'CRITICAL: conceptSummary is ABSENT from response');
      assert(returnedQ.text === 'What is the SI unit of force?', 'Question text is present');
      assert(Array.isArray(returnedQ.options) && returnedQ.options.length === 4, 'Options are present');
    }

    // ----------------------------------------------------
    // TEST 2: P0-02 Server-Side Grading & Score Forgery
    // ----------------------------------------------------
    console.log('\n--- 2. P0-02: Server-Side Grading & Score Forgery ---');

    // Create an active exam session for student 1
    const startRes = await request(app)
      .post('/api/sessions/start')
      .set('Authorization', `Bearer ${tokenStudent1}`)
      .send({ exam: 'JAMB', subject: 'Physics', limit: 1 });

    assert(startRes.status === 201, 'POST /api/sessions/start returns 201');
    const sessionId = startRes.body.sessionId;
    assert(sessionId !== undefined, 'Session ID returned from start');

    // Attempt malicious score forgery: Send wrong answer 'Joule' but claim score = 100, percentage = 100
    const submitRes = await request(app)
      .post('/api/sessions/submit')
      .set('Authorization', `Bearer ${tokenStudent1}`)
      .send({
        sessionId,
        timeSpentSeconds: 45,
        score: 100, // Forged
        percentage: 100, // Forged
        correctCount: 100, // Forged
        answers: [
          {
            questionId: testQuestion._id.toString(),
            selectedAnswer: 'Joule', // WRONG ANSWER (correct is 'Newton')
          },
        ],
      });

    assert(submitRes.status === 201, 'POST /api/sessions/submit returns 201');
    assert(submitRes.body.score === 0, 'Server OVERRODE forged score: score is 0, not 100');
    assert(submitRes.body.percentage === 0, 'Server OVERRODE forged percentage: percentage is 0%');
    assert(submitRes.body.correctCount === 0, 'Server calculated correctCount = 0');
    assert(submitRes.body.incorrectCount === 1, 'Server calculated incorrectCount = 1');

    // Verify database record has authoritative state
    const savedSession = await ExamSession.findById(sessionId);
    assert(savedSession?.score === 0, 'Database stored authoritative score = 0');
    assert(savedSession?.status === 'completed', 'Database marked session as completed');
    assert(savedSession?.details[0]?.isCorrect === false, 'Database recorded detail isCorrect = false');

    // ----------------------------------------------------
    // TEST 3: P0-02 Session Ownership (403 Forbidden)
    // ----------------------------------------------------
    console.log('\n--- 3. P0-02: Session Ownership Enforcement ---');

    // Student 2 attempts to submit Student 1's session
    const hijackRes = await request(app)
      .post('/api/sessions/submit')
      .set('Authorization', `Bearer ${tokenStudent2}`)
      .send({
        sessionId,
        answers: [{ questionId: testQuestion._id.toString(), selectedAnswer: 'Newton' }],
      });

    assert(hijackRes.status === 403, 'Submitting another user session returns 403 Forbidden');

    // Student 2 attempts to view Student 1's session result
    const getOtherRes = await request(app)
      .get(`/api/sessions/${sessionId}`)
      .set('Authorization', `Bearer ${tokenStudent2}`);

    assert(getOtherRes.status === 404, 'Requesting another user session returns 404 Not Found');

    // ----------------------------------------------------
    // TEST 4: P0-02 Idempotency (Double Submission)
    // ----------------------------------------------------
    console.log('\n--- 4. P0-02: Double Submission Idempotency ---');
    const doubleRes = await request(app)
      .post('/api/sessions/submit')
      .set('Authorization', `Bearer ${tokenStudent1}`)
      .send({
        sessionId,
        answers: [{ questionId: testQuestion._id.toString(), selectedAnswer: 'Newton' }],
      });

    assert(doubleRes.status === 200, 'Duplicate submission handled gracefully with 200 OK');
    assert(doubleRes.body.data.score === 0, 'Duplicate submission did NOT alter original graded score');

    // ----------------------------------------------------
    // TEST 5: P0-03 "Why Was My Answer Wrong?"
    // ----------------------------------------------------
    console.log('\n--- 5. P0-03: "Why Was My Answer Wrong?" ---');
    const whyRes = await request(app)
      .post('/api/mistakes/why-wrong')
      .set('Authorization', `Bearer ${tokenStudent1}`)
      .send({
        questionId: testQuestion._id.toString(),
        selectedAnswer: 'Joule',
      });

    assert(whyRes.status === 200, 'POST /api/mistakes/why-wrong returns 200 OK');
    assert(whyRes.body.success === true, 'Response has success: true');
    assert(whyRes.body.data !== undefined, 'Response has data object');
    assert(whyRes.body.data.correctAnswer === 'Newton', 'data.correctAnswer matches authoritative key');
    assert(typeof whyRes.body.data.whySelectedIsIncorrect === 'string', 'data.whySelectedIsIncorrect is string');
    assert(typeof whyRes.body.data.whySelectedIsTempting === 'string', 'data.whySelectedIsTempting is string');
    assert(typeof whyRes.body.data.relevantConcept === 'string', 'data.relevantConcept is string');
    assert(typeof whyRes.body.data.correctReasoning === 'string', 'data.correctReasoning is string');

    // ----------------------------------------------------
    // TEST 6: P0-04 Question Reporting & Admin Authorization
    // ----------------------------------------------------
    console.log('\n--- 6. P0-04: Question Reporting & Admin Authorization ---');

    // Student submits valid report
    const reportRes = await request(app)
      .post('/api/question-reports')
      .set('Authorization', `Bearer ${tokenStudent1}`)
      .send({
        questionId: testQuestion._id.toString(),
        reportType: 'wrong_answer',
        userNotes: 'I believe this question has a typo.',
      });

    assert(reportRes.status === 201, 'Student can submit report: 201 Created');
    const reportId = reportRes.body.reportId;
    assert(reportId !== undefined, 'Report ID returned');

    // Student submits invalid report (missing reportType)
    const badReportRes = await request(app)
      .post('/api/question-reports')
      .set('Authorization', `Bearer ${tokenStudent1}`)
      .send({
        questionId: testQuestion._id.toString(),
      });
    assert(badReportRes.status === 400, 'Submitting invalid report returns 400 Bad Request');

    // Student attempts to access admin report list
    const studentGetReports = await request(app)
      .get('/api/question-reports')
      .set('Authorization', `Bearer ${tokenStudent1}`);
    assert(studentGetReports.status === 403, 'Student accessing GET /api/question-reports returns 403 Forbidden');

    // Student attempts to update report status
    const studentUpdateReport = await request(app)
      .put(`/api/question-reports/${reportId}/status`)
      .set('Authorization', `Bearer ${tokenStudent1}`)
      .send({ status: 'resolved' });
    assert(studentUpdateReport.status === 403, 'Student updating report status returns 403 Forbidden');

    // Admin accesses report list
    const adminGetReports = await request(app)
      .get('/api/question-reports')
      .set('Authorization', `Bearer ${tokenAdmin}`);
    assert(adminGetReports.status === 200, 'Admin accessing GET /api/question-reports returns 200 OK');

    // Admin updates report status
    const adminUpdateReport = await request(app)
      .put(`/api/question-reports/${reportId}/status`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ status: 'resolved', adminNotes: 'Verified and marked resolved' });
    assert(adminUpdateReport.status === 200, 'Admin updating report status returns 200 OK');

    // ----------------------------------------------------
    // TEST 7: Mistake Review IDOR Prevention
    // ----------------------------------------------------
    console.log('\n--- 7. Mistake Review IDOR Prevention ---');
    const userMistake = await MistakeLog.findOne({ user: student1._id });
    assert(userMistake !== null, 'Mistake was logged for Student 1 during grading');

    if (userMistake) {
      // Student 2 tries to review Student 1's mistake
      const idorRes = await request(app)
        .post(`/api/mistakes/${userMistake._id}/review`)
        .set('Authorization', `Bearer ${tokenStudent2}`)
        .send({ isCorrect: true });
      assert(idorRes.status === 403, 'Student 2 reviewing Student 1 mistake returns 403 Forbidden');

      // Student 1 reviews their own mistake
      const ownerRes = await request(app)
        .post(`/api/mistakes/${userMistake._id}/review`)
        .set('Authorization', `Bearer ${tokenStudent1}`)
        .send({ isCorrect: true });
      assert(ownerRes.status === 200, 'Student 1 reviewing own mistake returns 200 OK');
    }

  } finally {
    // Cleanup Test Data
    await User.deleteMany({ _id: { $in: [student1._id, student2._id, adminUser._id] } });
    await Question.deleteOne({ _id: testQuestion._id });
    await ExamSession.deleteMany({ user: { $in: [student1._id, student2._id] } });
    await MistakeLog.deleteMany({ user: { $in: [student1._id, student2._id] } });
    await QuestionReport.deleteMany({ user: { $in: [student1._id, student2._id] } });
    await mongoose.disconnect();
  }

  console.log('\n=======================================================');
  console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('=======================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runP0Tests().catch((err) => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
