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
  imageUrl?: string;
  section?: string;
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
  imageUrl?: string | null;
  section?: string | null;
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
    imageUrl:      q.imageUrl || undefined,
    section:       q.section || undefined,
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

// ── L0: Availability & Subject Catalog ─────────────────────────────────────────

export interface AlocCatalogSubject {
  name: string;
  displayName: string;
  code: string;
  category: string;
  aliases: string[];
  questionCount: number;
  examTypes: string[];
  yearRange: {
    min: number;
    max: number;
  };
}

export const STATIC_ALOC_CATALOG: AlocCatalogSubject[] = [
  { name: 'mathematics', displayName: 'Mathematics', code: 'MTH', category: 'sciences', aliases: ['math', 'maths'], questionCount: 1209, examTypes: ['jamb', 'post_utme', 'waec', 'neco'], yearRange: { min: 2000, max: 2024 } },
  { name: 'english-language', displayName: 'English Language', code: 'ENG', category: 'languages', aliases: ['english', 'use-of-english'], questionCount: 1798, examTypes: ['jamb', 'waec', 'neco', 'post_utme'], yearRange: { min: 2000, max: 2024 } },
  { name: 'physics', displayName: 'Physics', code: 'PHY', category: 'sciences', aliases: ['phy'], questionCount: 1196, examTypes: ['jamb', 'post_utme', 'waec', 'neco'], yearRange: { min: 2004, max: 2024 } },
  { name: 'chemistry', displayName: 'Chemistry', code: 'CHE', category: 'sciences', aliases: ['chem'], questionCount: 794, examTypes: ['jamb', 'post_utme', 'waec', 'neco'], yearRange: { min: 2001, max: 2024 } },
  { name: 'biology', displayName: 'Biology', code: 'BIO', category: 'sciences', aliases: ['bio'], questionCount: 383, examTypes: ['jamb', 'post_utme', 'waec', 'neco'], yearRange: { min: 2003, max: 2024 } },
  { name: 'economics', displayName: 'Economics', code: 'ECN', category: 'commercial', aliases: ['econ'], questionCount: 655, examTypes: ['jamb', 'post_utme', 'waec', 'neco'], yearRange: { min: 2001, max: 2024 } },
  { name: 'government', displayName: 'Government', code: 'GOV', category: 'social-sciences', aliases: ['govt'], questionCount: 1491, examTypes: ['jamb', 'neco', 'post_utme', 'waec'], yearRange: { min: 1988, max: 2024 } },
  { name: 'literature-in-english', displayName: 'Literature in English', code: 'LIT', category: 'arts', aliases: ['literature'], questionCount: 557, examTypes: ['jamb', 'post_utme', 'waec', 'neco'], yearRange: { min: 2006, max: 2024 } },
  { name: 'commerce', displayName: 'Commerce', code: 'COMM', category: 'commercial', aliases: ['com'], questionCount: 886, examTypes: ['jamb', 'neco', 'waec', 'post_utme'], yearRange: { min: 1990, max: 2024 } },
  { name: 'accounting', displayName: 'Accounting', code: 'ACC', category: 'commercial', aliases: ['accounts'], questionCount: 1435, examTypes: ['jamb', 'post_utme', 'waec', 'neco'], yearRange: { min: 1997, max: 2024 } },
  { name: 'civic-education', displayName: 'Civic Education', code: 'CIV', category: 'social-sciences', aliases: ['civics'], questionCount: 436, examTypes: ['neco', 'waec', 'jamb'], yearRange: { min: 2011, max: 2024 } },
  { name: 'christian-religious-studies', displayName: 'Christian Religious Studies', code: 'CRK', category: 'arts', aliases: ['crs'], questionCount: 1017, examTypes: ['jamb', 'post_utme', 'waec', 'neco'], yearRange: { min: 2005, max: 2024 } },
  { name: 'geography', displayName: 'Geography', code: 'GEO', category: 'social-sciences', aliases: ['geog'], questionCount: 436, examTypes: ['jamb', 'post_utme', 'waec', 'neco'], yearRange: { min: 2006, max: 2024 } },
  { name: 'history', displayName: 'History', code: 'HIS', category: 'arts', aliases: [], questionCount: 50, examTypes: ['waec', 'jamb', 'neco'], yearRange: { min: 2010, max: 2024 } },
  { name: 'insurance', displayName: 'Insurance', code: 'INSU', category: 'general', aliases: [], questionCount: 342, examTypes: ['waec', 'jamb', 'neco'], yearRange: { min: 2010, max: 2024 } }
];

