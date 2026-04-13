-- FamilyBets Schema
-- Run this in Supabase SQL editor

-- ─── Extensions ──────────────────────────────────────────────────────────────
create extension if not exists "pgcrypto";

-- ─── Users (extends Supabase auth.users) ─────────────────────────────────────
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  name        text not null,
  avatar_url  text,
  created_at  timestamptz default now()
);
alter table public.profiles enable row level security;
create policy "Public profiles are viewable by group members" on public.profiles
  for select using (true);
create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

-- ─── Groups ───────────────────────────────────────────────────────────────────
create table public.groups (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  join_code   text not null unique default upper(substring(gen_random_uuid()::text, 1, 6)),
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz default now()
);
alter table public.groups enable row level security;
create policy "Group members can view group" on public.groups
  for select using (
    exists (select 1 from public.group_members where group_id = id and user_id = auth.uid())
  );
create policy "Authenticated users can create groups" on public.groups
  for insert with check (auth.uid() = created_by);

-- ─── Group Members ────────────────────────────────────────────────────────────
create table public.group_members (
  user_id     uuid references public.profiles(id) on delete cascade,
  group_id    uuid references public.groups(id) on delete cascade,
  tokens      numeric not null default 100,
  joined_at   timestamptz default now(),
  primary key (user_id, group_id)
);
alter table public.group_members enable row level security;
create policy "Members can view other members in same group" on public.group_members
  for select using (
    exists (select 1 from public.group_members gm where gm.group_id = group_id and gm.user_id = auth.uid())
  );
create policy "Users can insert themselves into groups" on public.group_members
  for insert with check (auth.uid() = user_id);
create policy "Users can update own token balance" on public.group_members
  for update using (auth.uid() = user_id);

-- ─── Markets ──────────────────────────────────────────────────────────────────
create type market_status as enum ('open', 'voting', 'resolved', 'cancelled');
create type market_category as enum ('Food', 'Fitness', 'Finance', 'Life', 'Fun');

create table public.markets (
  id                   uuid primary key default gen_random_uuid(),
  group_id             uuid not null references public.groups(id) on delete cascade,
  creator_id           uuid not null references public.profiles(id) on delete cascade,
  title                text not null,
  description          text,
  category             market_category not null default 'Fun',
  close_date           timestamptz not null,
  resolution_criteria  text not null,
  status               market_status not null default 'open',
  yes_pool             numeric not null default 50,
  no_pool              numeric not null default 50,
  resolution           boolean,    -- true=YES, false=NO, null=pending
  resolved_at          timestamptz,
  created_at           timestamptz default now()
);
alter table public.markets enable row level security;
create policy "Group members can view markets" on public.markets
  for select using (
    exists (select 1 from public.group_members where group_id = markets.group_id and user_id = auth.uid())
  );
create policy "Group members can create markets" on public.markets
  for insert with check (
    auth.uid() = creator_id and
    exists (select 1 from public.group_members where group_id = markets.group_id and user_id = auth.uid())
  );
create policy "Group members can update markets" on public.markets
  for update using (
    exists (select 1 from public.group_members where group_id = markets.group_id and user_id = auth.uid())
  );

-- ─── Positions ────────────────────────────────────────────────────────────────
create table public.positions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  market_id   uuid not null references public.markets(id) on delete cascade,
  side        text not null check (side in ('YES', 'NO')),
  shares      numeric not null default 0,
  cost_basis  numeric not null default 0,
  unique (user_id, market_id, side)
);
alter table public.positions enable row level security;
create policy "Users can view positions in their groups" on public.positions
  for select using (
    exists (
      select 1 from public.markets m
      join public.group_members gm on gm.group_id = m.group_id
      where m.id = market_id and gm.user_id = auth.uid()
    )
  );
create policy "Users can manage own positions" on public.positions
  for all using (auth.uid() = user_id);

-- ─── Transactions ─────────────────────────────────────────────────────────────
create type tx_type as enum ('bet', 'payout', 'reset', 'refund');

create table public.transactions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  market_id     uuid references public.markets(id) on delete set null,
  group_id      uuid not null references public.groups(id) on delete cascade,
  type          tx_type not null,
  tokens_delta  numeric not null,
  shares_delta  numeric,
  side          text check (side in ('YES', 'NO')),
  note          text,
  created_at    timestamptz default now()
);
alter table public.transactions enable row level security;
create policy "Users can view own transactions" on public.transactions
  for select using (auth.uid() = user_id);
create policy "Users can insert own transactions" on public.transactions
  for insert with check (auth.uid() = user_id);

-- ─── Resolution Votes ─────────────────────────────────────────────────────────
create table public.resolution_votes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  market_id   uuid not null references public.markets(id) on delete cascade,
  vote        boolean not null,  -- true=YES, false=NO
  created_at  timestamptz default now(),
  unique (user_id, market_id)
);
alter table public.resolution_votes enable row level security;
create policy "Group members can view votes" on public.resolution_votes
  for select using (
    exists (
      select 1 from public.markets m
      join public.group_members gm on gm.group_id = m.group_id
      where m.id = market_id and gm.user_id = auth.uid()
    )
  );
create policy "Users can cast own vote" on public.resolution_votes
  for insert with check (auth.uid() = user_id);

-- ─── Leaderboard Snapshots ────────────────────────────────────────────────────
create table public.leaderboard_snapshots (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  group_id        uuid not null references public.groups(id) on delete cascade,
  month           text not null,  -- YYYY-MM
  tokens_earned   numeric not null default 0,
  win_rate        numeric,        -- 0.0–1.0
  biggest_win     numeric,
  markets_bet     int default 0,
  unique (user_id, group_id, month)
);
alter table public.leaderboard_snapshots enable row level security;
create policy "Group members can view leaderboard" on public.leaderboard_snapshots
  for select using (
    exists (select 1 from public.group_members where group_id = leaderboard_snapshots.group_id and user_id = auth.uid())
  );
create policy "Allow insert for leaderboard" on public.leaderboard_snapshots
  for insert with check (auth.uid() = user_id);

-- ─── Realtime ─────────────────────────────────────────────────────────────────
-- Enable realtime on markets and positions (do this in Supabase dashboard
-- under Database > Replication, or run:)
-- alter publication supabase_realtime add table public.markets;
-- alter publication supabase_realtime add table public.positions;
-- alter publication supabase_realtime add table public.transactions;

-- ─── Auto-create profile on signup ───────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
