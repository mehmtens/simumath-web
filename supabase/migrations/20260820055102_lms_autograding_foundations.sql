create table public.courses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  join_code text not null default upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 6)) unique check (join_code ~ '^[A-Z0-9]{6}$'),
  lti_issuer text,
  lti_deployment_id text,
  created_at timestamptz not null default now(),
  unique nulls not distinct (lti_issuer, lti_deployment_id)
);

create table public.course_members (
  course_id uuid not null references public.courses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('instructor', 'learner')),
  created_at timestamptz not null default now(),
  primary key (course_id, user_id)
);

create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  module text not null check (module in ('ode','matrix','fourier','network','dfa','hardware','challenge','exam')),
  launch_hash text not null check (launch_hash like '#%'),
  grading_spec jsonb not null default '{"version":1,"rules":[]}'::jsonb,
  max_score numeric(8,2) not null default 100 check (max_score > 0),
  due_at timestamptz,
  lti_resource_link_id text,
  created_at timestamptz not null default now()
);

create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  learner_id uuid not null references auth.users(id) on delete cascade,
  attempt integer not null default 1 check (attempt > 0),
  state jsonb not null,
  score numeric(8,2) check (score >= 0),
  grading_result jsonb,
  status text not null default 'submitted' check (status in ('submitted','graded','returned')),
  submitted_at timestamptz not null default now(),
  graded_at timestamptz,
  unique (assignment_id, learner_id, attempt)
);

alter table public.courses enable row level security;
alter table public.course_members enable row level security;
alter table public.assignments enable row level security;
alter table public.submissions enable row level security;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

create or replace function private.has_course_role(target_course uuid, actor uuid, allowed_roles text[])
returns boolean language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.course_members where course_id = target_course and user_id = actor and role = any(allowed_roles)) $$;
revoke all on function private.has_course_role(uuid, uuid, text[]) from public, anon;
grant execute on function private.has_course_role(uuid, uuid, text[]) to authenticated;

create or replace function private.can_manage_course(target_course uuid, actor uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.courses where id = target_course and owner_id = actor)
    or private.has_course_role(target_course, actor, array['instructor'])
$$;
revoke all on function private.can_manage_course(uuid, uuid) from public, anon;
grant execute on function private.can_manage_course(uuid, uuid) to authenticated;

create policy "course members read courses" on public.courses for select to authenticated
using (owner_id = (select auth.uid()) or (select private.has_course_role(id, auth.uid(), array['instructor','learner'])));
create policy "instructors create courses" on public.courses for insert to authenticated with check (owner_id = (select auth.uid()));
create policy "owners update courses" on public.courses for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "owners delete courses" on public.courses for delete to authenticated using (owner_id = (select auth.uid()));

create policy "members read course roster" on public.course_members for select to authenticated
using (user_id = (select auth.uid()) or (select private.has_course_role(course_id, auth.uid(), array['instructor'])));
create policy "owners manage course roster" on public.course_members for all to authenticated
using ((select private.can_manage_course(course_id, auth.uid())))
with check ((select private.can_manage_course(course_id, auth.uid())));

create policy "members read assignments" on public.assignments for select to authenticated
using ((select private.has_course_role(course_id, auth.uid(), array['instructor','learner'])));
create policy "instructors create assignments" on public.assignments for insert to authenticated
with check (created_by = (select auth.uid()) and (select private.has_course_role(course_id, auth.uid(), array['instructor'])));
create policy "authors update assignments" on public.assignments for update to authenticated
using (created_by = (select auth.uid()) and (select private.has_course_role(course_id, auth.uid(), array['instructor'])))
with check (created_by = (select auth.uid()) and (select private.has_course_role(course_id, auth.uid(), array['instructor'])));
create policy "authors delete assignments" on public.assignments for delete to authenticated
using (created_by = (select auth.uid()) and (select private.has_course_role(course_id, auth.uid(), array['instructor'])));

create policy "learners read own submissions" on public.submissions for select to authenticated
using (learner_id = (select auth.uid()) or exists (
  select 1 from public.assignments a join public.course_members m on m.course_id = a.course_id
  where a.id = assignment_id and m.user_id = (select auth.uid()) and m.role = 'instructor'
));
create policy "learners create own submissions" on public.submissions for insert to authenticated
with check (learner_id = (select auth.uid()) and exists (
  select 1 from public.assignments a join public.course_members m on m.course_id = a.course_id
  where a.id = assignment_id and m.user_id = (select auth.uid()) and m.role = 'learner'
));

grant select, insert, update, delete on public.courses, public.course_members, public.assignments, public.submissions to authenticated;

revoke insert, update, delete on public.submissions from authenticated;

create or replace function public.submit_assignment(target_assignment uuid, submission_state jsonb)
returns public.submissions
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.assignments;
  result public.submissions;
  rule jsonb;
  earned numeric := 0;
  available numeric := 0;
  weight numeric;
  passed boolean;
  next_attempt integer;
  details jsonb := '[]'::jsonb;
begin
  if (select auth.uid()) is null then raise exception 'authentication required'; end if;
  select * into target from public.assignments where id = target_assignment;
  if target.id is null then raise exception 'assignment not found'; end if;
  if not exists (
    select 1 from public.course_members m
    where m.course_id = target.course_id and m.user_id = (select auth.uid()) and m.role = 'learner'
  ) then raise exception 'learner membership required'; end if;

  for rule in select value from jsonb_array_elements(coalesce(target.grading_spec->'rules', '[]'::jsonb)) loop
    weight := greatest(0, coalesce((rule->>'weight')::numeric, 1));
    available := available + weight;
    passed := case rule->>'type'
      when 'route' then submission_state->>'route' = rule->>'expected'
      when 'param_equals' then abs(coalesce((submission_state->'params'->>(rule->>'key'))::numeric, 0) - (rule->>'expected')::numeric) <= coalesce((rule->>'tolerance')::numeric, 0.000001)
      when 'param_range' then coalesce((submission_state->'params'->>(rule->>'key'))::numeric, '-Infinity'::numeric) between (rule->>'min')::numeric and (rule->>'max')::numeric
      else false
    end;
    if passed then earned := earned + weight; end if;
    details := details || jsonb_build_array(jsonb_build_object('type', rule->>'type', 'key', rule->>'key', 'passed', passed, 'weight', weight));
  end loop;
  select coalesce(max(attempt), 0) + 1 into next_attempt from public.submissions where assignment_id = target.id and learner_id = (select auth.uid());
  insert into public.submissions (assignment_id, learner_id, attempt, state, score, grading_result, status, graded_at)
  values (target.id, (select auth.uid()), next_attempt, submission_state,
    case when available = 0 then 0 else round(target.max_score * earned / available, 2) end,
    jsonb_build_object('version', 1, 'earnedWeight', earned, 'availableWeight', available, 'rules', details), 'graded', now())
  returning * into result;
  return result;
end;
$$;

revoke all on function public.submit_assignment(uuid, jsonb) from public, anon;
grant execute on function public.submit_assignment(uuid, jsonb) to authenticated;

create or replace function public.join_course(requested_code text)
returns public.courses
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.courses;
begin
  if (select auth.uid()) is null then raise exception 'authentication required'; end if;
  select * into target from public.courses where join_code = upper(trim(requested_code));
  if target.id is null then raise exception 'course not found'; end if;
  insert into public.course_members (course_id, user_id, role)
  values (target.id, (select auth.uid()), 'learner') on conflict do nothing;
  return target;
end;
$$;
revoke all on function public.join_course(text) from public, anon;
grant execute on function public.join_course(text) to authenticated;
