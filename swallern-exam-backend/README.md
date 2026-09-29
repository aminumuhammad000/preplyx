# Swallern Exam Platform API

This is a new, independent Next.js API and Supabase database for exam content. It does not reuse the old Swallern lessons/topics database. The Godot game connects only to this API; it never connects directly to Supabase.

## Supabase project

Use the new Supabase project named **Swallern Exam Platform**. Copy `.env.example` to `.env.local` and fill in that project's URL and publishable key. Keep any service-role key server-only; these read-only routes deliberately use the publishable key and RLS.

The project URL and publishable key are stored in the ignored local `.env.local`. A server secret key is also stored there for future privileged server work; it is not used by the public read routes, never bundled into the game, and must never be committed. The schema and seed are reproducible through the Supabase CLI:

```sh
npm install
npx supabase login
npx supabase link --project-ref YOUR_NEW_EXAM_PROJECT_REF
npx supabase db push
```

For a hosted project, apply `supabase/seed.sql` with the Supabase Dashboard SQL Editor after migrations. The seed is an additive upsert script; do not run a database reset against the linked hosted project.

For a local Supabase stack, run `npm run db:start` then `npm run db:reset`. The local reset recreates only this new local database and applies the configured seed. The seed is additive and upserts only its namespaced NECO/WAEC/JAMB demo records; it does not truncate or delete unrelated rows. It creates years 2000–2025, with playable synthetic sets for 2023–2025.

## API

- `GET /api/exams/availability` returns active exams, associated subjects, all active years, actual subject/year availability, playable question counts, and question-set IDs.
- `GET /api/exams/question-sets/:id` returns one published set and its published questions/options, with demo/source metadata.

Only active, published content is exposed under RLS. The question sets and questions are explicitly tagged `source_type: demo`, named `DEMO ONLY`, and are not represented as official past-paper questions.

Start with `npm run dev`. Set the Godot project's `swallern/content_api_base_url` to `http://localhost:3000/api` (or set `SWALLERN_API_BASE_URL` to the same value).

## Schema

The exam-specific relational chain is `exams → exam_subjects → subjects`, `exams → exam_years`, `question_sets → questions → question_options`. Composite foreign keys prevent a question set from joining a subject or year belonging to a different exam. User progress/battle tables are intentionally deferred until those flows are implemented.
