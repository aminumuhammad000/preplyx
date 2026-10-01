# PREPLYX P1 PRODUCTION READINESS AUDIT

**Date:** September 20, 2026  
**Auditor:** Lead Product, Security, Backend & Frontend Architecture Engineer  
**Scope:** Complete Preplyx codebase (`backend/`, `preplyx/`, models, routes, controllers, services, UI flows)  
**Baseline:** P0 Remediation Verified (33 PASSED, 0 FAILED)

---

## 1. Executive Summary

While the P0 remediation successfully sealed question-answer leakage, client-side score forgery, and session resumption, this P1 audit identifies **critical production-readiness vulnerabilities, learning-loop gaps, and data-integrity defects** that must be resolved before Preplyx can safely serve real Nigerian examination candidates at scale.

### Severity Summary:
- **P0 / Critical Blockers:** 2 (Admin routes unauthenticated, OTP leaked in API response)
- **P1 / Production Critical:** 6 (Unanswered question grading failure, Mistake confidence validation mismatch, MistakeCard UI data rendering bug, Unauthenticated AI tutor endpoint, Missing rate limiting, Unrestricted student question creation)
- **P2 / Important Product Quality:** 5 (Session status un-filtered in analytics, MultiSubjectExam alert-based error UX, Question report spamming, Missing compound DB indexes, Missing `validate:questions` CLI)
- **P3 / Enhancements:** 2 (Automated question deduplication indexing, Enhanced mobile ARIA semantics)

---

## 2. Detailed Findings Matrix

