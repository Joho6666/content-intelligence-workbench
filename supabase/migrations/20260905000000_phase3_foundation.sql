create extension if not exists "pgcrypto" with schema extensions;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  avatar_url text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null default '我的 Content Workspace',
  slug text not null unique,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint workspaces_owner_unique unique (owner_id)
);

create table public.inbox_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  title text not null,
  summary text not null default '',
  original_content text not null default '',
  note text not null default '',
  url text not null default '',
  platform text not null check (platform in ('小红书', 'TikTok', 'YouTube', 'X', 'Bilibili', '微信公众号', '网页', '自己想到')),
  source_type text not null default '手动发现',
  capture_method text not null check (capture_method in ('手动收藏', '快速添加', '浏览器插件', '自己想到')),
  author text not null default '',
  thumbnail text not null default '#e5ebf4',
  ai_score numeric check (ai_score is null or (ai_score >= 0 and ai_score <= 100)),
  status text not null default '待处理' check (status in ('待处理', '待分析', '高潜', '已转选题', '已归档', '已忽略')),
  tags text[] not null default '{}',
  captured_at timestamptz not null default timezone('utc', now()),
  metrics jsonb not null default '{"views": 0, "likes": 0}'::jsonb,
  mode text not null default '链接' check (mode in ('链接', '选中内容', '我的重点')),
  analysis jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.intelligence_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  title text not null,
  summary text not null default '',
  original_content text not null default '',
  note text not null default '',
  url text not null default '',
  platform text not null check (platform in ('小红书', 'TikTok', 'YouTube', 'X', 'Bilibili', '微信公众号', '网页', '自己想到')),
  source_type text not null default '公开内容',
  capture_method text not null check (capture_method in ('手动收藏', '快速添加', '浏览器插件', '自己想到')),
  author text not null default '',
  thumbnail text not null default '#e5ebf4',
  ai_score numeric check (ai_score is null or (ai_score >= 0 and ai_score <= 100)),
  status text not null default '待分析' check (status in ('待处理', '待分析', '高潜', '已转选题', '已归档', '已忽略')),
  tags text[] not null default '{}',
  captured_at timestamptz not null default timezone('utc', now()),
  metrics jsonb not null default '{"views": 0, "likes": 0}'::jsonb,
  analysis jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.competitors (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  handle text not null,
  platform text not null check (platform in ('小红书', 'TikTok', 'YouTube', 'X', 'Bilibili', '微信公众号', '网页', '自己想到')),
  avatar text not null default '',
  description text not null default '',
  followers bigint not null default 0 check (followers >= 0),
  posts_7d integer not null default 0 check (posts_7d >= 0),
  avg_views bigint not null default 0 check (avg_views >= 0),
  avg_engagement numeric not null default 0 check (avg_engagement >= 0),
  outlier_index numeric not null default 1 check (outlier_index >= 0),
  recent_topics text[] not null default '{}',
  monitored boolean not null default true,
  trend jsonb not null default '[]'::jsonb,
  hooks jsonb not null default '[]'::jsonb,
  insights text[] not null default '{}',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint competitors_workspace_platform_handle_unique unique (workspace_id, platform, handle)
);

create table public.competitor_contents (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  competitor_id uuid not null references public.competitors(id) on delete cascade,
  external_id text not null,
  title text not null,
  thumbnail text not null default '#e5ebf4',
  views bigint not null default 0 check (views >= 0),
  likes bigint not null default 0 check (likes >= 0),
  outlier_index numeric not null default 1 check (outlier_index >= 0),
  published_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint competitor_contents_competitor_external_unique unique (competitor_id, external_id)
);

