import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
test("运营文档增量迁移：两个数据库角色身份的 RLS 隔离", async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role authenticated; create role anon; create schema auth;
 create function auth.uid() returns uuid language sql as $$select nullif(current_setting('test.uid',true),'')::uuid$$;
 create table workspaces(id uuid primary key,owner_id uuid);
 create function public.is_workspace_owner(target uuid) returns boolean language sql security definer as $$select exists(select 1 from public.workspaces where id=target and owner_id=auth.uid())$$;
 create function public.set_updated_at() returns trigger language plpgsql as $$begin new.updated_at=now(); return new; end$$;
 create function public.analyze_source(text,uuid) returns void language sql as $$select$$;
 insert into workspaces values ('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000011'),('00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000022');`);
    await db.exec(
      await readFile(
        "supabase/migrations/20261002000000_daily_operations.sql",
        "utf8",
      ),
    );
    await db.exec(
      `insert into operation_documents(workspace_id,body) values ('00000000-0000-4000-8000-000000000001','{}'),('00000000-0000-4000-8000-000000000002','{}');set role authenticated;set test.uid='00000000-0000-4000-8000-000000000011';`,
    );
    assert.equal(
      (await db.query("select * from operation_documents")).rows.length,
      1,
    );
    assert.equal(
      (
        await db.query(
          "update operation_documents set revision=revision+1 where workspace_id='00000000-0000-4000-8000-000000000002' returning *",
        )
      ).rows.length,
      0,
    );
    await assert.rejects(
      db.exec(
        "insert into operation_documents(workspace_id,body) values('00000000-0000-4000-8000-000000000002','{}') on conflict(workspace_id) do update set body='{}'",
      ),
    );
    await assert.rejects(
      db.exec(
        "select analyze_source('inbox','00000000-0000-4000-8000-000000000001')",
      ),
    );
    await db.exec("set test.uid='00000000-0000-4000-8000-000000000022'");
    assert.equal(
      (await db.query("select * from operation_documents")).rows.length,
      1,
    );
    await db.exec("set role anon");
    await assert.rejects(db.query("select * from operation_documents"));
  } finally {
    await db.close();
  }
});
