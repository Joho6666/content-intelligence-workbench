begin;
select plan(18);

select has_table('public', 'profiles', 'profiles exists');
select has_table('public', 'workspaces', 'workspaces exists');
select has_table('public', 'inbox_items', 'inbox_items exists');
select has_table('public', 'ideas', 'ideas exists');
select has_table('public', 'ai_analyses', 'ai_analyses exists');

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  created_at, updated_at, raw_app_meta_data, raw_user_meta_data
) values
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000099', 'authenticated', 'authenticated', 'rls-a@example.com', 'test', now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}'),
  ('00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000099', 'authenticated', 'authenticated', 'rls-b@example.com', 'test', now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}')
on conflict (id) do nothing;

select is((select count(*)::integer from public.workspaces where owner_id = '00000000-0000-4000-8000-000000000001'), 1, 'user A receives one workspace');
select is((select count(*)::integer from public.profiles where id = '00000000-0000-4000-8000-000000000001'), 1, 'user A receives one profile');
select set_config('test.workspace_a', (select id::text from public.workspaces where owner_id = '00000000-0000-4000-8000-000000000001'), true);

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);
insert into public.inbox_items (id, workspace_id, title, platform, capture_method, mode)
select '00000000-0000-4000-8000-000000000011', id, 'A private idea', '网页', '手动收藏', '链接'
from public.workspaces where owner_id = '00000000-0000-4000-8000-000000000001';
select is((select count(*)::integer from public.inbox_items where id = '00000000-0000-4000-8000-000000000011'), 1, 'owner can insert own inbox item');

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000002', true);
select is((select count(*)::integer from public.inbox_items where id = '00000000-0000-4000-8000-000000000011'), 0, 'owner B cannot select owner A item');
select throws_ok(
  $$insert into public.inbox_items (workspace_id, title, platform, capture_method, mode) values (current_setting('test.workspace_a')::uuid, 'cross workspace', '网页', '手动收藏', '链接')$$,
  '42501',
  'new row violates row-level security policy for table "inbox_items"',
  'owner B cannot insert into owner A workspace'
);

set local role anon;
select set_config('request.jwt.claim.sub', '', true);
select throws_ok(
  $$select count(*) from public.inbox_items$$,
  '42501',
  'permission denied for table inbox_items',
  'anon cannot read business tables'
);
select throws_ok(
  $$insert into public.inbox_items (workspace_id, title, platform, capture_method, mode) values ('00000000-0000-4000-8000-000000000001', 'anon', '网页', '手动收藏', '链接')$$,
  '42501',
  'permission denied for table inbox_items',
  'anon cannot write business tables'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);
select lives_ok(
  $$select * from public.convert_source_to_idea('inbox', '00000000-0000-4000-8000-000000000011')$$,
  'owner can call atomic conversion RPC'
);
select is((select count(*)::integer from public.idea_sources where source_id = '00000000-0000-4000-8000-000000000011'), 1, 'conversion creates one source relation');
insert into public.competitors (id, workspace_id, name, handle, platform)
select '00000000-0000-4000-8000-000000000021', id, 'A competitor', '@a', '网页'
from public.workspaces where owner_id = '00000000-0000-4000-8000-000000000001';
insert into public.competitor_contents (id, workspace_id, competitor_id, external_id, title)
select '00000000-0000-4000-8000-000000000022', id, '00000000-0000-4000-8000-000000000021', 'a-content', 'A content'
from public.workspaces where owner_id = '00000000-0000-4000-8000-000000000001';
insert into public.performance_snapshots (id, workspace_id, competitor_content_id, metrics)
select '00000000-0000-4000-8000-000000000023', id, '00000000-0000-4000-8000-000000000022', '{"views": 100}'::jsonb
from public.workspaces where owner_id = '00000000-0000-4000-8000-000000000001';
select is((select count(*)::integer from public.performance_snapshots where id = '00000000-0000-4000-8000-000000000023'), 1, 'owner can insert a snapshot for own competitor content');
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000002', true);
select is((select count(*)::integer from public.performance_snapshots where id = '00000000-0000-4000-8000-000000000023'), 0, 'owner B cannot select owner A performance snapshot');
select throws_ok(
  $$insert into public.performance_snapshots (workspace_id, competitor_content_id, metrics) select id, '00000000-0000-4000-8000-000000000022', '{}'::jsonb from public.workspaces where owner_id = '00000000-0000-4000-8000-000000000002'$$,
  '42501',
  'new row violates row-level security policy for table "performance_snapshots"',
  'owner B cannot attach an owner A competitor content snapshot'
);
select throws_ok(
  $$insert into storage.objects (bucket_id, name, owner_id) values ('content-assets', current_setting('test.workspace_a') || '/inbox/item/file.txt', '00000000-0000-4000-8000-000000000002')$$,
  '42501',
  'new row violates row-level security policy for table "objects"',
  'owner cannot upload into another workspace asset path'
);

select * from finish();
rollback;
