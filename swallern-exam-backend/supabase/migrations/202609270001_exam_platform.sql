-- Dedicated Swallern Exam Platform schema. This database is separate from
-- the Swallern topics/lessons product and contains exam content only.
create extension if not exists pgcrypto with schema extensions;

create table public.exams (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code = upper(code) and code ~ '^[A-Z0-9_-]{2,24}$'),
  name text not null,
  description text not null default '',
  display_order smallint not null default 0,
  visual_metadata jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code = upper(code) and code ~ '^[A-Z0-9_-]{2,32}$'),
  name text not null,
  description text not null default '',
  visual_metadata jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- A subject is shared vocabulary; this explicit relation determines which
-- subjects are actually offered by each exam.
create table public.exam_subjects (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete restrict,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (exam_id, subject_id),
  unique (exam_id, subject_id, id)
);

create table public.exam_years (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams(id) on delete cascade,
  year smallint not null check (year between 1990 and 2100),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (exam_id, year),
  unique (exam_id, id)
);

create table public.question_sets (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete restrict,
  year_id uuid not null,
  title text not null,
  description text not null default '',
  question_count integer not null default 0 check (question_count >= 0),
  source_type text not null check (source_type in ('demo', 'past_question', 'imported', 'verified')),
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (exam_id, subject_id) references public.exam_subjects(exam_id, subject_id) on delete restrict,
  foreign key (exam_id, year_id) references public.exam_years(exam_id, id) on delete restrict,
  unique (exam_id, subject_id, year_id),
  unique (id, exam_id, subject_id, year_id)
);

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  question_set_id uuid not null references public.question_sets(id) on delete cascade,
  question_number integer not null check (question_number > 0),
  question_text text not null,
  question_type text not null default 'multiple_choice',
  explanation text not null default '',
  correct_option text not null check (correct_option ~ '^[A-Z0-9]{1,8}$'),
  source_type text not null check (source_type in ('demo', 'past_question', 'imported', 'verified')),
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (question_set_id, question_number),
  unique (id, question_set_id)
);

create table public.question_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  option_key text not null check (option_key ~ '^[A-Z0-9]{1,8}$'),
  option_text text not null,
  sort_order smallint not null default 0,
  unique (question_id, option_key),
  unique (question_id, sort_order)
);

alter table public.questions add constraint questions_correct_option_exists
  foreign key (id, correct_option) references public.question_options(question_id, option_key)
  deferrable initially deferred;

create index exams_active_code_idx on public.exams(active, code);
create index subjects_active_name_idx on public.subjects(active, name);
create index exam_subjects_lookup_idx on public.exam_subjects(exam_id, active, subject_id);
create index exam_years_lookup_idx on public.exam_years(exam_id, active, year desc);
create index question_sets_availability_idx on public.question_sets(exam_id, subject_id, year_id) where active and status = 'published';
create index question_sets_source_idx on public.question_sets(source_type, status, active);
create index questions_set_published_idx on public.questions(question_set_id, question_number) where active and status = 'published';
create index question_options_order_idx on public.question_options(question_id, sort_order);

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger exams_updated_at before update on public.exams for each row execute function public.set_updated_at();
create trigger subjects_updated_at before update on public.subjects for each row execute function public.set_updated_at();
create trigger question_sets_updated_at before update on public.question_sets for each row execute function public.set_updated_at();
create trigger questions_updated_at before update on public.questions for each row execute function public.set_updated_at();

-- Counts represent playable questions, not merely rows attached to a set.
create or replace function public.refresh_question_set_count(target_id uuid)
returns void language sql security definer set search_path = public as $$
  update public.question_sets qs
  set question_count = (
    select count(*)::integer from public.questions q
    where q.question_set_id = target_id and q.active and q.status = 'published'
  )
  where qs.id = target_id;
$$;

create or replace function public.maintain_question_set_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'DELETE' then
    perform public.refresh_question_set_count(old.question_set_id);
    return old;
  elsif tg_op = 'UPDATE' then
    perform public.refresh_question_set_count(old.question_set_id);
    if new.question_set_id <> old.question_set_id then perform public.refresh_question_set_count(new.question_set_id); end if;
    return new;
  else
    perform public.refresh_question_set_count(new.question_set_id);
    return new;
  end if;
end;
$$;

create trigger questions_count_after_write
after insert or update or delete on public.questions
for each row execute function public.maintain_question_set_count();

revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.refresh_question_set_count(uuid) from public, anon, authenticated;
revoke all on function public.maintain_question_set_count() from public, anon, authenticated;

alter table public.exams enable row level security;
alter table public.subjects enable row level security;
alter table public.exam_subjects enable row level security;
alter table public.exam_years enable row level security;
alter table public.question_sets enable row level security;
alter table public.questions enable row level security;
alter table public.question_options enable row level security;

create policy "public read active exams" on public.exams for select to anon, authenticated using (active);
create policy "public read active subjects" on public.subjects for select to anon, authenticated using (active);
create policy "public read active exam subject links" on public.exam_subjects for select to anon, authenticated
  using (active and exists (select 1 from public.exams e where e.id = exam_id and e.active)
    and exists (select 1 from public.subjects s where s.id = subject_id and s.active));
create policy "public read active exam years" on public.exam_years for select to anon, authenticated
  using (active and exists (select 1 from public.exams e where e.id = exam_id and e.active));
create policy "public read playable sets" on public.question_sets for select to anon, authenticated
  using (active and status = 'published'
    and exists (select 1 from public.exams e where e.id = exam_id and e.active)
    and exists (select 1 from public.subjects s where s.id = subject_id and s.active)
    and exists (select 1 from public.exam_years y where y.id = year_id and y.exam_id = exam_id and y.active));
create policy "public read playable questions" on public.questions for select to anon, authenticated
  using (active and status = 'published'
    and exists (select 1 from public.question_sets qs where qs.id = question_set_id and qs.active and qs.status = 'published'));
create policy "public read playable options" on public.question_options for select to anon, authenticated
  using (exists (select 1 from public.questions q join public.question_sets qs on qs.id = q.question_set_id
    where q.id = question_id and q.active and q.status = 'published' and qs.active and qs.status = 'published'));

grant select on public.exams, public.subjects, public.exam_subjects, public.exam_years,
  public.question_sets, public.questions, public.question_options to anon, authenticated;

comment on table public.exams is 'Exams available in the separate Swallern Exam Platform database.';
comment on table public.question_sets is 'Playable exam + subject + year collections; source_type identifies demo versus sourced content.';
