alter table public.profiles
  add constraint profiles_display_name_length check (display_name is null or char_length(display_name) between 1 and 60) not valid;
alter table public.profiles validate constraint profiles_display_name_length;

alter table public.simulations
  add constraint simulations_course_length check (char_length(course) between 1 and 80) not valid,
  add constraint simulations_tags_limit check (cardinality(tags) <= 8) not valid,
  add constraint simulations_hash_length check (char_length(hash) <= 2000) not valid;
alter table public.simulations validate constraint simulations_course_length;
alter table public.simulations validate constraint simulations_tags_limit;
alter table public.simulations validate constraint simulations_hash_length;

drop policy if exists "users update own profile" on public.profiles;
create policy "users update own profile" on public.profiles for update to authenticated
using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

drop policy if exists "public simulations are readable" on public.simulations;
create policy "public simulations are readable" on public.simulations for select to anon, authenticated
using (is_public or owner_id = (select auth.uid()));
drop policy if exists "users publish own simulations" on public.simulations;
create policy "users publish own simulations" on public.simulations for insert to authenticated
with check (owner_id = (select auth.uid()));
drop policy if exists "owners update simulations" on public.simulations;
create policy "owners update simulations" on public.simulations for update to authenticated
using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
drop policy if exists "owners delete simulations" on public.simulations;
create policy "owners delete simulations" on public.simulations for delete to authenticated
using (owner_id = (select auth.uid()));
drop policy if exists "users like as themselves" on public.likes;
create policy "users like as themselves" on public.likes for insert to authenticated
with check (user_id = (select auth.uid()) and exists (select 1 from public.simulations s where s.id = simulation_id and s.is_public));
drop policy if exists "users remove own likes" on public.likes;
create policy "users remove own likes" on public.likes for delete to authenticated
using (user_id = (select auth.uid()));

revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.touch_simulation_updated_at() from public, anon, authenticated;

alter publication supabase_realtime add table public.simulations;
alter publication supabase_realtime add table public.likes;

create index if not exists likes_user_idx on public.likes (user_id);
