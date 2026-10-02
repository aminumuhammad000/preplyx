/**
 * ALOC API Integration Layer
 * https://dev.aloc.com.ng/api/v1
 *
 * Key endpoints used:
 *  L1 · GET  /questions            — fetch questions by subject/examType/year (1 credit/req)
 *  L1 · POST /assessments/generate — generate balanced exam paper (1 credit)
 *  L3 · POST /questions/{id}/explain — AI step-by-step explanation (10 credits, Growth+)
 *
 * Docs: https://dev.aloc.com.ng/docs
 */

// ── Config ────────────────────────────────────────────────────────────────────
const ALOC_BASE = 'https://dev.aloc.com.ng/api/v1';
const ALOC_KEY  = import.meta.env.VITE_ALOC_API_KEY as string | undefined;

// Map Preplyx exam names → ALOC examType values
const EXAM_MAP: Record<string, string> = {
  JAMB:        'jamb',
  UTME:        'jamb',
  WAEC:        'waec',
  WASSCE:      'waec',
  NECO:        'neco',
  'POST-UTME': 'post_utme',
  POSTUTME:    'post_utme',
};

// Map Preplyx subject names → ALOC canonical subject slugs
const SUBJECT_MAP: Record<string, string> = {
  'english language': 'english-language',
  'english': 'english-language',
  'use of english': 'english-language',
  'mathematics': 'mathematics',
  'general mathematics': 'mathematics',
  'maths': 'mathematics',
  'math': 'mathematics',
  'physics': 'physics',
  'chemistry': 'chemistry',
  'biology': 'biology',
  'economics': 'economics',
  'commerce': 'commerce',
  'accounting': 'accounting',
  'financial accounting': 'accounting',
  'principles of accounts': 'accounting',
  'government': 'government',
  'geography': 'geography',
  'history': 'history',
  'literature in english': 'literature-in-english',
  'literature': 'literature-in-english',
  'civic education': 'civic-education',
  'civics': 'civic-education',
  'christian religious studies': 'christian-religious-studies',
  'crs': 'christian-religious-studies',
  'crk': 'christian-religious-studies',
  'islamic religious studies': 'islamic-religious-studies',
  'irs': 'islamic-religious-studies',
  'irk': 'islamic-religious-studies',
  'insurance': 'insurance',
  'computer studies': 'computer-studies',
};

export function mapSubjectToAloc(subject: string): string {
  const norm = (subject || '').trim().toLowerCase();
  if (SUBJECT_MAP[norm]) return SUBJECT_MAP[norm];
  return norm.replace(/\s+/g, '-');
}

// ── Preplyx Question shape (matches api.ts Question interface) ────────────────
export interface PrepQuestion {
  id?: string;
  exam: string;
  subject: string;
  year?: string;
  text: string;
  options: string[];
  correctAnswer: string;
  explanation?: string;
  topic?: string;
  subtopic?: string;
  source?: string;
}

// ── ALOC Raw Types ────────────────────────────────────────────────────────────
export interface AlocQuestion {
  id: string;
  text?: string;
  questionHtml?: string;
  options: {
    A?: string;
    B?: string;
    C?: string;
    D?: string;
    a?: string;
    b?: string;
    c?: string;
    d?: string;
  };
  correctAnswer: string;  // "A" | "B" | "C" | "D" or "a" | "b" | "c" | "d"
  examType?: string;
  subject?: string;
  year?: number;
  explanation?: string;
  topic?: string;
  subtopic?: string;
  difficultyScore?: number;
  metadata?: {
    topic?: string;
    subtopic?: string;
    difficultyScore?: number;
    estimatedTime?: number;
    tags?: string[];
    conceptSummary?: string;
  };
}

export interface AlocExplanation {
  questionId: string;
  explanation: string;
  simplifiedExplanation: string;
  commonMistakes: Array<{ mistake: string; whyWrong: string }>;
  solutionImageUrl: string | null;
  sourceType: string;
  confidence: number;
  needsReview: boolean;
}

export interface AlocFetchParams {
  subject: string;
  examType?: string;
  year?: string | number;
  limit?: number;
  random?: boolean;
  cursor?: string;
}

// ── Normalizer ────────────────────────────────────────────────────────────────

