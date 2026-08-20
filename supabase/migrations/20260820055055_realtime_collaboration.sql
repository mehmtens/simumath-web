create table public.collaboration_rooms (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  join_code text not null unique check (join_code ~ '^[A-Z0-9]{6}$'),
  title text not null check (char_length(title) between 1 and 80),
  current_hash text not null default '#ode' check (current_hash like '#%'),
  is_locked boolean not null default false,
  expires_at timestamptz not null default (now() + interval '8 hours'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.collaboration_members (
  room_id uuid not null references public.collaboration_rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'participant' check (role in ('owner', 'participant')),
  joined_at timestamptz not null default now(),
  primary key (room_id, user_id)
);

create index collaboration_rooms_owner_idx on public.collaboration_rooms (owner_id, created_at desc);
create index collaboration_rooms_expiry_idx on public.collaboration_rooms (expires_at);
create index collaboration_members_user_idx on public.collaboration_members (user_id, joined_at desc);

alter table public.collaboration_rooms enable row level security;
alter table public.collaboration_members enable row level security;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

create or replace function private.is_collaboration_member(target_room uuid, actor uuid)
returns boolean language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.collaboration_members where room_id = target_room and user_id = actor) $$;
revoke all on function private.is_collaboration_member(uuid, uuid) from public, anon;
grant execute on function private.is_collaboration_member(uuid, uuid) to authenticated;

create policy "members read collaboration rooms"
on public.collaboration_rooms for select to authenticated
using (
  owner_id = (select auth.uid()) or (select private.is_collaboration_member(id, auth.uid()))
);

create policy "users create owned collaboration rooms"
on public.collaboration_rooms for insert to authenticated
with check (owner_id = (select auth.uid()));

create policy "owners update collaboration rooms"
on public.collaboration_rooms for update to authenticated
using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()));

create policy "owners delete collaboration rooms"
on public.collaboration_rooms for delete to authenticated
using (owner_id = (select auth.uid()));

create policy "members read room membership"
on public.collaboration_members for select to authenticated
using (
  user_id = (select auth.uid()) or (select private.is_collaboration_member(room_id, auth.uid()))
);

create policy "users join rooms as themselves"
on public.collaboration_members for insert to authenticated
with check (
  user_id = (select auth.uid()) and (
    role = 'participant' or (role = 'owner' and exists (
      select 1 from public.collaboration_rooms room
      where room.id = room_id and room.owner_id = (select auth.uid())
    ))
  )
);

create policy "users leave rooms"
on public.collaboration_members for delete to authenticated
using (user_id = (select auth.uid()));

grant select, insert, update, delete on public.collaboration_rooms to authenticated;
grant select, insert, delete on public.collaboration_members to authenticated;

create or replace function public.create_collaboration_room(room_title text, initial_hash text default '#ode')
returns public.collaboration_rooms
language plpgsql
security definer
set search_path = ''
as $$
declare
  created_room public.collaboration_rooms;
begin
  if (select auth.uid()) is null then raise exception 'authentication required'; end if;
  insert into public.collaboration_rooms (owner_id, join_code, title, current_hash)
  values ((select auth.uid()), upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 6)), coalesce(nullif(left(trim(room_title), 80), ''), 'Canlı SimuMath Oturumu'), initial_hash)
  returning * into created_room;
  insert into public.collaboration_members (room_id, user_id, role)
  values (created_room.id, (select auth.uid()), 'owner');
  return created_room;
end;
$$;

create or replace function public.join_collaboration_room(requested_code text)
returns public.collaboration_rooms
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_room public.collaboration_rooms;
begin
  if (select auth.uid()) is null then raise exception 'authentication required'; end if;
  select * into target_room from public.collaboration_rooms
  where join_code = upper(trim(requested_code)) and expires_at > now() and not is_locked;
  if target_room.id is null then raise exception 'room not found or unavailable'; end if;
  insert into public.collaboration_members (room_id, user_id, role)
  values (target_room.id, (select auth.uid()), 'participant') on conflict do nothing;
  return target_room;
end;
$$;

revoke all on function public.create_collaboration_room(text, text) from public, anon;
revoke all on function public.join_collaboration_room(text) from public, anon;
grant execute on function public.create_collaboration_room(text, text) to authenticated;
grant execute on function public.join_collaboration_room(text) to authenticated;

create policy "room members receive collaboration realtime"
on realtime.messages for select to authenticated
using (
  extension in ('broadcast', 'presence') and exists (
    select 1 where private.is_collaboration_member(replace((select realtime.topic()), 'room:', '')::uuid, (select auth.uid()))
  )
);

create policy "room members send collaboration realtime"
on realtime.messages for insert to authenticated
with check (
  extension in ('broadcast', 'presence') and exists (
    select 1 where private.is_collaboration_member(replace((select realtime.topic()), 'room:', '')::uuid, (select auth.uid()))
  )
);
