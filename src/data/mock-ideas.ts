import type { Idea } from "../types";
import { ideaStatuses } from "../types";
import { topics } from "./mock-intelligence";
export function makeIdea(id:string,title:string):Idea{return {id,title,angle:"从真实使用场景出发",priority:"A",platforms:["小红书"],status:"待筛选",tags:["内容创作"],sourceIds:[],score:86,core:"工具辅助思考，真实经验创造价值。",audience:"创作者 / 职场人 / 学生",cta:"收藏这套方法，开始一次自己的实践。",titles:[title,"我用三个步骤改变了内容工作流","从收藏到输出：一次真实实践"],outline:"",hook:"",script:"",materials:"屏幕录制、实践截图、使用前后对比",strategy:"先发布图文版本收集反馈，再制作教程视频。"}}
export const mockIdeas=topics.slice(0,9).map((title,i)=>({...makeIdea(`demo-${i+1}`,title),status:ideaStatuses[i%6],priority:(["S","A","B"] as const)[i%3]}));
export const generationTemplates={outline:"1. Hook：展示真实结果\n2. 问题：为什么收藏很多却输出很少\n3. 观点：建立可重复的整理方法\n4. 案例：一周实践前后对比\n5. 方法：收集、归纳、验证、表达\n6. CTA：收藏并开始实践",hook:"你也收藏了很多资料，却迟迟没有完成一篇内容吗？这次我用一个简单的工作流，把信息变成了输出。",script:"【开场】先看这份实践前后的对比。\n【问题】工具很多，但我们缺少稳定的方法。\n【演示】先记录目标，再归纳观点，最后用案例验证。\n【结尾】选一条收藏，今天就开始实践。"};