/**
 * Convert an ALOC question into Preplyx's PrepQuestion shape.
 * Normalizes options (case-insensitive keys) and maps correctAnswer to 'A' | 'B' | 'C' | 'D'.
 */
export function normalizeAlocQuestion(
  q: AlocQuestion,
  subject: string,
  examType: string
): PrepQuestion {
  // Strip HTML tags if questionHtml fallback is used, while preserving readable content
  const text = (q.text || q.questionHtml || '').replace(/<[^>]+>/g, '').trim();

  // Extract options whether keys are uppercase (A, B, C, D) or lowercase (a, b, c, d)
  const optA = (q.options as any)?.A ?? (q.options as any)?.a ?? '';
  const optB = (q.options as any)?.B ?? (q.options as any)?.b ?? '';
  const optC = (q.options as any)?.C ?? (q.options as any)?.c ?? '';
  const optD = (q.options as any)?.D ?? (q.options as any)?.d ?? '';

  const opts = [optA, optB, optC, optD];

  // Resolve correct answer letter A, B, C, or D
  const rawAns = (q.correctAnswer || '').trim();
  let correctLetter = 'A';
  if (['A', 'B', 'C', 'D'].includes(rawAns.toUpperCase())) {
    correctLetter = rawAns.toUpperCase();
  } else if (optA && rawAns.toLowerCase() === optA.toLowerCase()) {
    correctLetter = 'A';
  } else if (optB && rawAns.toLowerCase() === optB.toLowerCase()) {
    correctLetter = 'B';
  } else if (optC && rawAns.toLowerCase() === optC.toLowerCase()) {
    correctLetter = 'C';
  } else if (optD && rawAns.toLowerCase() === optD.toLowerCase()) {
    correctLetter = 'D';
  }

  const topic = q.metadata?.topic || q.topic || 'General';
  const subtopic = q.metadata?.subtopic || q.subtopic || '';
  const explanation = q.explanation || q.metadata?.conceptSummary || '';

  return {
    id:            q.id,
    exam:          (q.examType || examType).toUpperCase(),
    subject:       subject,
    year:          q.year ? String(q.year) : undefined,
    text,
    options:       opts,
    correctAnswer: correctLetter,
    explanation,
    topic,
    subtopic,
    source:        'ALOC_API',
  };
}

// ── Core Request Helper ───────────────────────────────────────────────────────

async function alocRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  if (!ALOC_KEY) {
    throw new Error('ALOC API key not configured. Set VITE_ALOC_API_KEY in your .env file.');
  }

  const res = await fetch(`${ALOC_BASE}${path}`, {
    ...options,
    headers: {
      'X-API-Key': ALOC_KEY,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}) as any);
    throw new Error(`ALOC ${res.status}: ${(err as any).message || (err as any).error || res.statusText}`);
  }

  return res.json() as Promise<T>;
}

// ── L1: Fetch Questions ───────────────────────────────────────────────────────

/**
 * Fetch questions from ALOC L1 endpoint.
 * Gracefully handles missing years/filters by retrying with random=true so real questions always return.
 */