let cachedAlocCatalog: AlocCatalogSubject[] | null = null;

export async function fetchAlocCatalog(): Promise<AlocCatalogSubject[]> {
  if (cachedAlocCatalog) return cachedAlocCatalog;
  try {
    const res = await alocRequest<{ data: AlocCatalogSubject[] }>('/subjects');
    if (res.data && Array.isArray(res.data) && res.data.length > 0) {
      cachedAlocCatalog = res.data;
      return res.data;
    }
  } catch (err) {
    console.warn('[ALOC] Catalog fetch error, using static catalog:', (err as Error).message);
  }
  cachedAlocCatalog = STATIC_ALOC_CATALOG;
  return STATIC_ALOC_CATALOG;
}

export async function getAlocAvailability(): Promise<Record<string, {
  hasQuestions: boolean;
  totalCount: number;
  years: string[];
  subjects: string[];
  subjectYears: Record<string, string[]>;
  topics: Record<string, string[]>;
}>> {
  const catalog = await fetchAlocCatalog();
  const examKeys = ['JAMB', 'WAEC', 'NECO', 'POST-UTME'];
  const availability: Record<string, any> = {};

  const ALL_EXAM_YEARS: string[] = Array.from({ length: 15 }, (_, i) => String(2024 - i)); // 2024 down to 2010

  for (const examKey of examKeys) {
    const examSlug = EXAM_MAP[examKey] || examKey.toLowerCase();
    
    // Select subjects matching this exam slug (or all subjects if none specific)
    const matchingSubjects = catalog.filter(sub => 
      sub.examTypes.includes(examSlug) || sub.examTypes.length > 0
    );

    const subjectDisplayNames = matchingSubjects.map(s => s.displayName);
    const subjectYears: Record<string, string[]> = {};
    const topics: Record<string, string[]> = {};

    let totalCount = 0;
    const yearsSet = new Set<string>();

    for (const sub of matchingSubjects) {
      totalCount += sub.questionCount || 0;
      const minYr = Math.max(sub.yearRange?.min || 2005, 2000);
      const maxYr = Math.min(sub.yearRange?.max || 2024, 2024);
      const subYearList: string[] = [];
      for (let y = maxYr; y >= minYr; y--) {
        subYearList.push(String(y));
        yearsSet.add(String(y));
      }
      subjectYears[sub.displayName] = subYearList.length > 0 ? subYearList : ALL_EXAM_YEARS;
      topics[sub.displayName] = ['General', 'Past Papers', 'Revision Topics'];
    }

    const sortedYears = Array.from(yearsSet).sort((a, b) => Number(b) - Number(a));

    availability[examKey] = {
      hasQuestions: true,
      totalCount: totalCount > 0 ? totalCount : 10000,
      years: sortedYears.length > 0 ? sortedYears : ALL_EXAM_YEARS,
      subjects: subjectDisplayNames.length > 0 ? subjectDisplayNames : [
        'Mathematics', 'English Language', 'Physics', 'Chemistry', 'Biology',
        'Economics', 'Government', 'Literature in English', 'Commerce', 'Accounting'
      ],
      subjectYears,
      topics
    };
  }

  return availability;
}

// ── Utility ───────────────────────────────────────────────────────────────────

/** Returns true if the ALOC API key is configured. */
export const isAlocConfigured = (): boolean =>
  Boolean(ALOC_KEY && ALOC_KEY.length > 10);

