begin;
select plan(34);

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
update public.inbox_items set note = 'updated by owner A' where id = '00000000-0000-4000-8000-000000000011';
select is((select note from public.inbox_items where id = '00000000-0000-4000-8000-000000000011'), 'updated by owner A', 'owner can update own inbox item');
insert into public.inbox_items (id, workspace_id, title, platform, capture_method, mode)
select '00000000-0000-4000-8000-000000000012', id, 'Temporary item', '网页', '手动收藏', '链接'
from public.workspaces where owner_id = '00000000-0000-4000-8000-000000000001';
delete from public.inbox_items where id = '00000000-0000-4000-8000-000000000012';
select is((select count(*)::integer from public.inbox_items where id = '00000000-0000-4000-8000-000000000012'), 0, 'owner can delete own inbox item');

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000002', true);
select is((select count(*)::integer from public.inbox_items where id = '00000000-0000-4000-8000-000000000011'), 0, 'owner B cannot select owner A item');
select throws_ok(
  $$insert into public.inbox_items (workspace_id, title, platform, capture_method, mode) values (current_setting('test.workspace_a')::uuid, 'cross workspace', '网页', '手动收藏', '链接')$$,
  '42501',
  'new row violates row-level security policy for table "inbox_items"',
  'owner B cannot insert into owner A workspace'
);
update public.inbox_items set title = 'B cannot update' where id = '00000000-0000-4000-8000-000000000011';
delete from public.inbox_items where id = '00000000-0000-4000-8000-000000000011';
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);
select is((select title from public.inbox_items where id = '00000000-0000-4000-8000-000000000011'), 'A private idea', 'owner B cannot update or delete owner A item');

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
select lives_ok(
  $$select * from public.analyze_source('inbox', '00000000-0000-4000-8000-000000000011')$$,
  'owner can run atomic mock analysis'
);
select is((select count(*)::integer from public.ai_analyses where source_id = '00000000-0000-4000-8000-000000000011'), 1, 'analysis writes one audit record');
insert into public.ideas (id, workspace_id, title, status, sort_order)
select '00000000-0000-4000-8000-000000000031', id, 'Idea one', '待筛选', 1
from public.workspaces where owner_id = '00000000-0000-4000-8000-000000000001';
insert into public.ideas (id, workspace_id, title, status, sort_order)
select '00000000-0000-4000-8000-000000000032', id, 'Idea two', '待筛选', 2
from public.workspaces where owner_id = '00000000-0000-4000-8000-000000000001';
select lives_ok(
  $$select * from public.move_idea('00000000-0000-4000-8000-000000000032', '待筛选', '00000000-0000-4000-8000-000000000031')$$,
  'owner can move an idea before another idea'
);
select is((select sort_order from public.ideas where id = '00000000-0000-4000-8000-000000000032'), 1, 'moved idea receives target order');
select is((select sort_order from public.ideas where id = '00000000-0000-4000-8000-000000000031'), 2, 'following idea is shifted after move');
select lives_ok(
  $$select * from public.move_idea('00000000-0000-4000-8000-000000000032', '制作中')$$,
  'owner can move an idea to an empty column'
);
select is((select status from public.ideas where id = '00000000-0000-4000-8000-000000000032'), '制作中', 'cross-column move updates status');
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
select lives_ok(
  $$insert into storage.objects (bucket_id, name, owner_id) values ('content-assets', current_setting('test.workspace_a') || '/inbox/00000000-0000-4000-8000-000000000011/file.txt', '00000000-0000-4000-8000-000000000001')$$,
  'owner can upload an asset in own workspace path'
);
select is((select count(*)::integer from storage.objects where name = current_setting('test.workspace_a') || '/inbox/00000000-0000-4000-8000-000000000011/file.txt'), 1, 'owner can read own asset');
select lives_ok(
  $$update storage.objects set metadata = '{"checked": true}'::jsonb where name = current_setting('test.workspace_a') || '/inbox/00000000-0000-4000-8000-000000000011/file.txt'$$,
  'owner can update own asset'
);
select is((select metadata ->> 'checked' from storage.objects where name = current_setting('test.workspace_a') || '/inbox/00000000-0000-4000-8000-000000000011/file.txt'), 'true', 'owner asset update is persisted');
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000002', true);
select is((select count(*)::integer from public.performance_snapshots where id = '00000000-0000-4000-8000-000000000023'), 0, 'owner B cannot select owner A performance snapshot');
select is((select count(*)::integer from storage.objects where name = current_setting('test.workspace_a') || '/inbox/00000000-0000-4000-8000-000000000011/file.txt'), 0, 'owner B cannot read owner A asset');
update storage.objects set metadata = '{"checked": false}'::jsonb where name = current_setting('test.workspace_a') || '/inbox/00000000-0000-4000-8000-000000000011/file.txt';
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);
select is((select metadata ->> 'checked' from storage.objects where name = current_setting('test.workspace_a') || '/inbox/00000000-0000-4000-8000-000000000011/file.txt'), 'true', 'owner B cannot update or delete owner A asset');
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000002', true);
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
