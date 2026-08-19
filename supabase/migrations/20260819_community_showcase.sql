create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.simulations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  description text not null default '' check (char_length(description) <= 1000),
  course text not null default 'Genel',
  module text not null check (module in ('ode','matrix','fourier','network','dfa','hardware')),
  hash text not null check (hash like '#%'),
  tags text[] not null default '{}',
  is_public boolean not null default true,
  forked_from uuid references public.simulations(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.likes (
  simulation_id uuid not null references public.simulations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (simulation_id, user_id)
);

create index if not exists simulations_public_created_idx on public.simulations (is_public, created_at desc);
create index if not exists simulations_owner_idx on public.simulations (owner_id, created_at desc);
create index if not exists simulations_forked_from_idx on public.simulations (forked_from);
create index if not exists likes_simulation_idx on public.likes (simulation_id);

alter table public.profiles enable row level security;
alter table public.simulations enable row level security;
alter table public.likes enable row level security;

create policy "profiles are publicly readable"
on public.profiles for select
to anon, authenticated
using (true);

create policy "users update own profile"
on public.profiles for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "public simulations are readable"
on public.simulations for select
to anon, authenticated
using (is_public or owner_id = auth.uid());

create policy "users publish own simulations"
on public.simulations for insert
to authenticated
with check (owner_id = auth.uid());

create policy "owners update simulations"
on public.simulations for update
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create policy "owners delete simulations"
on public.simulations for delete
to authenticated
using (owner_id = auth.uid());

create policy "likes are publicly readable"
on public.likes for select
to anon, authenticated
using (true);

create policy "users like as themselves"
on public.likes for insert
to authenticated
with check (user_id = auth.uid());

create policy "users remove own likes"
on public.likes for delete
to authenticated
using (user_id = auth.uid());

grant select on public.profiles, public.simulations, public.likes to anon;
grant select, insert, update, delete on public.profiles, public.simulations, public.likes to authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.touch_simulation_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists simulations_touch_updated_at on public.simulations;
create trigger simulations_touch_updated_at
before update on public.simulations
for each row execute procedure public.touch_simulation_updated_at();