create table public.ideas (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  title text not null,
  angle text not null default '',
  priority text not null default 'A' check (priority in ('S', 'A', 'B')),
  platforms text[] not null default '{}',
  status text not null default '待筛选' check (status in ('待筛选', '候选选题', '待制作', '制作中', '待发布', '已发布')),
  tags text[] not null default '{}',
  score numeric not null default 0 check (score >= 0 and score <= 100),
  core text not null default '',
  audience text not null default '',
  cta text not null default '',
  title_variants text[] not null default '{}',
  outline text not null default '',
  hook text not null default '',
  script text not null default '',
  materials text not null default '',
  strategy text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.idea_sources (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  idea_id uuid not null references public.ideas(id) on delete cascade,
  source_kind text not null check (source_kind in ('inbox', 'intelligence')),
  source_id uuid not null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint idea_sources_workspace_kind_id_unique unique (workspace_id, source_kind, source_id)
);

create table public.content_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  idea_id uuid references public.ideas(id) on delete set null,
  title text not null,
  platform text not null check (platform in ('小红书', 'TikTok', 'YouTube', 'X', 'Bilibili', '微信公众号', '网页', '自己想到')),
  status text not null default '待制作' check (status in ('待制作', '制作中', '待发布', '已发布', '已归档')),
  scheduled_at timestamptz,
  assignee text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.performance_snapshots (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  content_item_id uuid references public.content_items(id) on delete cascade,
  competitor_content_id uuid references public.competitor_contents(id) on delete cascade,
  metrics jsonb not null default '{}'::jsonb,
  captured_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  constraint performance_snapshot_parent_check check (content_item_id is not null or competitor_content_id is not null)
);

create table public.ai_analyses (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  source_kind text not null check (source_kind in ('inbox', 'intelligence')),
  source_id uuid not null,
  model text not null default 'mock-v1',
  score numeric check (score is null or (score >= 0 and score <= 100)),
  result jsonb not null default '{}'::jsonb,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now())
);

create index inbox_items_workspace_captured_at_idx on public.inbox_items (workspace_id, captured_at desc);
create index inbox_items_workspace_status_idx on public.inbox_items (workspace_id, status);
create index intelligence_items_workspace_captured_at_idx on public.intelligence_items (workspace_id, captured_at desc);
create index intelligence_items_workspace_status_idx on public.intelligence_items (workspace_id, status);
create index competitors_workspace_updated_at_idx on public.competitors (workspace_id, updated_at desc);
create index competitor_contents_competitor_published_at_idx on public.competitor_contents (competitor_id, published_at desc);
create index ideas_workspace_status_order_idx on public.ideas (workspace_id, status, sort_order, created_at);
create index content_items_workspace_scheduled_at_idx on public.content_items (workspace_id, scheduled_at);
create index ai_analyses_workspace_source_idx on public.ai_analyses (workspace_id, source_kind, source_id, created_at desc);

create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger workspaces_set_updated_at before update on public.workspaces for each row execute function public.set_updated_at();
create trigger inbox_items_set_updated_at before update on public.inbox_items for each row execute function public.set_updated_at();
create trigger intelligence_items_set_updated_at before update on public.intelligence_items for each row execute function public.set_updated_at();
create trigger competitors_set_updated_at before update on public.competitors for each row execute function public.set_updated_at();
create trigger competitor_contents_set_updated_at before update on public.competitor_contents for each row execute function public.set_updated_at();
create trigger ideas_set_updated_at before update on public.ideas for each row execute function public.set_updated_at();
create trigger content_items_set_updated_at before update on public.content_items for each row execute function public.set_updated_at();

create or replace function public.is_workspace_owner(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.workspaces
    where id = target_workspace_id
      and owner_id = (select auth.uid())
  );
$$;

create or replace function public.is_workspace_idea(target_workspace_id uuid, target_idea_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1 from public.ideas
    where id = target_idea_id
      and workspace_id = target_workspace_id
      and public.is_workspace_owner(target_workspace_id)
  );
$$;

create or replace function public.is_workspace_competitor(target_workspace_id uuid, target_competitor_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1 from public.competitors
    where id = target_competitor_id
      and workspace_id = target_workspace_id
      and public.is_workspace_owner(target_workspace_id)
  );
$$;

create or replace function public.is_workspace_content(target_workspace_id uuid, target_content_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1 from public.content_items
    where id = target_content_id
      and workspace_id = target_workspace_id
      and public.is_workspace_owner(target_workspace_id)
  );
$$;

