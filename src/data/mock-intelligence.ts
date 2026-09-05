import type { IntelligenceItem, Analysis } from "../types";
import { platforms } from "../types";
export const mockAnalysis: Analysis = {
 summary:"通过真实场景连接工具与结果，先展示变化，再解释方法。",
 core:"AI 放大判断与执行能力，内容的价值来自真实经验。",
 reasons:["切入点具体，适合目标受众","结构清晰，有可复用的方法","可通过案例对比验证效果"],
 angles:["用一个真实案例拆解完整工作流","从结果出发，展示三个关键步骤","对比使用前后，复盘方法的边界"],
};
export const topics=["AI 让普通人也能做出专业内容","短视频的反套路内容正在流行","独立开发者的增长策略拆解","Notion + AI：我的内容管理系统","AI Agent 为什么会成为下一波内容机会？","AI Coding 的真实使用经验","知识管理：从收藏到输出","个人 IP 的长期内容策略","一人团队的 AI Workflow","B2B 获客的案例复盘","YouTube 教程的 Hook 设计","内容创作中的用户访谈"];
const colors=["#dbe7f5","#e5ddd5","#dce9d9","#f0e0cc"];
export const mockIntelligence: IntelligenceItem[]=Array.from({length:36},(_,i)=>({
 id:`intel-${i+1}`,title:topics[i%topics.length]+(i>=12?` · ${["方法篇","案例篇"][Math.floor(i/12)-1]}`:""),
 summary:"从真实使用场景出发，拆解可复用的方法，连接灵感与实际内容创作。",
 originalContent:`${topics[i%topics.length]}。先明确目标，再选择工具。我们记录了一周的实践过程：收集信息、整理观点、制作初稿，最后通过反馈改进表达。有效的方法应当可验证、可复用，也需要说明适用边界。`,
 note:i%2?"值得借鉴开场和案例结构，避免只罗列工具。":"可以结合自己的实践做一次对比。",
 url:"https://example.com/content/"+(i+1),platform:platforms[i%platforms.length],
 sourceType:["手动发现","对手监控","AI 搜索","RSS","自己想到"][i%5],
 captureMethod:(["手动收藏","快速添加","浏览器插件","自己想到"] as const)[i%4],
 author:["林小北","TechFlow","少数派","山野君"][i%4],thumbnail:colors[i%4],
 aiScore:65+(i*7)%34,status:(["待分析","高潜","已归档","已忽略"] as const)[i%4],
 tags:[["AI 工具","内容形式","产品增长","知识管理"][i%4],"内容创作"],
 capturedAt:new Date(Date.UTC(2026,8,5,10)-i*3600000).toISOString(),
 metrics:{views:18000+i*1300,likes:850+i*17},analysis:mockAnalysis,
}));