export async function fetchAlocQuestions(params: AlocFetchParams): Promise<PrepQuestion[]> {
  const alocSubject = mapSubjectToAloc(params.subject);
  const examTypeMapped =
    EXAM_MAP[params.examType?.toUpperCase() ?? ''] ??
    params.examType?.toLowerCase() ??
    'jamb';

  const makeQuery = (includeYear = true, random = false) => {
    const qs = new URLSearchParams();
    qs.set('subject', alocSubject);
    qs.set('examType', examTypeMapped);
    if (includeYear && params.year && params.year !== 'All') {
      qs.set('year', String(params.year));
    }
    if (random || params.random) {
      qs.set('random', 'true');
    }
    qs.set('limit', String(Math.min(params.limit ?? 40, 50)));
    if (params.cursor) qs.set('cursor', params.cursor);
    return qs.toString();
  };

  try {
    // Attempt 1: Specific query (with year if specified)
    const qs1 = makeQuery(true, false);
    const data = await alocRequest<{ data: AlocQuestion[] }>(`/questions?${qs1}`);
    if (data.data && data.data.length > 0) {
      return data.data.map(q => normalizeAlocQuestion(q, params.subject, examTypeMapped));
    }
  } catch (err) {
    console.warn('[ALOC] Attempt 1 failed:', (err as Error).message);
  }

  // Attempt 2: Fallback query without year constraint (random=true)
  try {
    const qs2 = makeQuery(false, true);
    const data2 = await alocRequest<{ data: AlocQuestion[] }>(`/questions?${qs2}`);
    if (data2.data && data2.data.length > 0) {
      return data2.data.map(q => normalizeAlocQuestion(q, params.subject, examTypeMapped));
    }
  } catch (err) {
    console.warn('[ALOC] Attempt 2 fallback failed:', (err as Error).message);
  }

  // Attempt 3: Fallback with examType=jamb
  try {
    const qs3 = new URLSearchParams();
    qs3.set('subject', alocSubject);
    qs3.set('examType', 'jamb');
    qs3.set('random', 'true');
    qs3.set('limit', String(Math.min(params.limit ?? 40, 50)));
    const data3 = await alocRequest<{ data: AlocQuestion[] }>(`/questions?${qs3.toString()}`);
    if (data3.data && data3.data.length > 0) {
      return data3.data.map(q => normalizeAlocQuestion(q, params.subject, 'jamb'));
    }
  } catch (err) {
    console.warn('[ALOC] Attempt 3 fallback failed:', (err as Error).message);
  }

  return [];
}

// ── L1: Generate Balanced Assessment Paper ────────────────────────────────────

type AlocPreset = 'jamb_standard_40' | 'waec_standard_50' | 'micro_test_10';

export interface GenerateAssessmentParams {
  subject: string;
  examType?: string;
  preset?: AlocPreset;
  shuffleOptions?: boolean;
  seed?: string;
}

/**
 * Generate a psychometrically balanced exam paper.
 * Costs 1 credit per call.
 */
export async function generateAlocAssessment(
  params: GenerateAssessmentParams
): Promise<PrepQuestion[]> {
  const alocSubject = mapSubjectToAloc(params.subject);
  const examTypeMapped =
    EXAM_MAP[params.examType?.toUpperCase() ?? ''] ??
    params.examType?.toLowerCase() ??
    'jamb';

  const preset: AlocPreset =
    params.preset ??
    (examTypeMapped === 'waec' ? 'waec_standard_50' : 'jamb_standard_40');

  const body = {
    subject:        alocSubject,
    examType:       examTypeMapped,
    preset,
    shuffleOptions: params.shuffleOptions ?? true,
    seed:           params.seed ?? `preplyx_${Date.now()}`,
  };

  const data = await alocRequest<{ data: { questions: AlocQuestion[] } }>(
    '/assessments/generate',
    { method: 'POST', body: JSON.stringify(body) }
  );

  return (data.data?.questions || []).map(q =>
    normalizeAlocQuestion(q, params.subject, examTypeMapped)
  );
}

// ── L3: Fetch AI Explanation ──────────────────────────────────────────────────

/**
 * Fetch a step-by-step AI explanation for a specific ALOC question ID.
 * Costs 10 credits. Requires Growth tier+.
 */
export async function fetchAlocExplanation(
  questionId: string
): Promise<AlocExplanation | null> {
  try {
    const data = await alocRequest<{ data: AlocExplanation }>(
      `/questions/${questionId}/explain`,
      { method: 'POST' }
    );
    return data.data ?? null;
  } catch {
    return null;
  }
}

// ── Main Entry: getAlocQuestions ──────────────────────────────────────────────

/**
 * Drop-in replacement for api.getQuestions().
 * Accepts the same params shape and returns the same Question array shape.
 */
export async function getAlocQuestions(params: {
  exam?: string;
  subject?: string;
  year?: string;
  limit?: number;
}): Promise<PrepQuestion[]> {
  if (!params.subject) throw new Error('subject is required for ALOC');

  return fetchAlocQuestions({
    subject:  params.subject,
    examType: params.exam,
    year:     params.year,
    limit:    params.limit ?? 40,
  });
}

// ── Utility ───────────────────────────────────────────────────────────────────

/** Returns true if the ALOC API key is configured. */
export const isAlocConfigured = (): boolean =>
  Boolean(ALOC_KEY && ALOC_KEY.length > 10);
