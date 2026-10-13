-- Credits: other public GitHub repositories a creator drew on to build their setup.
-- Stored as canonical https://github.com/<owner>/<repo> links, at most 8 per setup.

alter table public.setups
  add column source_repositories text[] not null default '{}'
  check (cardinality(source_repositories) <= 8);

grant insert (source_repositories), update (source_repositories) on public.setups to authenticated;

create or replace function public.setups_before_write()
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