create or replace function public.is_workspace_competitor_content(target_workspace_id uuid, target_content_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.competitor_contents as content
    join public.competitors as competitor on competitor.id = content.competitor_id
    where content.id = target_content_id
      and content.workspace_id = target_workspace_id
      and competitor.workspace_id = target_workspace_id
      and public.is_workspace_owner(target_workspace_id)
  );
$$;

create or replace function public.is_workspace_source(target_workspace_id uuid, target_kind text, target_source_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public, auth
as $$
begin
  if target_kind = 'inbox' then
    return exists (select 1 from public.inbox_items where id = target_source_id and workspace_id = target_workspace_id and public.is_workspace_owner(target_workspace_id));
  elsif target_kind = 'intelligence' then
    return exists (select 1 from public.intelligence_items where id = target_source_id and workspace_id = target_workspace_id and public.is_workspace_owner(target_workspace_id));
  end if;
  return false;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_workspace_id uuid;
  display_name text;
begin
  display_name := coalesce(
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    '创作者'
  );
  insert into public.profiles (id, display_name)
  values (new.id, display_name)
  on conflict (id) do nothing;
  insert into public.workspaces (owner_id, name, slug)
  values (new.id, '我的 Content Workspace', 'content-workspace-' || replace(new.id::text, '-', ''))
  on conflict (owner_id) do nothing
  returning id into v_workspace_id;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.convert_source_to_idea(
  p_source_kind text,
  p_source_id uuid
)
returns table (idea_id uuid, created boolean)
language plpgsql
set search_path = public, auth
as $$
declare
  v_workspace_id uuid;
  existing_idea_id uuid;
  source_title text;
  source_platform text;
  source_tags text[];
  source_score numeric;
  source_summary text;
begin
  if p_source_kind not in ('inbox', 'intelligence') then
    raise exception using message = 'Invalid source kind', errcode = '22023';
  end if;
  select id into v_workspace_id
  from public.workspaces
  where owner_id = (select auth.uid())
  order by created_at
  limit 1;
  if v_workspace_id is null then
    raise exception using message = 'Workspace not found', errcode = 'P0002';
  end if;
  if p_source_kind = 'inbox' then
    select title, platform, tags, coalesce(ai_score, 80), summary
      into source_title, source_platform, source_tags, source_score, source_summary
    from public.inbox_items as source_item
    where source_item.id = p_source_id and source_item.workspace_id = v_workspace_id
    for update;
  else
    select title, platform, tags, coalesce(ai_score, 80), summary
      into source_title, source_platform, source_tags, source_score, source_summary
    from public.intelligence_items as source_item
    where source_item.id = p_source_id and source_item.workspace_id = v_workspace_id
    for update;
  end if;
  if source_title is null then
    raise exception using message = 'Source not found', errcode = 'P0002';
  end if;
  select existing_source.idea_id into existing_idea_id
  from public.idea_sources as existing_source
  where existing_source.workspace_id = v_workspace_id
    and existing_source.source_kind = p_source_kind
    and existing_source.source_id = p_source_id
  limit 1;
  if existing_idea_id is not null then
    if p_source_kind = 'inbox' then
      update public.inbox_items set status = '已转选题' where id = p_source_id;
    else
      update public.intelligence_items set status = '已转选题' where id = p_source_id;
    end if;
    return query select existing_idea_id, false;
    return;
  end if;
  insert into public.ideas (
    workspace_id, title, angle, priority, platforms, status, tags, score,
    core, audience, cta, title_variants, strategy, metadata, sort_order
  )
  values (
    v_workspace_id,
    source_title,
    '从已收藏内容提炼一个可执行的切入角度',
    case when source_score >= 90 then 'S' when source_score >= 75 then 'A' else 'B' end,
    array[source_platform],
    '待筛选',
    coalesce(source_tags, '{}'),
    source_score,
    coalesce(source_summary, ''),
    '关注该主题并希望获得可执行方法的受众',
    '欢迎在评论区分享你的实践',
    array[source_title],
    '先在核心平台验证，再扩展为多平台版本。',
    jsonb_build_object('created_from', p_source_kind),
    0
  )
  returning id into existing_idea_id;
  insert into public.idea_sources (workspace_id, idea_id, source_kind, source_id)
  values (v_workspace_id, existing_idea_id, p_source_kind, p_source_id);
  if p_source_kind = 'inbox' then
    update public.inbox_items set status = '已转选题' where id = p_source_id;
  else
    update public.intelligence_items set status = '已转选题' where id = p_source_id;
  end if;
  return query select existing_idea_id, true;
end;
$$;

create or replace function public.move_idea(
  p_idea_id uuid,
  p_status text,
  p_before_id uuid default null
)
returns table (idea_id uuid, status text, sort_order integer)
language plpgsql
set search_path = public, auth
as $$
declare
  v_workspace_id uuid;
  current_status text;
  before_status text;
  before_order integer;
  next_order integer;
begin
  if p_status not in ('待筛选', '候选选题', '待制作', '制作中', '待发布', '已发布') then
    raise exception using message = 'Invalid idea status', errcode = '22023';
  end if;
  select id into v_workspace_id
  from public.workspaces
  where owner_id = (select auth.uid())
  order by created_at
  limit 1
  for update;
  if v_workspace_id is null then
    raise exception using message = 'Workspace not found', errcode = 'P0002';
  end if;
  select ideas.status into current_status
  from public.ideas
  where ideas.id = p_idea_id and ideas.workspace_id = v_workspace_id
  for update;
  if current_status is null then
    raise exception using message = 'Idea not found', errcode = 'P0002';
  end if;
  if p_before_id is not null and p_before_id <> p_idea_id then
    select ideas.status, ideas.sort_order
      into before_status, before_order
    from public.ideas
    where ideas.id = p_before_id and ideas.workspace_id = v_workspace_id
    for update;
    if before_status is null then
      raise exception using message = 'Drop target not found', errcode = 'P0002';
    end if;
    if before_status <> p_status then
      raise exception using message = 'Drop target status mismatch', errcode = '22023';
    end if;
    next_order := before_order - 1;
  else
    select coalesce(max(ideas.sort_order), -1) + 1 into next_order
    from public.ideas
    where ideas.workspace_id = v_workspace_id and ideas.status = p_status;
  end if;
  update public.ideas
  set status = p_status, sort_order = next_order
  where id = p_idea_id;
  return query select p_idea_id, p_status, next_order;
end;
$$;

create or replace function public.schedule_content(
  p_title text,
  p_platform text,
  p_scheduled_at timestamptz,
  p_assignee text,
  p_idea_id uuid default null
)
returns table (content_id uuid)
language plpgsql
set search_path = public, auth
as $$
declare
  v_workspace_id uuid;
  v_content_id uuid;
begin
  if p_platform not in ('小红书', 'TikTok', 'YouTube', 'X', 'Bilibili', '微信公众号', '网页', '自己想到') then
    raise exception using message = 'Invalid content platform', errcode = '22023';
  end if;
  if nullif(trim(p_title), '') is null then
    raise exception using message = 'Content title is required', errcode = '22023';
  end if;
  select id into v_workspace_id
  from public.workspaces
  where owner_id = (select auth.uid())
  order by created_at
  limit 1;
  if v_workspace_id is null then
    raise exception using message = 'Workspace not found', errcode = 'P0002';
  end if;
  if p_idea_id is not null and not exists (
    select 1 from public.ideas where id = p_idea_id and workspace_id = v_workspace_id
  ) then
    raise exception using message = 'Idea not found', errcode = 'P0002';
  end if;
  insert into public.content_items (workspace_id, idea_id, title, platform, status, scheduled_at, assignee)
  values (v_workspace_id, p_idea_id, trim(p_title), p_platform, '待发布', p_scheduled_at, coalesce(nullif(trim(p_assignee), ''), '创作者'))
  returning id into v_content_id;
  if p_idea_id is not null then
    update public.ideas set status = '待发布' where id = p_idea_id and workspace_id = v_workspace_id;
  end if;
  return query select v_content_id;
end;
$$;

revoke execute on function public.set_updated_at() from public;
revoke execute on function public.is_workspace_owner(uuid) from public;
revoke execute on function public.is_workspace_idea(uuid, uuid) from public;
revoke execute on function public.is_workspace_competitor(uuid, uuid) from public;
revoke execute on function public.is_workspace_content(uuid, uuid) from public;
revoke execute on function public.is_workspace_competitor_content(uuid, uuid) from public;
revoke execute on function public.is_workspace_source(uuid, text, uuid) from public;
revoke execute on function public.handle_new_user() from public;
revoke execute on function public.convert_source_to_idea(text, uuid) from public;
revoke execute on function public.move_idea(uuid, text, uuid) from public;
revoke execute on function public.schedule_content(text, text, timestamptz, text, uuid) from public;
grant execute on function public.convert_source_to_idea(text, uuid) to authenticated;
grant execute on function public.move_idea(uuid, text, uuid) to authenticated;
grant execute on function public.schedule_content(text, text, timestamptz, text, uuid) to authenticated;

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.inbox_items enable row level security;
alter table public.intelligence_items enable row level security;
alter table public.competitors enable row level security;
alter table public.competitor_contents enable row level security;
alter table public.ideas enable row level security;
alter table public.idea_sources enable row level security;
alter table public.content_items enable row level security;
alter table public.performance_snapshots enable row level security;
alter table public.ai_analyses enable row level security;

create policy profiles_owner_select on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy profiles_owner_update on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy workspaces_owner_select on public.workspaces for select to authenticated using (owner_id = (select auth.uid()));
create policy workspaces_owner_update on public.workspaces for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));

