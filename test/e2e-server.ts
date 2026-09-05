import { spawn } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import assert from "node:assert/strict";

if (existsSync(".env.local")) {
  const content = readFileSync(".env.local", "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx > 0) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      process.env[key] ??= val;
    }
  }
}

const PORT = 3000;
const BASE_URL = `http://localhost:${PORT}`;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:58321";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";

async function waitServer() {
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(`${BASE_URL}/`, { redirect: "manual" });
      if (res.status === 200) return;
    } catch {
      // waiting
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error("Server failed to start in 30s");
}

async function run() {
  console.log("Starting Next.js production server on port 3000...");
  const proc = spawn("node", ["node_modules/next/dist/bin/next", "start", "-p", String(PORT)], {
    stdio: "pipe",
    env: process.env,
  });

  proc.stdout?.on("data", (d) => process.stdout.write(`[next] ${d}`));
  proc.stderr?.on("data", (d) => process.stderr.write(`[next-err] ${d}`));

  try {
    await waitServer();
    console.log("Server is ready!");

    // 1. Verify /login redirects to /
    console.log("Testing /login redirect...");
    const loginRes = await fetch(`${BASE_URL}/login`, { redirect: "manual" });
    assert.ok(loginRes.status === 307 || loginRes.status === 308, `/login should redirect with 307 or 308, got ${loginRes.status}`);
    const loginLocation = loginRes.headers.get("location");
    assert.ok(loginLocation === "/" || loginLocation === `${BASE_URL}/`, `/login should redirect to /, got ${loginLocation}`);

    // 2. Verify /signup redirects to /
    console.log("Testing /signup redirect...");
    const signupRes = await fetch(`${BASE_URL}/signup`, { redirect: "manual" });
    assert.ok(signupRes.status === 307 || signupRes.status === 308, `/signup should redirect with 307 or 308, got ${signupRes.status}`);
    const signupLocation = signupRes.headers.get("location");
    assert.ok(signupLocation === "/" || signupLocation === `${BASE_URL}/`, `/signup should redirect to /, got ${signupLocation}`);

    // 3. Verify /auth/callback redirects to /
    console.log("Testing /auth/callback redirect...");
    const callbackRes = await fetch(`${BASE_URL}/auth/callback`, { redirect: "manual" });
    assert.ok(callbackRes.status === 307 || callbackRes.status === 308, `/auth/callback should redirect with 307/308, got ${callbackRes.status}`);
    const callbackLocation = callbackRes.headers.get("location");
    assert.ok(callbackLocation === "/" || callbackLocation === `${BASE_URL}/`, `/auth/callback should redirect to /, got ${callbackLocation}`);

    // 4. Verify / returns 200 and renders app title
    console.log("Testing GET / ...");
    const indexRes = await fetch(`${BASE_URL}/`);
    assert.equal(indexRes.status, 200, "/ should return 200");
    const indexHtml = await indexRes.text();
    assert.ok(indexHtml.includes("Content Intelligence"), "HTML should include workbench branding");

    // 5. Test API without auth -> 401
    console.log("Testing unauthenticated API access...");
    const unauthRes = await fetch(`${BASE_URL}/api/v1/bootstrap`);
    assert.equal(unauthRes.status, 401, "API should return 401 when no auth session exists");
    const unauthJson = await unauthRes.json();
    assert.equal(unauthJson.error?.code, "UNAUTHENTICATED");

    // 6. Test with Anonymous user session
    console.log("Signing in anonymously via Supabase...");
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: anonAuth, error: anonErr } = await supabase.auth.signInAnonymously();
    assert.ok(!anonErr, `Anonymous sign in error: ${anonErr?.message}`);
    assert.ok(anonAuth.session?.access_token, "Must have access token");

    // Prepare cookies simulating @supabase/ssr cookie format
    const projectRef = new URL(supabaseUrl).hostname.split(".")[0];
    const sessionStr = JSON.stringify(anonAuth.session);
    const cookieHeader = `sb-${projectRef}-auth-token=${encodeURIComponent(sessionStr)}`;

    console.log("Testing /api/v1/bootstrap with anonymous session cookie...");
    const bootRes = await fetch(`${BASE_URL}/api/v1/bootstrap`, {
      headers: { Cookie: cookieHeader },
    });
    assert.equal(bootRes.status, 200, `Bootstrap should return 200, got: ${bootRes.status}`);
    const bootJson = await bootRes.json();
    assert.ok(bootJson.data?.workspace, "Bootstrap should return user's workspace");
    console.log("Bootstrap success! Workspace:", bootJson.data.workspace.name);

    // 7. Test creating Inbox item
    console.log("Testing POST /api/v1/inbox with anonymous session...");
    const createInboxRes = await fetch(`${BASE_URL}/api/v1/inbox`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookieHeader,
      },
      body: JSON.stringify({
        title: "端到端自动化验证灵感",
        platform: "网页",
        capture_method: "快速添加",
        mode: "链接",
        url: "https://example.com/test-article",
        note: "自动化测试创建",
      }),
    });
    assert.equal(createInboxRes.status, 201, `Create inbox should return 201, got ${createInboxRes.status}`);
    const createInboxJson = await createInboxRes.json();
    const createdInboxId = createInboxJson.data.id;
    assert.ok(createdInboxId, "Must return created item id");
    console.log("Created inbox item:", createdInboxId);

    // 8. Test analyze source
    console.log("Testing POST /api/v1/inbox/:id/analyze...");
    const analyzeRes = await fetch(`${BASE_URL}/api/v1/inbox/${createdInboxId}/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookieHeader },
      body: JSON.stringify({}),
    });
    assert.equal(analyzeRes.status, 200, "Analyze should return 200");
    const analyzeJson = await analyzeRes.json();
    assert.equal(analyzeJson.data.status, "高潜");
    console.log("Analyze result score:", analyzeJson.data.aiScore);

    // 9. Test convert to idea
    console.log("Testing POST /api/v1/inbox/:id/convert...");
    const convertRes = await fetch(`${BASE_URL}/api/v1/inbox/${createdInboxId}/convert`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookieHeader },
      body: JSON.stringify({}),
    });
    assert.equal(convertRes.status, 200, "Convert should return 200");
    const convertJson = await convertRes.json();
    assert.equal(convertJson.data.created, true);
    const createdIdeaId = convertJson.data.idea.id;
    console.log("Converted idea id:", createdIdeaId);

    // Duplicate convert should return created=false
    const convertAgainRes = await fetch(`${BASE_URL}/api/v1/inbox/${createdInboxId}/convert`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookieHeader },
      body: JSON.stringify({}),
    });
    assert.equal(convertAgainRes.status, 200);
    const convertAgainJson = await convertAgainRes.json();
    assert.equal(convertAgainJson.data.created, false, "Duplicate convert must have created=false");
    assert.equal(convertAgainJson.data.idea.id, createdIdeaId);

    // 10. Test Move idea
    console.log("Testing POST /api/v1/ideas/:id/move...");
    const moveRes = await fetch(`${BASE_URL}/api/v1/ideas/${createdIdeaId}/move`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookieHeader },
      body: JSON.stringify({ status: "候选选题" }),
    });
    assert.equal(moveRes.status, 200, "Move idea should return 200");
    const moveJson = await moveRes.json();
    assert.equal(moveJson.data.status, "候选选题");

    // 11. Verify data persistence across refresh (re-fetching bootstrap)
    console.log("Verifying data persistence via re-bootstrap...");
    const reBootRes = await fetch(`${BASE_URL}/api/v1/bootstrap`, {
      headers: { Cookie: cookieHeader },
    });
    const reBootJson = await reBootRes.json();
    const persistedInbox = reBootJson.data.inbox.find((i: { id: string; status: string }) => i.id === createdInboxId);
    assert.equal(persistedInbox?.status, "已转选题", "Inbox item status should be persisted as 已转选题");
    const persistedIdea = reBootJson.data.ideas.find((i: { id: string; status: string }) => i.id === createdIdeaId);
    assert.equal(persistedIdea?.status, "候选选题", "Idea status should be persisted as 候选选题");
    console.log("Persistence confirmed across re-fetch!");

    console.log("ALL E2E VERIFICATION CHECKS PASSED!");
  } finally {
    proc.kill();
  }
}

run().catch((e) => {
  console.error("E2E verification failed:", e);
  process.exit(1);
});

