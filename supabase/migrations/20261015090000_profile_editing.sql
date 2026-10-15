-- Profile editing: members may change their display name, a short bio and a website.
--
-- Display names are what other people see next to a listing, so the database guards them:
--   * unique regardless of case and spacing ("Kit Loom" and "kitloom" are the same name)
--   * reserved names (Kitloom itself, staff words, the agent vendors) cannot be chosen
--   * 3–40 characters, letters, digits, spaces, dot, underscore, hyphen; starts with a letter or digit
--   * changeable at most once a day, so a name cannot flicker to impersonate someone
-- github_username is not editable: it is set at sign-up from the GitHub identity and is
-- the only proof that an account belongs to a GitHub user.
--
-- Maintainer edits from the dashboard (no signed-in user) skip the reserved-name and
-- once-a-day checks, so the official Kitloom account can be named "Kitloom".

alter table public.profiles
  add column bio text check (bio is null or char_length(bio) <= 200),
  add column website_url text check (
    website_url is null or (char_length(website_url) <= 200 and website_url ~ '^https://[A-Za-z0-9.-]+\.[A-Za-z]{2,}(/[^[:space:]]*)?$')
  ),
  add column display_name_changed_at timestamptz;

create function private.display_name_key(name text)
returns text
language sql
immutable
set search_path = ''
as $$ select lower(regexp_replace(name, '[^[:alnum:]]', '', 'g')) $$;

revoke all on function private.display_name_key(text) from public, anon, authenticated;

-- Unique on the normalised key, so case, spaces and punctuation cannot fake a match.
create unique index profiles_display_name_key_idx on public.profiles (private.display_name_key(display_name));

create function private.is_reserved_display_name(name text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select private.display_name_key(name) ~ '^kitloom'
      or private.display_name_key(name) = any (array[
           'admin', 'administrator', 'moderator', 'mod', 'support', 'staff', 'official', 'team',
           'system', 'root', 'security', 'help', 'anthropic', 'claude', 'claudecode', 'openai',
           'chatgpt', 'codex', 'google', 'gemini', 'geminicli', 'antigravity', 'github', 'copilot',
           'microsoft', 'cursor', 'anysphere', 'supabase', 'cloudflare', 'vercel', 'windsurf',
           'devin', 'cognition', 'opencode', 'aider'
         ])
$$;

revoke all on function private.is_reserved_display_name(text) from public, anon, authenticated;

-- New accounts: never take a reserved or already-used name; fall back to member-xxxxxxxx.
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

-- SECURITY DEFINER so it can call the private helpers; it only reads and edits the row being written.
create function public.profiles_before_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.bio := nullif(btrim(new.bio), '');
  new.website_url := nullif(btrim(new.website_url), '');
  new.display_name := btrim(new.display_name);

  if new.display_name is distinct from old.display_name then
    if auth.uid() is not null then
      if char_length(new.display_name) not between 3 and 40
         or new.display_name !~ '^[[:alnum:]][[:alnum:] ._-]*$'
         or new.display_name ~ '  ' then
        raise exception 'Display names are 3–40 characters: letters, digits, spaces, ".", "_" or "-", starting with a letter or digit.'
          using errcode = 'P0001';
      end if;
      if private.is_reserved_display_name(new.display_name) or new.display_name ~* '^member-[0-9a-f]{8}$' then
        raise exception 'That name is reserved. Choose another.'
          using errcode = 'P0001';
      end if;
      if old.display_name_changed_at is not null and old.display_name_changed_at > now() - interval '1 day' then
        raise exception 'You can change your display name once a day. Try again tomorrow.'
          using errcode = 'P0001';
      end if;
    end if;
    new.display_name_changed_at := now();
  end if;
  return new;
end;
$$;

revoke all on function public.profiles_before_update() from public, anon, authenticated;

create trigger profiles_before_update
  before update on public.profiles
  for each row execute function public.profiles_before_update();

create policy "Members update their own profile"
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Only these three columns are writable; id, github_username and timestamps are not.
grant update (display_name, bio, website_url) on public.profiles to authenticated;