create policy inbox_workspace_select on public.inbox_items for select to authenticated using (public.is_workspace_owner(workspace_id));
create policy inbox_workspace_insert on public.inbox_items for insert to authenticated with check (public.is_workspace_owner(workspace_id));
create policy inbox_workspace_update on public.inbox_items for update to authenticated using (public.is_workspace_owner(workspace_id)) with check (public.is_workspace_owner(workspace_id));
create policy inbox_workspace_delete on public.inbox_items for delete to authenticated using (public.is_workspace_owner(workspace_id));

create policy intelligence_workspace_select on public.intelligence_items for select to authenticated using (public.is_workspace_owner(workspace_id));
create policy intelligence_workspace_insert on public.intelligence_items for insert to authenticated with check (public.is_workspace_owner(workspace_id));
create policy intelligence_workspace_update on public.intelligence_items for update to authenticated using (public.is_workspace_owner(workspace_id)) with check (public.is_workspace_owner(workspace_id));
create policy intelligence_workspace_delete on public.intelligence_items for delete to authenticated using (public.is_workspace_owner(workspace_id));

create policy competitors_workspace_select on public.competitors for select to authenticated using (public.is_workspace_owner(workspace_id));
create policy competitors_workspace_insert on public.competitors for insert to authenticated with check (public.is_workspace_owner(workspace_id));
create policy competitors_workspace_update on public.competitors for update to authenticated using (public.is_workspace_owner(workspace_id)) with check (public.is_workspace_owner(workspace_id));
create policy competitors_workspace_delete on public.competitors for delete to authenticated using (public.is_workspace_owner(workspace_id));