### Finding 1: Administrative Endpoints Completely Unauthenticated (P0 / Critical)
- **Area:** Backend Authorization & RBAC (`backend/src/routes/adminRoutes.ts`)
- **Current Implementation:** `adminRoutes.ts` defines all administrative endpoints (`/dashboard`, `/questions`, `/wallet/credit`, `/users`, `/exams`, etc.) without attaching `protect` or `adminOnly` middleware at either the router level or route level.
- **Risk:** Any unauthenticated actor on the internet can call `GET /api/admin/questions` to retrieve all past questions with answers, explanations, and cognitive traps; call `POST /api/admin/wallet/credit` to credit arbitrary amounts to any wallet; or call `DELETE /api/admin/users/:id` to wipe user accounts.
- **Severity:** **P0** (Critical Launch & Security Blocker)
- **Evidence:** 
  In [`backend/src/routes/adminRoutes.ts`](file:///home/ameetech/Desktop/preplyx2026/backend/src/routes/adminRoutes.ts#L38-L95):
  ```typescript
  const router = Router();
  router.get('/dashboard', getAdminDashboard);
  router.get('/questions', getAdminQuestions);
  router.post('/wallet/credit', creditUserWallet);
  router.delete('/users/:id', deleteAdminUser);
  ```
  Neither `protect` nor `adminOnly` is imported or used.
- **Recommended Fix:** Add `router.use(protect, adminOnly);` at the top of `adminRoutes.ts`.

---

### Finding 2: Password Reset OTP Leaked in API Response (P0 / Critical)
- **Area:** Authentication & Account Security (`backend/src/controllers/authController.ts`)
- **Current Implementation:** `forgotPassword` generates a 6-digit OTP and returns `{ success: true, message: '...', demoOtp: otp }` in the HTTP response JSON.
- **Risk:** Any attacker who enters a victim's email into the forgot password form immediately receives the valid OTP in the API response, allowing instant account takeover and password reset without email access.
- **Severity:** **P0** (Critical Vulnerability)
- **Evidence:** 
  In [`backend/src/controllers/authController.ts`](file:///home/ameetech/Desktop/preplyx2026/backend/src/controllers/authController.ts#L225):
  ```typescript
  res.json({
    success: true,
    message: `A 6-digit OTP has been sent to ${email}. Check your console or email.`,
    demoOtp: otp // <--- LEAKED
  });
  ```
- **Recommended Fix:** Completely remove `demoOtp` from the JSON response in production. Only log OTP to server console in local development (`NODE_ENV === 'development'`).

---

### Finding 3: Grading Fails on Exams with Unanswered Questions (P1)
- **Area:** Assessment Engine & Data Integrity (`backend/src/models/ExamSession.ts`)
- **Current Implementation:** The subdocument schema `questionDetailSchema` defines `userAnswer: { type: String, required: true }`.
- **Risk:** In Mongoose, empty string `""` fails `required: true`. When a student leaves any question unanswered, `userAns` is evaluated as `""`, and `session.save()` throws a Mongoose `ValidationError`. The exam submission fails, preventing the student from completing the exam.
- **Severity:** **P1** (Production Critical)
- **Evidence:**
  In [`backend/src/models/ExamSession.ts`](file:///home/ameetech/Desktop/preplyx2026/backend/src/models/ExamSession.ts#L41-L44):
  ```typescript
  userAnswer: {
    type: String,
    required: true, // Rejects empty string ""
  }
  ```
- **Recommended Fix:** Change `userAnswer` in `questionDetailSchema` to `required: false, default: ''`.

---

### Finding 4: Mistake Confidence Enum Mismatch Between Frontend and Backend (P1)
- **Area:** Mistake Intelligence & Data Integrity (`backend/src/models/MistakeLog.ts` & `backend/src/services/mistakeService.ts`)
- **Current Implementation:** `MistakeLog.ts` schema defines `confidence: { enum: ['very_sure', 'somewhat_sure', 'guessing'] }`. The frontend (`CbtExamRunner.tsx` & `MultiSubjectExam.tsx`) sends `'high'`, `'medium'`, or `'low'`.
- **Risk:** When `MistakeService.logMistake` attempts to save a mistake record with `confidence: 'high'`, Mongoose throws a validation error (`'high' is not a valid enum value for path 'confidence'`). As a result, mistakes are never logged in the database from authoritative grading.
- **Severity:** **P1** (Production Critical)
- **Evidence:**
  In [`backend/src/models/MistakeLog.ts`](file:///home/ameetech/Desktop/preplyx2026/backend/src/models/MistakeLog.ts#L72-L76):
  ```typescript
  confidence: {
    type: String,
    enum: ['very_sure', 'somewhat_sure', 'guessing'],
    default: 'somewhat_sure',
  }
  ```
  In [`preplyx/src/pages/CbtExamRunner.tsx`](file:///home/ameetech/Desktop/preplyx2026/preplyx/src/pages/CbtExamRunner.tsx#L32):
  ```typescript
  const [confidences, setConfidences] = useState<Record<string, 'high' | 'medium' | 'low'>>({});
  ```
- **Recommended Fix:** Normalize confidence in `MistakeService.logMistake` and `examSessionController.ts` (`'high' -> 'very_sure'`, `'medium' -> 'somewhat_sure'`, `'low' -> 'guessing'`) and expand `MistakeLog.ts` enum to accept both formats.

---

### Finding 5: MistakeCard Fails to Render In-Depth Explanation (P1)
- **Area:** Frontend Mistake Review Experience (`preplyx/src/components/MistakeCard.tsx`)
- **Current Implementation:** `MistakeCard.tsx` calls `api.explainWhyWrong(...)` and assigns the entire response object directly to state: `setWhyWrongData(res)`.
- **Risk:** `api.explainWhyWrong` returns `{ success: true, data: { relevantConcept, whySelectedIsTempting, ... } }`. In the component template, fields are accessed as `{whyWrongData.relevantConcept}` rather than `{whyWrongData.data.relevantConcept}`. Consequently, all explanation fields evaluate to `undefined` and the accordion renders blank.
- **Severity:** **P1** (Production Critical UX)
- **Evidence:**
  In [`preplyx/src/components/MistakeCard.tsx`](file:///home/ameetech/Desktop/preplyx2026/preplyx/src/components/MistakeCard.tsx#L68):
  ```typescript
  const res = await api.explainWhyWrong(...);
  setWhyWrongData(res); // Should be res.data || res
  ```
- **Recommended Fix:** Update `MistakeCard.tsx` to `setWhyWrongData(res.data || res);`.

---

### Finding 6: Unauthenticated AI Tutor Endpoint (`POST /api/ai/tutor`) (P1)
- **Area:** AI Services & Resource Protection (`backend/src/routes/aiRoutes.ts`)
- **Current Implementation:** `router.post('/tutor', askAiTutor);` has no authentication middleware.
- **Risk:** Anyone on the internet can flood `POST /api/ai/tutor` with arbitrary prompts, exhausting AI API quotas and incurring uncontrolled operational costs.
- **Severity:** **P1** (Resource Exhaustion / Security)
- **Evidence:**
  In [`backend/src/routes/aiRoutes.ts`](file:///home/ameetech/Desktop/preplyx2026/backend/src/routes/aiRoutes.ts#L6):
  ```typescript
  router.post('/tutor', askAiTutor);
  ```
- **Recommended Fix:** Add `protect` middleware to `POST /api/ai/tutor` and apply rate limiting.

---

### Finding 7: Unrestricted Question Creation by Regular Students (P1)
- **Area:** Question Management Authorization (`backend/src/routes/questionRoutes.ts`)
- **Current Implementation:** `router.post('/', protect, createQuestion);` allows any authenticated user (including regular students) to insert new questions into the database.
- **Risk:** Malicious students could inject fake questions or corrupt existing question sets.
- **Severity:** **P1** (Content Integrity)
- **Evidence:**
  In [`backend/src/routes/questionRoutes.ts`](file:///home/ameetech/Desktop/preplyx2026/backend/src/routes/questionRoutes.ts#L8):
  ```typescript
  router.post('/', protect, createQuestion);
  ```
- **Recommended Fix:** Require `adminOnly` middleware on `POST /api/questions`: `router.post('/', protect, adminOnly, createQuestion);`.

---

### Finding 8: Missing Security Headers and Unrestricted CORS (P1)
- **Area:** Infrastructure & Web Application Security (`backend/src/app.ts`)
- **Current Implementation:** `app.use(cors());` enables wildcard CORS with no origin validation. No HTTP security headers (`X-Content-Type-Options`, `X-Frame-Options`, `Strict-Transport-Security`, `Content-Security-Policy`, etc.) are configured.
- **Risk:** Application is exposed to clickjacking, MIME-type confusion, and cross-site scripting vulnerabilities.
- **Severity:** **P1** (Security Compliance)
- **Evidence:**
  In [`backend/src/app.ts`](file:///home/ameetech/Desktop/preplyx2026/backend/src/app.ts#L9-L10):
  ```typescript
  app.use(cors());
  app.use(express.json());
  ```
- **Recommended Fix:** Implement security header middleware and configure CORS to respect `CLIENT_URL` with credentials support.

---

### Finding 9: Missing API Rate Limiting (P1)
- **Area:** API Availability & Denial of Service Protection (`backend/src/app.ts`)
- **Current Implementation:** No rate limiting middleware exists in the application.
- **Risk:** Sensitive endpoints (`/api/auth/login`, `/api/auth/register`, `/api/auth/forgot-password`, `/api/sessions/submit`, `/api/mistakes/why-wrong`, `/api/ai/tutor`) are vulnerable to credential stuffing, brute-forcing, and resource exhaustion.
- **Severity:** **P1** (Availability & Integrity)
- **Recommended Fix:** Implement an in-memory/Redis sliding-window rate limiting middleware for authentication and mutation routes.

---

### Finding 10: Incomplete Status Filtering in Analytics (`dataController.ts`) (P2)
- **Area:** Student Analytics & Performance Metrics (`backend/src/controllers/dataController.ts`)
- **Current Implementation:** `getStats` and `getSubjectMastery` execute `ExamSession.find({ user: req.user._id })` without filtering by `status: 'completed'`.
- **Risk:** Unfinished, abandoned, or in-progress sessions with score 0 are included in calculations, artificially depressing the student's average accuracy and inflating total questions answered.
- **Severity:** **P2** (Data Correctness)
- **Evidence:**
  In [`backend/src/controllers/dataController.ts`](file:///home/ameetech/Desktop/preplyx2026/backend/src/controllers/dataController.ts#L17):
  ```typescript
  const sessions = await ExamSession.find({ user: req.user._id });
  ```
- **Recommended Fix:** Update queries to `{ user: req.user._id, status: 'completed' }`.

---

### Finding 11: MultiSubjectExam Uses `alert()` for Submission Failure (P2)
- **Area:** Frontend UX & Error Recovery (`preplyx/src/pages/MultiSubjectExam.tsx`)
- **Current Implementation:** When `api.submitSession` throws an error in `MultiSubjectExam.tsx`, it executes `alert('Submission failed...')` instead of providing a prominent non-blocking retry banner.
- **Risk:** Mobile browsers can block alerts, causing the UI to become unresponsive or trapping the student.
- **Severity:** **P2** (UX / Student Trust)
- **Evidence:**
  In [`preplyx/src/pages/MultiSubjectExam.tsx`](file:///home/ameetech/Desktop/preplyx2026/preplyx/src/pages/MultiSubjectExam.tsx#L374):
  ```typescript
  alert('Submission failed due to a network error. Your answers are saved locally. Please check your connection and retry.');
  ```
- **Recommended Fix:** Implement the same non-blocking `submitError` banner and retry UI established in `CbtExamRunner.tsx`.

---

### Finding 12: Question Report Spamming (P2)
- **Area:** Content Quality & Abuse Prevention (`backend/src/controllers/questionReportController.ts`)
- **Current Implementation:** Students can submit unlimited duplicate reports for the same question.
- **Risk:** An automated script or disgruntled user could flood the admin queue with thousands of duplicate reports.
- **Severity:** **P2** (Abuse Prevention)
- **Recommended Fix:** Check if the user already has a `pending` report for that `questionId` before creating a new report.

---

### Finding 13: Missing Critical Compound Indexes (P2)
- **Area:** Database Performance & Query Optimization (`backend/src/models/ExamSession.ts` & `backend/src/models/Question.ts`)
- **Current Implementation:** `ExamSession` lacks a compound index on `{ user: 1, status: 1, createdAt: -1 }`. `Question` lacks a compound index on `{ exam: 1, subject: 1, year: 1, status: 1 }`.
- **Risk:** As session history and question banks grow, session queries and exam initialization will perform slow collection scans.
- **Severity:** **P2** (Database Performance)
- **Recommended Fix:** Add compound indexes to `ExamSession.ts` and `Question.ts`.

---

### Finding 14: Missing Question Quality Validation CLI Script (P2)
- **Area:** Question Quality Assurance (`backend/package.json`)
- **Current Implementation:** No `npm run validate:questions` script exists to audit question data integrity.
- **Risk:** Corrupted or invalid questions (e.g. missing options, invalid correctAnswer) can enter the database unnoticed.
- **Severity:** **P2** (Quality Assurance)
- **Recommended Fix:** Create `backend/scripts/validateQuestions.ts` and add `"validate:questions": "ts-node scripts/validateQuestions.ts"` to `backend/package.json`.

---

## 3. Remediation Roadmap (Priority Order)

1. **P1-A: Assessment & Content Integrity**
   - Fix `questionDetailSchema` `userAnswer` validation to allow empty strings (`""`) for unanswered questions.
   - Fix `MistakeLog` confidence enum and add normalization in `MistakeService` and `examSessionController`.
   - Prevent duplicate question IDs and race conditions during `submitSession`.

2. **P1-B: Student Learning & Mistake Experience**
   - Fix `MistakeCard.tsx` data unwrapping (`res.data || res`).
   - Fix `dataController.ts` queries to filter by `status: 'completed'`.
   - Enhance spaced review algorithm with transparent scheduling.

3. **P1-C: Security & Authorization**
   - Protect all routes in `adminRoutes.ts` with `protect, adminOnly`.
   - Restrict `POST /api/questions` with `adminOnly`.
   - Protect `POST /api/ai/tutor` with `protect`.
   - Remove `demoOtp` from `forgotPassword` response.
   - Implement security headers and CORS origin restrictions.
   - Implement rate limiting on sensitive routes.

4. **P1-D: Data Quality & Performance**
   - Add compound indexes to `ExamSession` and `Question`.
   - Implement `backend/scripts/validateQuestions.ts` and `npm run validate:questions`.
   - Deduplicate question reports.

5. **P1-E: Frontend UX & Error Recovery**
   - Replace `alert()` in `MultiSubjectExam.tsx` with inline retry banner.
   - Ensure complete accessibility and mobile responsiveness across exam runners and mistake cards.

6. **P1-F: Infrastructure & Verification**
   - Document `.env.example`.
   - Run P0 verification suite (ensure 0 regressions).
   - Run new P1 automated verification suite.
   - Produce final `PREPLYX_PRODUCTION_READINESS_REPORT.md`.
