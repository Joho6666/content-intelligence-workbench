import type { InboxItem } from "../types";
import { mockIntelligence } from "./mock-intelligence";
export const mockInbox:InboxItem[]=mockIntelligence.slice(0,12).map((item,i)=>({...item,id:`inbox-${i+1}`,mode:(["链接","选中内容","我的重点"] as const)[i%3],status:i%3===0?"高潜":"待处理",aiScore:i%2?null:item.aiScore,analysis:i%2?undefined:item.analysis}));
