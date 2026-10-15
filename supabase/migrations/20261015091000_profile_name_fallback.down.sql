-- Reverts 20261015091000_profile_name_fallback.sql: handle_new_user as in 20261015090000_profile_editing.sql.

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
  fallback text := 'member-' || substr(replace(new.id::text, '-', ''), 1, 8);
  -- Never derive a public name from an email address.
  name text := left(coalesce(
    gh,
    nullif(btrim(meta ->> 'full_name'), ''),
    nullif(btrim(meta ->> 'name'), ''),
    fallback
  ), 80);
begin
  if private.is_reserved_display_name(name)
     or exists (select 1 from public.profiles p where private.display_name_key(p.display_name) = private.display_name_key(name)) then
    name := fallback;
  end if;
  insert into public.profiles (id, display_name, github_username)
  values (new.id, name, case when gh ~ '^[A-Za-z0-9][A-Za-z0-9-]{0,38}$' then gh end)
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;
