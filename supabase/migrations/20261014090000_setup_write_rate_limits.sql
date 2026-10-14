-- Rate limits on publishing, so a script cannot flood the directory or hammer the database.
--
--   * at most 5 new setups per account per hour
--   * at most 60 writes (new setups plus edits) per account per hour
--
-- Writes are recorded in private.setup_writes. The private schema is not exposed through
-- the Data API and grants nothing to anon or authenticated, so the log can be neither read
-- nor tampered with from the browser. Deleting a setup does not remove its log entries,
-- so delete-and-republish cannot be used to dodge the limits.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table private.setup_writes (
  id bigint generated always as identity primary key,
  owner_id uuid not null,
  kind text not null check (kind in ('insert', 'update')),
  at timestamptz not null default now()
);

create index setup_writes_owner_at_idx on private.setup_writes (owner_id, at desc);

alter table private.setup_writes enable row level security;
revoke all on private.setup_writes from public, anon, authenticated;

-- Now SECURITY DEFINER so it can write the private log. It still only ever acts on the row
-- being written, and search_path is empty so every name is schema-qualified.
create or replace function public.setups_before_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  recent_inserts int;
  recent_writes int;
begin
  -- Limits apply to requests made by signed-in users. Maintainer edits from the dashboard
  -- (moderation, for example) run without a user and are never throttled.
  if auth.uid() is not null then
    -- Entries older than a day can never count again.
    delete from private.setup_writes w
    where w.owner_id = new.owner_id and w.at < now() - interval '1 day';

    select
      count(*) filter (where w.kind = 'insert'),
      count(*)
    into recent_inserts, recent_writes
    from private.setup_writes w
    where w.owner_id = new.owner_id and w.at > now() - interval '1 hour';

    if tg_op = 'INSERT' and recent_inserts >= 5 then
      raise exception 'You can publish up to 5 new setups an hour. Try again later.'
        using errcode = 'P0001';
    end if;
    if recent_writes >= 60 then
      raise exception 'Too many changes in the last hour. Try again later.'
        using errcode = 'P0001';
    end if;

    insert into private.setup_writes (owner_id, kind)
    values (new.owner_id, case when tg_op = 'INSERT' then 'insert' else 'update' end);
  end if;

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
  -- A CHECK constraint cannot inspect array elements, so the link format is enforced here.
  if exists (
    select 1 from unnest(new.source_repositories) u
    where u !~ '^https://github\.com/[A-Za-z0-9_.-]{1,100}/[A-Za-z0-9_.-]{1,100}$'
  ) then
    raise exception 'Credit links must be public GitHub repositories, such as https://github.com/owner/repo.'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

revoke all on function public.setups_before_write() from public, anon, authenticated;
