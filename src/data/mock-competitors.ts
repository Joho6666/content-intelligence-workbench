import type { Competitor } from "../types";
import { platforms } from "../types";
import { topics } from "./mock-intelligence";
export const mockCompetitors:Competitor[]=["科技新知","产品观察室","AI Coding Creator","增长研究所","AI 生活家","数字前沿","职场研究所","生活方式志"].map((name,i)=>({
 id:`competitor-${i+1}`,name,handle:`@creator${i+1}`,platform:platforms[i%6],avatar:name.slice(0,1),
 description:"持续记录 AI 工具、内容方法与真实实践。",followers:560000+i*190000,posts7d:7+i,avgViews:18000+i*9000,avgEngagement:2.1+i*.4,
 outlierIndex:[1.2,1.5,2.4,3,3.8,4.2,.8,2.1][i],recentTopics:[["AI Agent","AI Coding","知识管理","AI Workflow","个人 IP"][i%5],"创作者增长"],
 updatedAt:"2026-09-05T10:24:00Z",monitored:true,
 recentContent:topics.slice(i,i+3).map((title,j)=>({id:`recent-${i}-${j}`,title,thumbnail:["#dbe7f5","#e5ddd5","#dce9d9"][j],views:22000*(j+1)*(i+1),likes:500*(j+1),outlier:1.2+j*1.5})),
 trend:Array.from({length:14},(_,j)=>({date:`8/${22+j}`,views:20000+i*1700+j*j*210,baseline:18000+i*500+j*100})),
 hooks:[{label:"提问式",value:22+i},{label:"结果先行",value:32+i},{label:"反常识",value:18},{label:"数字型",value:16},{label:"对比型",value:12}],
 insights:[`${name} 最近 14 天从工具介绍转向工作流案例，新方向平均表现约为过去均值的 2.4 倍。`,"结果先行型 Hook 在近期高表现内容中的占比上升。","建议用自己的实践案例验证，而非直接复制选题。"],
}));
