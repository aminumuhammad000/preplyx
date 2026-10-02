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
  WAEC:        'waec',
  NECO:        'neco',
  'POST-UTME': 'post_utme',
};

// ── Preplyx Question shape (matches api.ts Question interface) ────────────────
// We use this type inline to avoid cross-module import conflicts.
export interface PrepQuestion {
  id?: string;
  exam: string;
  subject: string;
  year?: string;
  text: string;
  options: string[];
  correctAnswer: string;
  explanation?: string;
}

// ── ALOC Raw Types ────────────────────────────────────────────────────────────

export interface AlocQuestion {
  id: string;
  text?: string;
  questionHtml?: string;
  options: { a: string; b: string; c?: string; d?: string };
  correctAnswer: string;  // "a" | "b" | "c" | "d"
  examType?: string;
  subject?: string;
  year?: number;
  explanation?: string;
  topic?: string;
  subtopic?: string;
  difficultyScore?: number;
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
 * Options are returned as a string[] [optA, optB, optC, optD].
 * correctAnswer is the actual option text (not a letter).
 */
export function normalizeAlocQuestion(
  q: AlocQuestion,
  subject: string,
  examType: string
): PrepQuestion {
  // Strip HTML tags from questionHtml fallback
  const text = q.text || q.questionHtml?.replace(/<[^>]+>/g, '').trim() || '';

  const opts = [
    q.options?.a || '',
    q.options?.b || '',
    q.options?.c || '',
    q.options?.d || '',
  ].filter(Boolean);

  // Map letter "a"/"b"/"c"/"d" → actual option text
  const letterMap: Record<string, string> = {
    a: q.options?.a || '',
    b: q.options?.b || '',
    c: q.options?.c || '',
    d: q.options?.d || '',
  };
  const correctLetter = (q.correctAnswer || 'a').toLowerCase().charAt(0);
  const correctAnswer = letterMap[correctLetter] || q.correctAnswer || '';

  return {
    id:            q.id,
    exam:          examType.toUpperCase(),
    subject:       subject,
    year:          q.year ? String(q.year) : undefined,
    text,
    options:       opts,
    correctAnswer,
    explanation:   q.explanation || '',
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
 * Costs 1 credit per request.
 */
export async function fetchAlocQuestions(params: AlocFetchParams): Promise<PrepQuestion[]> {
  const qs = new URLSearchParams();

  const subjectLower = params.subject.toLowerCase();
  qs.set('subject', subjectLower);

  const examTypeMapped =
    EXAM_MAP[params.examType?.toUpperCase() ?? ''] ??
    params.examType?.toLowerCase() ??
    'jamb';
  qs.set('examType', examTypeMapped);

  if (params.year && params.year !== 'All') {
    qs.set('year', String(params.year));
  }

  qs.set('limit', String(Math.min(params.limit ?? 40, 50)));
  if (params.random) qs.set('random', 'true');
  if (params.cursor) qs.set('cursor', params.cursor);

  const data = await alocRequest<{ data: AlocQuestion[] }>(
    `/questions?${qs.toString()}`
  );

  return (data.data || []).map(q =>
    normalizeAlocQuestion(q, params.subject, examTypeMapped)
  );
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
  const examTypeMapped =
    EXAM_MAP[params.examType?.toUpperCase() ?? ''] ??
    params.examType?.toLowerCase() ??
    'jamb';

  const preset: AlocPreset =
    params.preset ??
    (examTypeMapped === 'waec' ? 'waec_standard_50' : 'jamb_standard_40');

  const body = {
    subject:        params.subject.toLowerCase(),
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
