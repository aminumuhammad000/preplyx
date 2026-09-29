import { NextRequest } from "next/server";
import { apiJson, apiOptions } from "@/lib/http";
import { getExamDatabase } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";
// The seed uses deterministic UUID-shaped identifiers; accept any canonical UUID bits.
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function OPTIONS(request: NextRequest) {
  return apiOptions(request);
}

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!UUID_PATTERN.test(id)) return apiJson(request, { error: "Invalid question-set ID." }, 400);

  try {
    const db = getExamDatabase();
    const { data: set, error: setError } = await db
      .from("question_sets")
      .select("id,exam_id,subject_id,year_id,title,description,question_count,source_type,metadata")
      .eq("id", id).eq("active", true).eq("status", "published").maybeSingle();
    if (setError) throw setError;
    if (!set || set.question_count < 1) return apiJson(request, { error: "Question set not found." }, 404);

    const [{ data: exam, error: examError }, { data: subject, error: subjectError }, { data: year, error: yearError }, { data: questions, error: questionsError }] = await Promise.all([
      db.from("exams").select("id,code,name").eq("id", set.exam_id).eq("active", true).maybeSingle(),
      db.from("subjects").select("id,code,name").eq("id", set.subject_id).eq("active", true).maybeSingle(),
      db.from("exam_years").select("id,year").eq("id", set.year_id).eq("active", true).maybeSingle(),
      db.from("questions").select("id,question_number,question_text,question_type,explanation,correct_option,source_type,metadata,question_options!question_options_question_id_fkey(id,option_key,option_text,sort_order)")
        .eq("question_set_id", id).eq("active", true).eq("status", "published").order("question_number"),
    ]);
    if (examError) throw examError;
    if (subjectError) throw subjectError;
    if (yearError) throw yearError;
    if (questionsError) throw questionsError;
    if (!exam || !subject || !year) return apiJson(request, { error: "Question set is not available." }, 404);

    const playableQuestions = (questions ?? []).map((question) => ({
      id: question.id,
      number: question.question_number,
      question: question.question_text,
      type: question.question_type,
      explanation: question.explanation,
      correctAnswer: question.correct_option,
      sourceType: question.source_type,
      metadata: question.metadata,
      options: [...(question.question_options ?? [])]
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((option) => ({ key: option.option_key, text: option.option_text })),
    }));

    return apiJson(request, {
      id: set.id,
      title: set.title,
      description: set.description,
      sourceType: set.source_type,
      questionCount: playableQuestions.length,
      exam: { id: exam.id, code: exam.code, name: exam.name },
      subject: { id: subject.id, code: subject.code, name: subject.name },
      year: { id: year.id, value: String(year.year) },
      questions: playableQuestions,
    });
  } catch (error) {
    console.error("Question-set query failed", error);
    return apiJson(request, { error: "Question set is temporarily unavailable." }, 503);
  }
}