create policy competitor_contents_workspace_select on public.competitor_contents for select to authenticated using (public.is_workspace_owner(workspace_id) and public.is_workspace_competitor(workspace_id, competitor_id));
create policy competitor_contents_workspace_insert on public.competitor_contents for insert to authenticated with check (public.is_workspace_owner(workspace_id) and public.is_workspace_competitor(workspace_id, competitor_id));
create policy competitor_contents_workspace_update on public.competitor_contents for update to authenticated using (public.is_workspace_owner(workspace_id) and public.is_workspace_competitor(workspace_id, competitor_id)) with check (public.is_workspace_owner(workspace_id) and public.is_workspace_competitor(workspace_id, competitor_id));
create policy competitor_contents_workspace_delete on public.competitor_contents for delete to authenticated using (public.is_workspace_owner(workspace_id) and public.is_workspace_competitor(workspace_id, competitor_id));

create policy ideas_workspace_select on public.ideas for select to authenticated using (public.is_workspace_owner(workspace_id));
create policy ideas_workspace_insert on public.ideas for insert to authenticated with check (public.is_workspace_owner(workspace_id));
create policy ideas_workspace_update on public.ideas for update to authenticated using (public.is_workspace_owner(workspace_id)) with check (public.is_workspace_owner(workspace_id));
create policy ideas_workspace_delete on public.ideas for delete to authenticated using (public.is_workspace_owner(workspace_id));

