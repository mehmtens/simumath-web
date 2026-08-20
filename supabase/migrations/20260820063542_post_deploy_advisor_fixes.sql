create index if not exists courses_owner_idx on public.courses (owner_id);
create index if not exists course_members_user_idx on public.course_members (user_id);
create index if not exists assignments_course_idx on public.assignments (course_id);
create index if not exists assignments_creator_idx on public.assignments (created_by);
create index if not exists submissions_learner_idx on public.submissions (learner_id);

drop policy if exists "owners manage course roster" on public.course_members;
create policy "instructors add course members"
on public.course_members for insert to authenticated
with check ((select private.can_manage_course(course_id, (select auth.uid()))));
create policy "instructors update course members"
on public.course_members for update to authenticated
using ((select private.can_manage_course(course_id, (select auth.uid()))))
with check ((select private.can_manage_course(course_id, (select auth.uid()))));
create policy "instructors remove course members"
on public.course_members for delete to authenticated
using ((select private.can_manage_course(course_id, (select auth.uid()))));

drop policy if exists "members read assignments" on public.assignments;
create policy "members read assignments"
on public.assignments for select to authenticated
using ((select private.has_course_role(course_id, (select auth.uid()), array['instructor','learner'])));
