import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createServer } from "node:http";
import { handleOperations } from "../src/server/operations/router";
import { localDatabase } from "../src/server/operations/store";
import { totalMetric } from "../src/features/operations/model";

test("真实手动闭环、附件恢复、故障与并发保护（AI 使用测试接口）", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "ciw-"));
  process.env.WORKBENCH_DATA_DIR = directory;
  process.env.APP_STORAGE = "local";
  async function call(
    route: string,
    method = "GET",
    body?: unknown,
    origin?: string,
  ) {
    const response = await handleOperations(
      new Request("http://localhost/api/v1/" + route, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...(origin ? { origin } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      }),
    );
    return { status: response.status, body: await response.json() };
  }
  let mode = "valid";
  const seen: unknown[] = [];
  const fixture = createServer(async (req, res) => {
    let body = "";
    for await (const chunk of req) body += chunk;
    seen.push(JSON.parse(body));
    if (mode === "timeout") return;
    res.setHeader("Content-Type", "application/json");
    const prompt = JSON.parse(body).messages[1].content;
    let result: unknown = { ok: true };
    if (prompt.includes("分析参考内容"))
      result = {
        summary: "测试材料摘要",
        core: "材料事实",
        reasons: [],
        angles: ["领域切入点"],
        facts: ["原文事实"],
        suggestions: ["创作建议"],
      };
    if (prompt.includes("生成原创运营稿")) {
      const material = JSON.parse(prompt.split("参考材料 JSON：")[1]);
      result = {
        title: material.account.domain + "选题",
        hook: "开场",
        outline: "大纲",
        script: "测试脚本",
        caption: "测试文案",
        materials: "素材",
      };
    }
    if (mode === "invalid") result = { wrong: true };
    res.end(
      JSON.stringify({
        choices: [{ message: { content: JSON.stringify(result) } }],
      }),
    );
  });
  await new Promise<void>((r) => fixture.listen(0, "127.0.0.1", r));
  const address = fixture.address() as { port: number };
  try {
    const first = (await call("bootstrap")).body.data;
    assert.equal(first.inbox.length, 0);
    assert.equal(
      (await call("bootstrap", "GET", undefined, "https://evil.example"))
        .status,
      403,
    );
    const accounts = [];
    for (const [name, domain, platform] of [
      ["健身号", "健身", "抖音"],
      ["家居号", "家居", "小红书"],
    ])
      accounts.push(
        (
          await call("accounts", "POST", {
            name,
            domain,
            platform,
            audience: "新手",
            tone: "清楚",
            goal: "获客",
          })
        ).body.data,
      );
    const png =
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aS9sAAAAASUVORK5CYII=";
    const asset = (
      await call("assets", "POST", {
        name: "reference.png",
        mime: "image/png",
        base64: png,
      })
    ).body.data;
    const linkOnly = (
      await call("inbox", "POST", {
        title: "待补全",
        url: "https://v.douyin.com/reference",
        platform: "抖音",
        accountId: accounts[0].id,
        assetIds: [asset.id],
      })
    ).body.data;
    assert.equal(linkOnly.status, "待补充");
    assert.equal(
      (await call("inbox/" + linkOnly.id + "/analyze", "POST", {})).status,
      422,
    );
    assert.equal(
      (
        await call("inbox", "POST", {
          title: "重复",
          url: linkOnly.url + "?utm_source=share",
        })
      ).status,
      409,
    );
    const sources = [];
    for (let i = 0; i < 2; i++) {
      const source = (
        await call("inbox", "POST", {
          title: "原文" + i,
          platform: accounts[i].platform,
          accountId: accounts[i].id,
          originalContent: "用户手动提供的参考原文",
        })
      ).body.data;
      sources.push(source);
    }
    assert.equal(
      (await call("inbox/" + sources[0].id + "/analyze", "POST", {})).status,
      503,
    );
    await call("connection", "PUT", {
      baseUrl: `http://127.0.0.1:${address.port}/v1`,
      model: "fixture",
      apiKey: "test-only-secret",
    });
    assert.equal((await call("connection")).body.data.apiKey, undefined);
    assert.equal((await call("connection/test", "POST", {})).status, 200);
    let firstIdea = "";
    let firstDraft = "";
    for (let i = 0; i < 2; i++) {
      const analysis = await call(
        "inbox/" + sources[i].id + "/analyze",
        "POST",
        {},
      );
      assert.equal(analysis.status, 200);
      assert.equal(analysis.body.data.analysis.model, "fixture");
      const edited = await call("inbox/" + sources[i].id, "PATCH", {
        originalContent: sources[i].originalContent,
        note: "只改备注",
      });
      assert.ok(edited.body.data.analysis);
      const idea: { id: string } = (
        await call("inbox/" + sources[i].id + "/convert", "POST", {})
      ).body.data.idea;
      assert.equal(
        (await call("inbox/" + sources[i].id + "/convert", "POST", {})).body
          .data.created,
        false,
      );
      const preview: { title: string } = (
        await call("ideas/" + idea.id + "/generate", "POST", {
          accountId: accounts[i].id,
          platform: accounts[i].platform,
        })
      ).body.data;
      assert.ok(preview.title.includes(accounts[i].domain));
      assert.equal((await call("bootstrap")).body.data.drafts.length, i);
      const draft: { id: string } = (await call("drafts", "POST", preview)).body
        .data;
      assert.equal(
        (
          await call("drafts/" + draft.id, "PATCH", {
            title: "手工修改",
            version: 99,
          })
        ).status,
        409,
      );
      const saved = await call("drafts/" + draft.id, "PATCH", {
        title: "手工修改",
        version: 1,
      });
      assert.equal(saved.status, 200);
      await call("ideas/" + idea.id + "/generate", "POST", {
        accountId: accounts[i].id,
        platform: accounts[i].platform,
      });
      assert.equal(
        (await call("drafts/" + draft.id)).body.data.title,
        "手工修改",
      );
      if (i === 0) {
        firstIdea = idea.id;
        firstDraft = draft.id;
      }
    }
    const secondDraft = (
      await call("drafts", "POST", {
        ideaId: firstIdea,
        accountId: accounts[0].id,
        platform: "小红书",
        title: "双平台稿件",
      })
    ).body.data;
    const contents = [];
    for (const [platform, draftId] of [
      ["抖音", firstDraft],
      ["小红书", secondDraft.id],
    ]) {
      assert.equal(
        (
          await call("content", "POST", {
            title: "未完整发布",
            platform,
            status: "已发布",
          })
        ).status,
        422,
      );
      const content = (
        await call("content", "POST", {
          title: "人工发布",
          platform,
          draftId,
          ideaId: firstIdea,
          accountId: accounts[0].id,
          status: "已发布",
          publishedAt: "2026-10-01T12:00:00Z",
          publishedUrl: "https://example.com/" + platform,
          scheduledAt: "2026-10-01T11:00:00Z",
        })
      ).body.data;
      assert.ok(content.id);
      contents.push(content);
    }
    for (const views of [100, 150])
      assert.equal(
        (
          await call("snapshots", "POST", {
            contentId: contents[0].id,
            capturedAt:
              views === 100 ? "2026-10-01T15:00:00Z" : "2026-10-02T15:00:00Z",
            metrics: { views },
          })
        ).status,
        201,
      );
    const backup = (await call("backup")).body;
    assert.equal(totalMetric(backup.state.snapshots, "views"), 150);
    assert.ok(backup.state.assets[0].base64);
    assert.ok(!JSON.stringify(backup).includes("test-only-secret"));
    const damaged = structuredClone(backup);
    damaged.state.drafts[0].sourceIds = [
      "00000000-0000-4000-8000-000000000000",
    ];
    assert.equal(
      (await call("backup", "POST", { confirm: true, backup: damaged })).status,
      422,
    );
    mode = "invalid";
    assert.equal(
      (await call("inbox/" + sources[0].id + "/analyze", "POST", {})).status,
      422,
    );
    mode = "timeout";
    process.env.AI_TIMEOUT_MS = "30";
    assert.equal((await call("connection/test", "POST", {})).status, 503);
    delete process.env.AI_TIMEOUT_MS;
    assert.equal(
      (await call("drafts/" + firstDraft)).body.data.title,
      "手工修改",
    );
    const db = await localDatabase();
    await db.close();
    delete (globalThis as { workbenchDb?: unknown }).workbenchDb;
    const restarted = (await call("bootstrap")).body.data;
    assert.equal(restarted.workspace.id, first.workspace.id);
    assert.equal(restarted.drafts.length, 3);
    await (await localDatabase()).close();
    delete (globalThis as { workbenchDb?: unknown }).workbenchDb;
    process.env.WORKBENCH_DATA_DIR = path.join(directory, "clean");
    const clean = (await call("bootstrap")).body.data;
    assert.notEqual(clean.workspace.id, first.workspace.id);
    assert.equal(
      (await call("backup", "POST", { confirm: true, backup })).status,
      200,
    );
    const restored = (await call("bootstrap")).body.data;
    assert.equal(restored.drafts.length, 3);
    assert.equal(restored.workspace.id, clean.workspace.id);
    assert.equal(restored.assets.length, 1);
    assert.ok(seen.length > 5);
  } finally {
    fixture.closeAllConnections();
    await new Promise<void>((r) => fixture.close(() => r()));
    await (await localDatabase()).close();
    delete (globalThis as { workbenchDb?: unknown }).workbenchDb;
    await rm(directory, { recursive: true, force: true });
  }
});
