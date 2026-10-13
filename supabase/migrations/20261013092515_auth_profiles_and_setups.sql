-- Kitloom: accounts and community-published setups.
--
-- The site is a static export, so the browser talks to this database directly with the
-- publishable key. Row Level Security and column-level grants below are therefore the
-- only access control. Read them as the security boundary, not as a convenience.

-- ---------------------------------------------------------------------------
-- profiles: the public face of an account. Created by trigger, not by the user,
-- so a display name always comes from the sign-in identity.
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 80),
  github_username text check (github_username ~ '^[A-Za-z0-9][A-Za-z0-9-]{0,38}$'),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Profiles are public"
  on public.profiles for select
  to anon, authenticated
  using (true);

revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to anon, authenticated;

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  provider text := coalesce(new.raw_app_meta_data ->> 'provider', 'email');
  gh text := case when provider = 'github' then nullif(btrim(meta ->> 'user_name'), '') end;
  -- Never derive a public name from an email address.
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

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- setups: community listings. The package itself stays in the creator's public
-- GitHub repository; only the link and descriptive metadata are stored here.
-- ---------------------------------------------------------------------------
create table public.setups (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  slug text not null unique
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) between 3 and 64),
  name text not null check (char_length(btrim(name)) between 2 and 80),
  description text not null check (char_length(btrim(description)) between 20 and 280),
  agents text[] not null
    check (
      cardinality(agents) between 1 and 9
      and agents <@ array['claude-code','codex','cursor','antigravity','gemini-cli','github-copilot','windsurf','opencode','aider']
    ),
  categories text[] not null
    check (
      cardinality(categories) between 1 and 5
      and categories <@ array['skills-workflows','development-review','testing-debugging','documentation','productivity']
    ),
  tags text[] not null default '{}' check (cardinality(tags) <= 8),
  version text check (version ~ '^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$'),
  license text check (license ~ '^[A-Za-z0-9][A-Za-z0-9.+-]{0,63}$'),
  -- Only public GitHub repositories. The download link is derived from this in the app.
  repository_url text not null
    check (repository_url ~ '^https://github\.com/[A-Za-z0-9_.-]{1,100}/[A-Za-z0-9_.-]{1,100}$'),
  default_branch text check (default_branch ~ '^[A-Za-z0-9._/-]{1,255}$' and default_branch !~ '\.\.'),
  readme text check (char_length(readme) <= 40000),
  manifest jsonb not null default '[]'::jsonb
    check (jsonb_typeof(manifest) = 'array' and jsonb_array_length(manifest) <= 500),
  -- 'hidden' is set by a maintainer in the dashboard. Owners cannot change it.
  status text not null default 'published' check (status in ('published', 'hidden')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index setups_owner_id_idx on public.setups (owner_id);
create index setups_published_created_idx on public.setups (created_at desc) where status = 'published';

alter table public.setups enable row level security;

create policy "Published setups are public; owners see their own"
  on public.setups for select
  to anon, authenticated
  using (status = 'published' or owner_id = (select auth.uid()));

create policy "Signed-in users publish as themselves"
  on public.setups for insert
  to authenticated
  with check (owner_id = (select auth.uid()));

create policy "Owners update their own setups"
  on public.setups for update
  to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy "Owners delete their own setups"
  on public.setups for delete
  to authenticated
  using (owner_id = (select auth.uid()));

-- Column-level grants: a client can never set owner_id, status, id or timestamps.
-- owner_id comes from its default (auth.uid()); status from its default ('published').
revoke all on public.setups from anon, authenticated;
grant select on public.setups to anon, authenticated;
grant insert (slug, name, description, agents, categories, tags, version, license,
              repository_url, default_branch, readme, manifest)
  on public.setups to authenticated;
grant update (name, description, agents, categories, tags, version, license,
              repository_url, default_branch, readme, manifest)
  on public.setups to authenticated;
grant delete on public.setups to authenticated;

create function public.setups_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    -- A blunt cap so one account cannot flood the directory.
    if (select count(*) from public.setups s where s.owner_id = new.owner_id) >= 25 then
      raise exception 'You have reached the limit of 25 setups per account.'
        using errcode = 'P0001';
    end if;
  else
    new.updated_at := now();
  end if;
  if exists (
    select 1 from unnest(new.tags) t
    where t !~ '^[a-z0-9][a-z0-9.+-]{0,31}$'
  ) then
    raise exception 'Tags must be lowercase letters, digits, ".", "+" or "-", up to 32 characters.'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

revoke all on function public.setups_before_write() from public, anon, authenticated;

create trigger setups_before_write
  before insert or update on public.setups
  for each row execute function public.setups_before_write();

-- Accounts created before this migration get a profile too.
insert into public.profiles (id, display_name)
select u.id, 'member-' || substr(replace(u.id::text, '-', ''), 1, 8)
from auth.users u
on conflict (id) do nothing;
