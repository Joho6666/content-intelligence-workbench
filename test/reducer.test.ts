import test from "node:test";
import assert from "node:assert/strict";
import { reducer, initialState } from "../src/lib/reducer";
import { getOutlierLevel, getOutlierLabel, getOutlierBadgeTone } from "../src/lib/outlier";
import type { SourceRef, IdeaStatus, RecordStatus } from "../src/types";

test("Reducer - 转选题去重 (convert to idea deduplication)", async (t) => {
  await t.test("第一次转选题应新增对应 Idea 并将源状态更新为已转选题", () => {
    const source: SourceRef = { kind: "inbox", id: "inbox-1" };
    const sourceItemBefore = initialState.inbox.find((x) => x.id === "inbox-1");
    assert.ok(sourceItemBefore, "源条目应存在");

    
    const nextState = reducer(initialState, { type: "convert", source });

    const sourceItemAfter = nextState.inbox.find((x) => x.id === "inbox-1");
    assert.equal(sourceItemAfter?.status, "已转选题");

    const newIdea = nextState.ideas.find((i) =>
      i.sourceIds.some((s) => s.kind === "inbox" && s.id === "inbox-1")
    );
    assert.ok(newIdea, "应该生成对应的 Idea");
    assert.equal(newIdea?.title, sourceItemBefore?.title);
  });

  await t.test("重复点击转选题不会产生重复的 Idea", () => {
    const source: SourceRef = { kind: "inbox", id: "inbox-1" };
    const state1 = reducer(initialState, { type: "convert", source });
    const ideasCount1 = state1.ideas.length;

    // 再次调用 convert
    const state2 = reducer(state1, { type: "convert", source });
    const ideasCount2 = state2.ideas.length;

    assert.equal(ideasCount2, ideasCount1, "选题总数不应增加");

    // 验证匹配该源条目的 idea 数量恰好为 1
    const matchingIdeas = state2.ideas.filter((i) =>
      i.sourceIds.some((s) => s.kind === "inbox" && s.id === "inbox-1")
    );
    assert.equal(matchingIdeas.length, 1, "同一源条目的 Idea 只能有 1 个");
  });

  await t.test("情报库条目转选题同样去重", () => {
    const source: SourceRef = { kind: "intelligence", id: "intel-1" };
    const state1 = reducer(initialState, { type: "convert", source });
    const ideasCount1 = state1.ideas.length;

    const state2 = reducer(state1, { type: "convert", source });
    assert.equal(state2.ideas.length, ideasCount1, "情报库条目重复转选题不应新增记录");
  });
});

test("Reducer - 状态更新 (status updates)", async (t) => {
  await t.test("更新单个条目状态", () => {
    const nextState = reducer(initialState, {
      type: "status",
      kind: "inbox",
      ids: ["inbox-1"],
      status: "高潜" as RecordStatus,
    });
    const item = nextState.inbox.find((x) => x.id === "inbox-1");
    assert.equal(item?.status, "高潜");
  });

  await t.test("批量更新多个条目状态", () => {
    const targetIds = ["intel-1", "intel-2", "intel-3"];
    const nextState = reducer(initialState, {
      type: "status",
      kind: "intelligence",
      ids: targetIds,
      status: "已归档" as RecordStatus,
    });

    targetIds.forEach((id) => {
      const item = nextState.intelligence.find((x) => x.id === id);
      assert.equal(item?.status, "已归档", `${id} 应该为已归档`);
    });
  });

  await t.test("忽略条目状态更新", () => {
    const nextState = reducer(initialState, {
      type: "status",
      kind: "inbox",
      ids: ["inbox-2"],
      status: "已忽略" as RecordStatus,
    });
    const item = nextState.inbox.find((x) => x.id === "inbox-2");
    assert.equal(item?.status, "已忽略");
  });
});

test("Reducer - 拖拽排序与跨列移动 (drag & drop reordering)", async (t) => {
  await t.test("跨列移动：将选题移动至新的看板列", () => {
    const targetIdea = initialState.ideas[0];
    assert.ok(targetIdea, "至少存在一个选题");

    const newStatus: IdeaStatus = "已发布";
    const nextState = reducer(initialState, {
      type: "moveIdea",
      id: targetIdea.id,
      status: newStatus,
    });

    const updated = nextState.ideas.find((i) => i.id === targetIdea.id);
    assert.equal(updated?.status, newStatus, "选题状态应更新为目标列状态");
  });

  await t.test("同列重排：将选题插入到指定选题之前", () => {
    // 选出两个状态相同的选题，或设置相同状态
    const ideaA = initialState.ideas[0];
    const ideaB = initialState.ideas[1];
    assert.ok(ideaA && ideaB, "至少存在两个选题");

    const stateWithSameStatus = {
      ...initialState,
      ideas: [
        { ...ideaA, status: "待筛选" as IdeaStatus },
        { ...ideaB, status: "待筛选" as IdeaStatus },
        ...initialState.ideas.slice(2),
      ],
    };

    // 把 ideaB 移到 ideaA 之前
    const nextState = reducer(stateWithSameStatus, {
      type: "moveIdea",
      id: ideaB.id,
      status: "待筛选",
      beforeId: ideaA.id,
    });

    const idxB = nextState.ideas.findIndex((i) => i.id === ideaB.id);
    const idxA = nextState.ideas.findIndex((i) => i.id === ideaA.id);
    assert.ok(idxB < idxA, "ideaB 应该排在 ideaA 之前");
  });
});

test("Outlier Index 异常指数边界规范", async (t) => {
  await t.test("< 1.5x 为普通表现", () => {
    assert.equal(getOutlierLevel(0.8), "normal");
    assert.equal(getOutlierLevel(1.2), "normal");
    assert.equal(getOutlierLevel(1.49), "normal");
    assert.equal(getOutlierBadgeTone(1.2), "gray");
    assert.match(getOutlierLabel(1.2), /常规表现|普通/);
  });

  await t.test("1.5x 至 3.0x 为值得注意", () => {
    assert.equal(getOutlierLevel(1.5), "notable");
    assert.equal(getOutlierLevel(2.1), "notable");
    assert.equal(getOutlierLevel(3.0), "notable");
    assert.equal(getOutlierBadgeTone(2.4), "orange");
    assert.match(getOutlierLabel(2.4), /值得注意/);
  });

  await t.test("> 3.0x 为异常爆款", () => {
    assert.equal(getOutlierLevel(3.01), "viral");
    assert.equal(getOutlierLevel(3.8), "viral");
    assert.equal(getOutlierLevel(5.2), "viral");
    assert.equal(getOutlierBadgeTone(3.8), "red");
    assert.match(getOutlierLabel(3.8), /异常爆款/);
  });
});
