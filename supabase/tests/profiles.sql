-- Access-rule test for profile editing (migrations 20261015090000–20261015092000).
--
-- Simulates two members and an anonymous visitor in one transaction that is rolled back.
-- Run it in the Supabase SQL editor after any change to profiles.
--
-- Expected: steps 1, 2, 4, 12, 14 succeed; every other step reports "blocked" or
-- unchanged data. Step 1: the GitHub user "kitloom" gets a neutral member- name.

begin;
create temp table t (step int, test text, outcome text) on commit drop;
grant all on t to anon, authenticated;

insert into auth.users (id, instance_id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
 ('00000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-000000000000','authenticated','authenticated','p-a@example.invalid','{"provider":"github"}','{"user_name":"octo-alice"}',now(),now()),
 ('00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-000000000000','authenticated','authenticated','p-b@example.invalid','{"provider":"email"}','{}',now(),now()),
 ('00000000-0000-0000-0000-0000000000c1','00000000-0000-0000-0000-000000000000','authenticated','authenticated','p-c@example.invalid','{"provider":"github"}','{"user_name":"kitloom"}',now(),now());

insert into t select 1, 'sign-ups: github, email, and a github user named "kitloom"',
  string_agg(display_name || ' / gh=' || coalesce(github_username, 'null'), ' ; ' order by id)
  from public.profiles where id::text like '00000000-0000-0000-0000-0000000000%';

do $$
declare r text;
begin
  perform set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
  set local role authenticated;
  begin update public.profiles set display_name='Alice Builder' where id=auth.uid(); r:='ok: '||(select display_name from public.profiles where id=auth.uid()); exception when others then r:='FAILED: '||sqlerrm; end;
  insert into t values (2,'owner renames self', r);
  begin update public.profiles set display_name='Alice B' where id=auth.uid(); r:='ALLOWED (bad)'; exception when others then r:='blocked: '||sqlerrm; end;
  insert into t values (3,'second rename the same day', r);
  begin update public.profiles set bio='  Builds agent kits.  ', website_url='https://example.com/alice' where id=auth.uid(); r:='ok: bio='||(select bio from public.profiles where id=auth.uid()); exception when others then r:='FAILED: '||sqlerrm; end;
  insert into t values (4,'owner sets bio and website (trimmed)', r);

  reset role;
  perform set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);
  set local role authenticated;
  begin update public.profiles set display_name='ALICE-BUILDER' where id=auth.uid(); r:='ALLOWED (bad)'; exception when others then r:='blocked: '||sqlerrm; end;
  insert into t values (5,'copy a name with other case and punctuation', r);
  begin update public.profiles set display_name='Kit Loom' where id=auth.uid(); r:='ALLOWED (bad)'; exception when others then r:='blocked: '||sqlerrm; end;
  insert into t values (6,'reserved: Kit Loom', r);
  begin update public.profiles set display_name='Anthropic' where id=auth.uid(); r:='ALLOWED (bad)'; exception when others then r:='blocked: '||sqlerrm; end;
  insert into t values (7,'reserved: Anthropic', r);
  begin update public.profiles set display_name='<script>x' where id=auth.uid(); r:='ALLOWED (bad)'; exception when others then r:='blocked: '||sqlerrm; end;
  insert into t values (8,'invalid characters', r);
  begin update public.profiles set github_username='octo-alice' where id=auth.uid(); r:='ALLOWED (bad)'; exception when others then r:='blocked: '||sqlerrm; end;
  insert into t values (9,'edit github_username', r);
  begin update public.profiles set website_url='javascript:alert(1)' where id=auth.uid(); r:='ALLOWED (bad)'; exception when others then r:='blocked: '||sqlerrm; end;
  insert into t values (10,'javascript: website', r);
  update public.profiles set bio='hacked' where id='00000000-0000-0000-0000-0000000000a1';
  insert into t values (11,'edit another member''s profile', 'alice bio still: '||(select bio from public.profiles where id='00000000-0000-0000-0000-0000000000a1'));
  begin update public.profiles set display_name='Bob Writes' where id=auth.uid(); r:='ok: '||(select display_name from public.profiles where id=auth.uid()); exception when others then r:='FAILED: '||sqlerrm; end;
  insert into t values (12,'valid rename', r);
  begin perform count(*) from private.setup_writes; r:='READABLE (bad)'; exception when others then r:='blocked: '||sqlerrm; end;
  insert into t values (15,'member reaches the private schema', r);

  reset role;
  perform set_config('request.jwt.claims','{"role":"anon"}', true);
  set local role anon;
  begin update public.profiles set bio='anon' where id='00000000-0000-0000-0000-0000000000b1'; r:='ALLOWED (bad)'; exception when others then r:='blocked: '||sqlerrm; end;
  insert into t values (13,'anon edits a profile', r);

  -- A maintainer in the dashboard: no user claims, so reserved names are allowed.
  reset role;
  perform set_config('request.jwt.claims','', true);
  begin update public.profiles set display_name='Kitloom' where id='00000000-0000-0000-0000-0000000000c1'; r:='ok: '||(select display_name from public.profiles where id='00000000-0000-0000-0000-0000000000c1'); exception when others then r:='FAILED: '||sqlerrm; end;
  insert into t values (14,'maintainer names the official account Kitloom', r);
end $$;

select step, test, outcome from t order by step;
rollback;
