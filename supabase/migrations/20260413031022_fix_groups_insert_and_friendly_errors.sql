-- 1. Allow users to insert their own profile (needed for upsert safety on signup edge cases)
create policy "Users can insert own profile" on public.profiles
  for insert with check (auth.uid() = id);

-- 2. Fix groups INSERT: drop created_by FK so RLS check isn't blocked by profile visibility,
--    and use a simple authenticated-user check instead.
alter table public.groups drop constraint if exists groups_created_by_fkey;
alter table public.groups add constraint groups_created_by_fkey
  foreign key (created_by) references public.profiles(id) on delete set null
  deferrable initially deferred;

-- 3. Replace groups INSERT policy with one that only requires authentication
drop policy if exists "Authenticated users can create groups" on public.groups;
create policy "Authenticated users can create groups" on public.groups
  for insert with check (auth.uid() is not null);
