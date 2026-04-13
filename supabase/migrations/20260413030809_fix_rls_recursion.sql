-- Fix infinite recursion in group_members RLS policy.
-- The SELECT policy was querying group_members from within group_members,
-- causing a recursive loop. Use a security definer function to break the cycle.

create or replace function public.is_group_member(gid uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.group_members
    where group_id = gid and user_id = auth.uid()
  );
$$;

-- Fix group_members SELECT policy
drop policy if exists "Members can view others in same group" on public.group_members;
create policy "Members can view others in same group" on public.group_members
  for select using (public.is_group_member(group_id));

-- Fix groups SELECT policy (also queried group_members, same risk)
drop policy if exists "Group members can view group" on public.groups;
create policy "Group members can view group" on public.groups
  for select using (public.is_group_member(id));