create policy idea_sources_workspace_select on public.idea_sources for select to authenticated using (public.is_workspace_owner(workspace_id) and public.is_workspace_idea(workspace_id, idea_id) and public.is_workspace_source(workspace_id, source_kind, source_id));
create policy idea_sources_workspace_insert on public.idea_sources for insert to authenticated with check (public.is_workspace_owner(workspace_id) and public.is_workspace_idea(workspace_id, idea_id) and public.is_workspace_source(workspace_id, source_kind, source_id));
create policy idea_sources_workspace_update on public.idea_sources for update to authenticated using (public.is_workspace_owner(workspace_id) and public.is_workspace_idea(workspace_id, idea_id) and public.is_workspace_source(workspace_id, source_kind, source_id)) with check (public.is_workspace_owner(workspace_id) and public.is_workspace_idea(workspace_id, idea_id) and public.is_workspace_source(workspace_id, source_kind, source_id));
create policy idea_sources_workspace_delete on public.idea_sources for delete to authenticated using (public.is_workspace_owner(workspace_id));

create policy content_items_workspace_select on public.content_items for select to authenticated using (public.is_workspace_owner(workspace_id) and (idea_id is null or public.is_workspace_idea(workspace_id, idea_id)));
create policy content_items_workspace_insert on public.content_items for insert to authenticated with check (public.is_workspace_owner(workspace_id) and (idea_id is null or public.is_workspace_idea(workspace_id, idea_id)));
create policy content_items_workspace_update on public.content_items for update to authenticated using (public.is_workspace_owner(workspace_id) and (idea_id is null or public.is_workspace_idea(workspace_id, idea_id))) with check (public.is_workspace_owner(workspace_id) and (idea_id is null or public.is_workspace_idea(workspace_id, idea_id)));
create policy content_items_workspace_delete on public.content_items for delete to authenticated using (public.is_workspace_owner(workspace_id));

create policy performance_snapshots_workspace_select on public.performance_snapshots for select to authenticated using (public.is_workspace_owner(workspace_id) and (content_item_id is null or public.is_workspace_content(workspace_id, content_item_id)) and (competitor_content_id is null or public.is_workspace_competitor_content(workspace_id, competitor_content_id)));
create policy performance_snapshots_workspace_insert on public.performance_snapshots for insert to authenticated with check (public.is_workspace_owner(workspace_id) and (content_item_id is null or public.is_workspace_content(workspace_id, content_item_id)) and (competitor_content_id is null or public.is_workspace_competitor_content(workspace_id, competitor_content_id)));
create policy performance_snapshots_workspace_update on public.performance_snapshots for update to authenticated using (public.is_workspace_owner(workspace_id) and (content_item_id is null or public.is_workspace_content(workspace_id, content_item_id)) and (competitor_content_id is null or public.is_workspace_competitor_content(workspace_id, competitor_content_id))) with check (public.is_workspace_owner(workspace_id) and (content_item_id is null or public.is_workspace_content(workspace_id, content_item_id)) and (competitor_content_id is null or public.is_workspace_competitor_content(workspace_id, competitor_content_id)));
create policy performance_snapshots_workspace_delete on public.performance_snapshots for delete to authenticated using (public.is_workspace_owner(workspace_id));

create policy ai_analyses_workspace_select on public.ai_analyses for select to authenticated using (public.is_workspace_owner(workspace_id) and public.is_workspace_source(workspace_id, source_kind, source_id));
create policy ai_analyses_workspace_insert on public.ai_analyses for insert to authenticated with check (public.is_workspace_owner(workspace_id) and public.is_workspace_source(workspace_id, source_kind, source_id) and created_by = (select auth.uid()));
create policy ai_analyses_workspace_update on public.ai_analyses for update to authenticated using (public.is_workspace_owner(workspace_id) and public.is_workspace_source(workspace_id, source_kind, source_id)) with check (public.is_workspace_owner(workspace_id) and public.is_workspace_source(workspace_id, source_kind, source_id) and created_by = (select auth.uid()));
create policy ai_analyses_workspace_delete on public.ai_analyses for delete to authenticated using (public.is_workspace_owner(workspace_id));

