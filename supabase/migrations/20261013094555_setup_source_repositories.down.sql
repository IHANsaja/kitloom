-- Reverses 20261013094555_setup_source_repositories.sql. Drops all stored credit links.
create or replace function public.setups_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
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

alter table public.setups drop column if exists source_repositories;
