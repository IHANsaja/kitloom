-- Reverts 20261015090000_profile_editing.sql.

revoke update (display_name, bio, website_url) on public.profiles from authenticated;
drop policy if exists "Members update their own profile" on public.profiles;
drop trigger if exists profiles_before_update on public.profiles;
drop function if exists public.profiles_before_update();

-- handle_new_user as defined in 20261013092515_auth_profiles_and_setups.sql.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  provider text := coalesce(new.raw_app_meta_data ->> 'provider', 'email');
  gh text := case when provider = 'github' then nullif(btrim(meta ->> 'user_name'), '') end;
  name text := coalesce(
    gh,
    nullif(btrim(meta ->> 'full_name'), ''),
    nullif(btrim(meta ->> 'name'), ''),
    'member-' || substr(replace(new.id::text, '-', ''), 1, 8)
  );
begin
  insert into public.profiles (id, display_name, github_username)
  values (
    new.id,
    left(name, 80),
    case when gh ~ '^[A-Za-z0-9][A-Za-z0-9-]{0,38}$' then gh end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

drop index if exists public.profiles_display_name_key_idx;
drop function if exists private.is_reserved_display_name(text);
drop function if exists private.display_name_key(text);

alter table public.profiles
  drop column if exists display_name_changed_at,
  drop column if exists website_url,
  drop column if exists bio;
