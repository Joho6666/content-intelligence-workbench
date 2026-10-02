import { spawn } from "node:child_process";
import { mkdtemp, rm, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import { chromium } from "@playwright/test";
async function main() {
  const directory = await mkdtemp(path.join(tmpdir(), "ciw-browser-"));
  const base = "http://127.0.0.1:3420";
  let proc = spawn(
    process.execPath,
    [
      "node_modules/next/dist/bin/next",
      "start",
      "--hostname",
      "127.0.0.1",
      "--port",
      "3420",
    ],
    {
      env: {
        ...process.env,
        APP_STORAGE: "local",
        WORKBENCH_DATA_DIR: directory,
        AI_API_KEY: "",
      },
      stdio: "pipe",
    },
  );
  let serverOutput = "";
  proc.stderr.on("data", (d) => {
    serverOutput += d.toString();
  });
  let qaPage: import("@playwright/test").Page | undefined;
  let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
  try {
    for (let i = 0; i < 80; i++) {
      try {
        if ((await fetch(base + "/api/v1/health")).ok) break;
      } catch {}
      if (i === 79) throw new Error("启动失败：" + serverOutput);
      await new Promise((r) => setTimeout(r, 250));
    }
    browser = await chromium.launch({
      headless: true,
      ...(process.env.CHROME_EXECUTABLE
        ? { executablePath: process.env.CHROME_EXECUTABLE }
        : {}),
    });
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
    });
    const page = await context.newPage();
    qaPage = page;
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("response", async (response) => {
      if (response.status() >= 400)
        console.log(
          "HTTP",
          response.status(),
          response.url(),
          await response.text().catch(() => ""),
        );
    });
    page.on("dialog", (d) => void d.accept());
    await page.goto(base + "/settings");
    const accountNames = ["QA健身号", "QA家居号"];
    for (let i = 0; i < 2; i++) {
      await page.getByRole("button", { name: "添加账号", exact: true }).click();
      const dialog = page.getByRole("dialog");
      await dialog.getByLabel("账号名称").fill(accountNames[i]);
      await dialog.getByLabel("内容领域").fill(i === 0 ? "健身" : "家居");
      await dialog.getByLabel("目标受众").fill("新手");
      await dialog
        .getByLabel("主要平台")
        .selectOption(i === 0 ? "抖音" : "小红书");
      await dialog.getByRole("button", { name: "保存账号" }).click();
      try {
        await dialog.waitFor({ state: "hidden", timeout: 6000 });
      } catch (error) {
        console.log(await dialog.innerText());
        throw error;
      }
    }
    for (let i = 0; i < 2; i++) {
      await page.goto(base + "/inbox");
      await page.getByRole("button", { name: "添加参考内容" }).click();
      const dialog = page.getByRole("dialog");
      await dialog.getByLabel("标题").fill("QA参考" + i);
      await dialog
        .getByLabel("粘贴平台分享文本")
        .fill(
          i === 0
            ? "分享：https://v.douyin.com/qa-" + i
            : "分享：https://xhslink.com/qa-" + i,
        );
      await dialog
        .getByLabel("正文 / 视频字幕")
        .fill(
          i === 0
            ? "手动字幕：训练动作慢速完成。"
            : "手动正文：家居收纳按使用频率分类。",
        );
      const accounts = (await (await fetch(base + "/api/v1/bootstrap")).json())
        .data.accounts;
      await dialog
        .getByLabel("用于哪个运营账号")
        .selectOption(
          accounts.find((a: { name: string }) => a.name === accountNames[i]).id,
        );
      await dialog.getByRole("button", { name: "保存材料" }).click();
      try {
        await dialog.waitFor({ state: "hidden", timeout: 6000 });
      } catch (error) {
        console.log(await dialog.innerText());
        throw error;
      }
    }
    await page
      .locator("article")
      .filter({ hasText: "QA参考0" })
      .getByRole("button", { name: "AI 分析" })
      .click();
    await page
      .getByText("请先在设置中配置 AI 接口和密钥；你的内容已保留。")
      .first()
      .waitFor();
    await page
      .locator("article")
      .filter({ hasText: "QA参考0" })
      .getByRole("button", { name: "转为选题" })
      .click();
    await page
      .locator("article")
      .filter({ hasText: "QA参考0" })
      .getByText("已转选题", { exact: true })
      .waitFor();
    await page.goto(base + "/ideas");
    await page.getByRole("link", { name: "QA参考0", exact: true }).click();
    await page.getByLabel("稿件运营账号").waitFor();
    await page.getByLabel("稿件平台").selectOption("抖音");
    await page.getByLabel("视频脚本").fill("这是手工稿件，刷新后必须保留。");
    await page.getByText("已保存 ·").waitFor();
    await page.reload();
    await page.getByLabel("稿件平台").selectOption("抖音");
    await page.getByLabel("视频脚本").waitFor();
    assert.equal(
      await page.getByLabel("视频脚本").inputValue(),
      "这是手工稿件，刷新后必须保留。",
    );
    await page.route("**/api/v1/drafts/**", (route) =>
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({
          error: { code: "INTERNAL_ERROR", message: "QA模拟保存失败" },
        }),
      }),
    );
    await page.getByLabel("视频脚本").fill("失败时仍要保留的修改");
    await page.getByText("QA模拟保存失败").waitFor();
    assert.equal(
      await page.getByLabel("视频脚本").inputValue(),
      "失败时仍要保留的修改",
    );
    await page.unroute("**/api/v1/drafts/**");
    await page.getByRole("button", { name: "立即保存" }).click();
    await page.getByText("已保存 ·").waitFor();
    await Promise.all([
      page.waitForResponse(
        (r) =>
          r.url().endsWith("/api/v1/content") &&
          r.request().method() === "POST",
      ),
      page.getByRole("button", { name: "加入内容执行" }).click(),
    ]);
    await page.goto(base + "/production");
    await page.getByText("QA参考0").first().waitFor();
    await page.getByRole("button", { name: "编辑 / 登记发布" }).click();
    const publication = page.getByRole("dialog");
    await publication.getByLabel("制作状态").selectOption("已发布");
    await publication.getByLabel("计划发布时间").fill("2026-10-02T10:00");
    await publication.getByLabel("实际发布时间").fill("2026-10-02T10:10");
    await publication
      .getByLabel("真实发布链接")
      .fill("https://www.douyin.com/video/qa");
    await publication.getByRole("button", { name: "保存内容记录" }).click();
    await publication.waitFor({ state: "hidden" });
    await page.goto(base + "/analytics");
    await page.getByRole("button", { name: "录入表现" }).click();
    const performance = page.getByRole("dialog");
    await performance.getByLabel("播放 / 阅读").fill("150");
    await performance.getByLabel("点赞", { exact: true }).fill("10");
    await performance.getByLabel("获客数").fill("2");
    await performance.getByRole("button", { name: "保存表现快照" }).click();
    await performance.waitFor({ state: "hidden" });
    assert.ok((await page.locator("main").innerText()).includes("150"));
    const boot = (await (await fetch(base + "/api/v1/bootstrap")).json()).data;
    const owner = boot.workspace.id;
    const fresh = await browser.newContext();
    const freshPage = await fresh.newPage();
    await freshPage.goto(base + "/settings");
    assert.equal(
      (
        await freshPage.request
          .get(base + "/api/v1/bootstrap")
          .then((r) => r.json())
      ).data.workspace.id,
      owner,
    );
    await fresh.close();
    const artifacts = path.resolve(process.env.QA_ARTIFACT_DIR || "work/qa");
    await mkdir(artifacts, { recursive: true });
    await page.goto(base + "/");
    await page.screenshot({
      path: path.join(artifacts, "desktop.png"),
      fullPage: true,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    for (const route of [
      "/",
      "/settings",
      "/inbox",
      "/ideas",
      "/production",
      "/calendar",
      "/analytics",
      "/competitors",
      "/patterns",
      "/workflows",
    ]) {
      await page.goto(base + route);
      await page.locator(".op-root h1").waitFor();
      await page.waitForFunction(
        () => !document.body.innerText.includes("正在读取本机工作区"),
      );
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth,
      );
      assert.equal(overflow, false, "手机横向溢出 " + route);
    }
    await page.goto(base + "/inbox");
    await page.screenshot({
      path: path.join(artifacts, "mobile.png"),
      fullPage: true,
    });
    assert.deepEqual(errors, []);
    proc.kill("SIGTERM");
    await new Promise<void>((resolve) => proc.once("exit", () => resolve()));
    proc = spawn(
      process.execPath,
      [
        "node_modules/next/dist/bin/next",
        "start",
        "--hostname",
        "127.0.0.1",
        "--port",
        "3420",
      ],
      {
        env: {
          ...process.env,
          APP_STORAGE: "local",
          WORKBENCH_DATA_DIR: directory,
          AI_API_KEY: "",
        },
        stdio: "pipe",
      },
    );
    for (let i = 0; i < 80; i++) {
      try {
        const response = await fetch(base + "/api/v1/bootstrap");
        if (response.ok) {
          const restarted = (await response.json()).data;
          assert.equal(restarted.workspace.id, owner);
          assert.equal(restarted.snapshots.length, 1);
          assert.equal(restarted.drafts[0].script, "失败时仍要保留的修改");
          break;
        }
      } catch (error) {
        if (error instanceof assert.AssertionError) throw error;
      }
      if (i === 79) throw new Error("生产进程重启未恢复");
      await new Promise((resolve) => setTimeout(resolve, 250));
    }

    console.log(
      "浏览器通过：双账号导入、AI未配置提示、自动保存、刷新、保存失败保稿、加入制作、人工发布与快照、全新会话、进程重启、桌面及390px手机10页面。",
    );
  } catch (error) {
    if (qaPage) {
      console.log(
        "失败页面",
        qaPage.url(),
        await qaPage
          .locator("main")
          .innerText()
          .catch(() => ""),
      );
      await qaPage
        .screenshot({ path: "work/browser-failure.png", fullPage: true })
        .catch(() => {});
    }
    throw error;
  } finally {
    await browser?.close();
    if (proc.exitCode === null && proc.signalCode === null) {
      proc.kill("SIGTERM");
      await new Promise<void>((r) => proc.once("exit", () => r()));
    }
    await rm(directory, { recursive: true, force: true });
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
