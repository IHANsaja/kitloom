-- Sign-up must never fail on a name clash. The neutral fallback name uses 8 hex digits of
-- the account id; if even that is taken, use all 32, which are unique.

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
  hex text := replace(new.id::text, '-', '');
  -- Never derive a public name from an email address.
  name text := left(coalesce(
    gh,
    nullif(btrim(meta ->> 'full_name'), ''),
    nullif(btrim(meta ->> 'name'), ''),
    'member-' || substr(hex, 1, 8)
  ), 80);
begin
  if private.is_reserved_display_name(name)
     or exists (select 1 from public.profiles p where private.display_name_key(p.display_name) = private.display_name_key(name)) then
    name := 'member-' || substr(hex, 1, 8);
    if exists (select 1 from public.profiles p where private.display_name_key(p.display_name) = private.display_name_key(name)) then
      name := 'member-' || hex;
    end if;
  end if;
  insert into public.profiles (id, display_name, github_username)
  values (new.id, name, case when gh ~ '^[A-Za-z0-9][A-Za-z0-9-]{0,38}$' then gh end)
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;
