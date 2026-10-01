import { NextRequest } from "next/server";
import { apiJson, apiOptions } from "@/lib/http";
import { getExamDatabase, selectAll } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

type ExamRow = { id: string; code: string; name: string; description: string; display_order: number; visual_metadata: Record<string, unknown>; active: boolean };
type SubjectRow = { id: string; code: string; name: string; description: string; visual_metadata: Record<string, unknown>; active: boolean };
type LinkRow = { exam_id: string; subject_id: string; active: boolean };
type YearRow = { id: string; exam_id: string; year: number; active: boolean };
type SetRow = {
  id: string; exam_id: string; subject_id: string; year_id: string; title: string;
  description: string; question_count: number; source_type: string; active: boolean;
  status: string; metadata: Record<string, unknown>;
};

export async function OPTIONS(request: NextRequest) {
  return apiOptions(request);
}

export async function GET(request: NextRequest) {
  try {
    getExamDatabase();
    const [exams, subjects, links, years, sets] = await Promise.all([
      selectAll<ExamRow>("exams", "id,code,name,description,display_order,visual_metadata,active", (q) => q.eq("active", true).order("display_order").order("code")),
      selectAll<SubjectRow>("subjects", "id,code,name,description,visual_metadata,active", (q) => q.eq("active", true).order("name")),
      selectAll<LinkRow>("exam_subjects", "exam_id,subject_id,active", (q) => q.eq("active", true)),
      selectAll<YearRow>("exam_years", "id,exam_id,year,active", (q) => q.eq("active", true)),
      selectAll<SetRow>("question_sets", "id,exam_id,subject_id,year_id,title,description,question_count,source_type,active,status,metadata", (q) => q.eq("active", true).eq("status", "published")),
    ]);
    const subjectsById = new Map(subjects.map((subject) => [subject.id, subject]));
    const yearsById = new Map(years.map((year) => [year.id, year]));
    const responseExams = exams.map((exam) => {
      const examSubjects = links
        .filter((link) => link.exam_id === exam.id)
        .map((link) => subjectsById.get(link.subject_id))
        .filter((subject): subject is SubjectRow => Boolean(subject))
        .sort((a, b) => a.name.localeCompare(b.name));
      const examYears = years.filter((year) => year.exam_id === exam.id).sort((a, b) => a.year - b.year);
      const examSets = sets.filter((set) => set.exam_id === exam.id && set.question_count > 0);
      const subjectYears: Record<string, string[]> = {};
      for (const set of examSets) {
        const subject = subjectsById.get(set.subject_id);
        const year = yearsById.get(set.year_id);
        if (!subject || !year) continue;
        const list = (subjectYears[subject.name] ??= []);
        const value = String(year.year);
        if (!list.includes(value)) list.push(value);
      }
      for (const values of Object.values(subjectYears)) values.sort();

      const questionSets = examSets.flatMap((set) => {
        const subject = subjectsById.get(set.subject_id);
        const year = yearsById.get(set.year_id);
        if (!subject || !year) return [];
        return [{
          id: set.id,
          subjectId: subject.id,
          subjectCode: subject.code,
          subjectName: subject.name,
          yearId: year.id,
          year: String(year.year),
          title: set.title,
          questionCount: set.question_count,
          sourceType: set.source_type,
          metadata: set.metadata,
        }];
      }).sort((a, b) => a.year.localeCompare(b.year) || a.subjectName.localeCompare(b.subjectName));

      return {
        id: exam.id,
        code: exam.code,
        name: exam.name,
        description: exam.description,
        displayOrder: exam.display_order,
        visualMetadata: exam.visual_metadata,
        hasQuestions: questionSets.length > 0,
        totalCount: questionSets.reduce((sum, set) => sum + set.questionCount, 0),
        // `subjects` and `subjectYears` preserve the current Godot availability contract.
        subjects: examSubjects.map((subject) => subject.name),
        subjectDetails: examSubjects.map((subject) => ({
          id: subject.id, code: subject.code, name: subject.name,
          description: subject.description, visualMetadata: subject.visual_metadata,
        })),
        years: examYears.map((year) => String(year.year)),
        yearDetails: examYears.map((year) => ({ id: year.id, year: String(year.year) })),
        subjectYears,
        questionSets,
      };
    });

    return apiJson(request, { exams: responseExams });
  } catch (error) {
    console.error("Exam availability query failed", error);
    return apiJson(request, { error: "Exam availability is temporarily unavailable." }, 503);
  }
}
