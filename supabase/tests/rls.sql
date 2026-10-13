-- Access-rule test for profiles and setups.
--
-- Simulates an owner (Alice), another user (Bob), and an anonymous visitor, and records
-- what each is allowed to do. Everything runs in one transaction that is rolled back, so
-- it leaves no data behind. Run it in the Supabase SQL editor after any policy change.
--
-- Expected: steps 3, 11, 17, 18, 19 succeed; every other attempt reports "blocked", 0 rows,
-- or unchanged data.

begin;
create temp table t_results (step int, test text, outcome text) on commit drop;
grant all on t_results to anon, authenticated;

insert into auth.users (id, instance_id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
 ('00000000-0000-0000-0000-00000000000a','00000000-0000-0000-0000-000000000000','authenticated','authenticated','rls-a@example.invalid','{"provider":"github"}','{"user_name":"octo-alice","full_name":"Alice"}',now(),now()),
 ('00000000-0000-0000-0000-00000000000b','00000000-0000-0000-0000-000000000000','authenticated','authenticated','rls-b@example.invalid','{"provider":"email"}','{}',now(),now());

insert into t_results select 1, 'profile trigger: github user', display_name || ' / ' || coalesce(github_username,'null') from public.profiles where id='00000000-0000-0000-0000-00000000000a';
insert into t_results select 2, 'profile trigger: email user (no email leak)', display_name from public.profiles where id='00000000-0000-0000-0000-00000000000b';

do $$
declare r text;
begin
  perform set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);
  set local role authenticated;

  begin
    insert into public.setups (slug,name,description,agents,categories,repository_url)
    values ('alice-kit','Alice Kit','A description that is long enough to pass.', '{claude-code}','{documentation}','https://github.com/octo-alice/kit');
    r := 'ok';
  exception when others then r := 'FAILED: '||sqlerrm; end;
  insert into t_results values (3,'alice inserts own setup', r);

  begin
    insert into public.setups (owner_id,slug,name,description,agents,categories,repository_url)
    values ('00000000-0000-0000-0000-00000000000b','spoof','Spoofed','A description that is long enough to pass.', '{claude-code}','{documentation}','https://github.com/x/y');
    r := 'ALLOWED (bad)';
  exception when others then r := 'blocked: '||sqlerrm; end;
  insert into t_results values (4,'alice inserts as bob (owner_id spoof)', r);

  begin
    insert into public.setups (status,slug,name,description,agents,categories,repository_url)
    values ('hidden','st','Status','A description that is long enough to pass.', '{claude-code}','{documentation}','https://github.com/x/y');
    r := 'ALLOWED (bad)';
  exception when others then r := 'blocked: '||sqlerrm; end;
  insert into t_results values (5,'client sets status on insert', r);

  begin
    insert into public.setups (slug,name,description,agents,categories,repository_url)
    values ('evil-url','Evil','A description that is long enough to pass.', '{claude-code}','{documentation}','https://evil.example/x/y');
    r := 'ALLOWED (bad)';
  exception when others then r := 'blocked: '||sqlerrm; end;
  insert into t_results values (6,'non-GitHub repository URL', r);

  begin
    insert into public.setups (slug,name,description,agents,categories,repository_url)
    values ('bad-agent','Bad agent','A description that is long enough to pass.', '{skynet}','{documentation}','https://github.com/x/y');
    r := 'ALLOWED (bad)';
  exception when others then r := 'blocked: '||sqlerrm; end;
  insert into t_results values (7,'unknown agent id', r);

  begin
    insert into public.setups (slug,name,description,agents,categories,repository_url,tags)
    values ('bad-tag','Bad tag','A description that is long enough to pass.', '{codex}','{documentation}','https://github.com/x/y','{"Has Space"}');
    r := 'ALLOWED (bad)';
  exception when others then r := 'blocked: '||sqlerrm; end;
  insert into t_results values (8,'invalid tag', r);

  begin
    update public.setups set status='hidden' where slug='alice-kit';
    r := 'ALLOWED (bad)';
  exception when others then r := 'blocked: '||sqlerrm; end;
  insert into t_results values (9,'owner changes status', r);

  begin
    update public.setups set owner_id='00000000-0000-0000-0000-00000000000b' where slug='alice-kit';
    r := 'ALLOWED (bad)';
  exception when others then r := 'blocked: '||sqlerrm; end;
  insert into t_results values (10,'owner reassigns owner_id', r);

  begin
    update public.setups set name='Alice Kit 2' where slug='alice-kit';
    r := 'ok, name=' || (select name from public.setups where slug='alice-kit');
  exception when others then r := 'FAILED: '||sqlerrm; end;
  insert into t_results values (11,'owner edits own setup', r);

  begin
    update public.profiles set display_name='Anthropic' where id='00000000-0000-0000-0000-00000000000a';
    r := 'ALLOWED (bad)';
  exception when others then r := 'blocked: '||sqlerrm; end;
  insert into t_results values (12,'user renames own profile (impersonation)', r);

  -- Credit links ("Built from")
  begin
    update public.setups set source_repositories = '{"https://github.com/anthropics/skills","https://github.com/a/b"}' where slug='alice-kit';
    r := 'ok: ' || (select array_to_string(source_repositories, ' | ') from public.setups where slug='alice-kit');
  exception when others then r := 'FAILED: '||sqlerrm; end;
  insert into t_results values (19,'owner sets two credit links', r);

  begin
    update public.setups set source_repositories = '{"https://evil.example/a/b"}' where slug='alice-kit';
    r := 'ALLOWED (bad)';
  exception when others then r := 'blocked: '||sqlerrm; end;
  insert into t_results values (20,'non-GitHub credit link', r);

  begin
    update public.setups set source_repositories = '{"javascript:alert(1)"}' where slug='alice-kit';
    r := 'ALLOWED (bad)';
  exception when others then r := 'blocked: '||sqlerrm; end;
  insert into t_results values (21,'javascript: credit link', r);

  begin
    update public.setups set source_repositories = (select array_agg('https://github.com/o/r' || i) from generate_series(1,9) i) where slug='alice-kit';
    r := 'ALLOWED (bad)';
  exception when others then r := 'blocked: '||sqlerrm; end;
  insert into t_results values (22,'nine credit links', r);

  reset role;
  perform set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}', true);
  set local role authenticated;

  update public.setups set name='Hacked' where slug='alice-kit';
  insert into t_results values (13,'bob edits alice''s setup', 'name is still: ' || (select name from public.setups where slug='alice-kit'));
  delete from public.setups where slug='alice-kit';
  insert into t_results values (14,'bob deletes alice''s setup', 'still exists=' || (select count(*)::text from public.setups where slug='alice-kit'));

  reset role;
  update public.setups set status='hidden' where slug='alice-kit';

  perform set_config('request.jwt.claims','{"role":"anon"}', true);
  set local role anon;
  insert into t_results values (15,'anon sees hidden setup', (select count(*)::text from public.setups where slug='alice-kit') || ' rows');
  begin
    insert into public.setups (slug,name,description,agents,categories,repository_url)
    values ('anon-kit','Anon','A description that is long enough to pass.', '{codex}','{documentation}','https://github.com/x/y');
    r := 'ALLOWED (bad)';
  exception when others then r := 'blocked: '||sqlerrm; end;
  insert into t_results values (16,'anon inserts', r);

  reset role;
  perform set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);
  set local role authenticated;
  insert into t_results values (17,'owner still sees own hidden setup', (select count(*)::text from public.setups where slug='alice-kit') || ' rows');
  delete from public.setups where slug='alice-kit';
  insert into t_results values (18,'owner deletes own setup', 'remaining=' || (select count(*)::text from public.setups where slug='alice-kit'));
  reset role;
end $$;

select step, test, outcome from t_results order by step;
rollback;
