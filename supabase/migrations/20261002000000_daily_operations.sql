-- Non-destructive extension. Legacy tables remain intact; first use imports and backs up their rows.
create table public.operation_documents (
 workspace_id uuid primary key references public.workspaces(id) on delete cascade,
 revision bigint not null default 0 check (revision >= 0),
 body jsonb not null check (jsonb_typeof(body) = 'object'),
 updated_at timestamptz not null default now()
);
alter table public.operation_documents enable row level security;
create policy operation_document_owner on public.operation_documents for all to authenticated
 using (public.is_workspace_owner(workspace_id)) with check (public.is_workspace_owner(workspace_id));
grant select, insert, update, delete on public.operation_documents to authenticated;
create trigger operation_document_updated before update on public.operation_documents for each row execute function public.set_updated_at();
-- Old SQL analysis is synthetic; the application now calls a real server-side provider.
revoke execute on function public.analyze_source(text, uuid) from public, anon, authenticated;
