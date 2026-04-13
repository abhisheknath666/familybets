-- RPC functions for group operations.
-- security definer = runs as the DB owner, bypassing RLS.
-- This is the standard Supabase pattern for multi-table writes that need elevated permissions.

-- Create a group and add the caller as a member in one atomic operation
create or replace function public.create_group(group_name text)
returns json language plpgsql security definer as $$
declare
  new_group public.groups;
  caller_name text;
begin
  -- Ensure profile exists (safety net if trigger was delayed)
  caller_name := coalesce(
    (current_setting('request.jwt.claims', true)::json->>'name'),
    split_part((current_setting('request.jwt.claims', true)::json->>'email'), '@', 1),
    'User'
  );
  insert into public.profiles (id, name)
  values (auth.uid(), caller_name)
  on conflict (id) do nothing;

  -- Create the group
  insert into public.groups (name, created_by)
  values (group_name, auth.uid())
  returning * into new_group;

  -- Add creator as a member
  insert into public.group_members (user_id, group_id)
  values (auth.uid(), new_group.id);

  return row_to_json(new_group);
end;
$$;

-- Join a group by invite code in one atomic operation
create or replace function public.join_group(code text)
returns json language plpgsql security definer as $$
declare
  target_group public.groups;
  caller_name text;
begin
  -- Ensure profile exists
  caller_name := coalesce(
    (current_setting('request.jwt.claims', true)::json->>'name'),
    split_part((current_setting('request.jwt.claims', true)::json->>'email'), '@', 1),
    'User'
  );
  insert into public.profiles (id, name)
  values (auth.uid(), caller_name)
  on conflict (id) do nothing;

  -- Find the group
  select * into target_group
  from public.groups
  where join_code = upper(code);

  if not found then
    raise exception 'No group found with that invite code.';
  end if;

  -- Add member (will error naturally on duplicate)
  insert into public.group_members (user_id, group_id)
  values (auth.uid(), target_group.id)
  on conflict (user_id, group_id) do nothing;

  return row_to_json(target_group);
end;
$$;