revoke all on all tables in schema public from public;
revoke all on all tables in schema public from anon;
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.workspaces to authenticated;
grant select, insert, update, delete on public.inbox_items to authenticated;
grant select, insert, update, delete on public.intelligence_items to authenticated;
grant select, insert, update, delete on public.competitors to authenticated;
grant select, insert, update, delete on public.competitor_contents to authenticated;
grant select, insert, update, delete on public.ideas to authenticated;
grant select, insert, update, delete on public.idea_sources to authenticated;
grant select, insert, update, delete on public.content_items to authenticated;
grant select, insert, update, delete on public.performance_snapshots to authenticated;
grant select, insert, update, delete on public.ai_analyses to authenticated;

insert into storage.buckets (id, name, public, file_size_limit)
values ('content-assets', 'content-assets', false, 52428800)
on conflict (id) do update set public = false;

create policy content_assets_owner_select on storage.objects for select to authenticated
using (
  bucket_id = 'content-assets'
  and name ~* '^[0-9a-f-]{8}-[0-9a-f-]{4}-[0-9a-f-]{4}-[0-9a-f-]{4}-[0-9a-f-]{12}/(inbox|intelligence|competitors|ideas|content)/[0-9a-f-]{8}-[0-9a-f-]{4}-[0-9a-f-]{4}-[0-9a-f-]{4}-[0-9a-f-]{12}/[^/]+$'
  and public.is_workspace_owner(split_part(name, '/', 1)::uuid)
);
create policy content_assets_owner_insert on storage.objects for insert to authenticated
with check (
  bucket_id = 'content-assets'
  and owner_id = (select auth.uid())::text
  and name ~* '^[0-9a-f-]{8}-[0-9a-f-]{4}-[0-9a-f-]{4}-[0-9a-f-]{4}-[0-9a-f-]{12}/(inbox|intelligence|competitors|ideas|content)/[0-9a-f-]{8}-[0-9a-f-]{4}-[0-9a-f-]{4}-[0-9a-f-]{4}-[0-9a-f-]{12}/[^/]+$'
  and public.is_workspace_owner(split_part(name, '/', 1)::uuid)
);
create policy content_assets_owner_update on storage.objects for update to authenticated
using (
  bucket_id = 'content-assets'
  and owner_id = (select auth.uid())::text
  and name ~* '^[0-9a-f-]{8}-[0-9a-f-]{4}-[0-9a-f-]{4}-[0-9a-f-]{4}-[0-9a-f-]{12}/(inbox|intelligence|competitors|ideas|content)/[0-9a-f-]{8}-[0-9a-f-]{4}-[0-9a-f-]{4}-[0-9a-f-]{4}-[0-9a-f-]{12}/[^/]+$'
  and public.is_workspace_owner(split_part(name, '/', 1)::uuid)
)
with check (
  bucket_id = 'content-assets'
  and owner_id = (select auth.uid())::text
  and name ~* '^[0-9a-f-]{8}-[0-9a-f-]{4}-[0-9a-f-]{4}-[0-9a-f-]{4}-[0-9a-f-]{12}/(inbox|intelligence|competitors|ideas|content)/[0-9a-f-]{8}-[0-9a-f-]{4}-[0-9a-f-]{4}-[0-9a-f-]{4}-[0-9a-f-]{12}/[^/]+$'
  and public.is_workspace_owner(split_part(name, '/', 1)::uuid)
);
create policy content_assets_owner_delete on storage.objects for delete to authenticated
using (
  bucket_id = 'content-assets'
  and split_part(name, '/', 1) ~* '^[0-9a-f-]{36}$'
  and public.is_workspace_owner(split_part(name, '/', 1)::uuid)
);
