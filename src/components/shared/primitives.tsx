"use client";
import type {ReactNode} from "react";
import {useEffect,useRef,useState} from "react";
import {useRouter,useSearchParams} from "next/navigation";
import {FileText,Lightbulb,Sparkles,CheckCircle2,X,Inbox} from "lucide-react";
import {Button} from "../ui/button";
import {Skeleton} from "../ui/skeleton";
import {Sheet,SheetContent,SheetTitle,SheetDescription} from "../ui/sheet";
import {Stat} from "./legacy";
import type {Platform,Priority,RecordStatus} from "../../types";
import {cn} from "../../lib/utils";
export {PageHead as PageHeader,Section as SectionHeader} from "./legacy";
export function PlatformBadge({value}:{value:Platform}){return <span className="badge badge-blue whitespace-nowrap">{value}</span>}
export function StatusBadge({value}:{value:RecordStatus|string}){return <span className={cn("badge whitespace-nowrap",value==="高潜"?"badge-purple":value==="已归档"||value==="已转选题"||value==="已发布"?"badge-green":value==="已忽略"?"bg-slate-100 text-slate-500":"badge-orange")}>{value}</span>}
export function PriorityBadge({value}:{value:Priority}){return <span className={cn("badge",value==="S"?"badge-red":value==="A"?"badge-orange":"badge-blue")}>{value} 优先级</span>}
export function AIScoreBadge({value}:{value:number|null}){return value===null?<span className="subtle">未分析</span>:<span className="score">{value}</span>}
export function TagList({tags}:{tags:string[]}){return <div className="flex flex-wrap gap-1">{tags.map(tag=><span className="badge badge-blue" key={tag}>{tag}</span>)}</div>}
export function ContentThumbnail({color,title,large=false}:{color:string;title:string;large?:boolean}){return <div role="img" aria-label={title+" 封面"} className={cn("flex shrink-0 items-center justify-center rounded-md",large?"h-36 w-full":"h-10 w-12")} style={{background:color}}><FileText aria-hidden className={cn("text-slate-500/60",large?"size-12":"size-5")}/></div>}
export function Stats({items}:{items:{label:string;value:number|string;sub:string}[]}){const icons=[FileText,Lightbulb,Sparkles,CheckCircle2];return <div className="stats">{items.map((item,i)=><Stat key={item.label} icon={icons[i%4]} label={item.label} value={String(item.value)} delta="" sub={item.sub} color={["#3378f6","#f1a535","#856eea","#37b986"][i%4]}/>)}</div>}
export function FilterSelect({label,value,onChange,options}:{label:string;value:string;onChange:(value:string)=>void;options:readonly string[]}){return <label className="flex items-center gap-2 whitespace-nowrap text-xs text-slate-500">{label}<select className="h-9 rounded-lg border bg-white px-2 text-[13px] text-slate-700" aria-label={label} value={value} onChange={e=>onChange(e.target.value)}><option value="">全部</option>{options.map(x=><option key={x}>{x}</option>)}</select></label>}
export function EmptyState({title="没有匹配的内容",description="试试清除筛选条件，或添加第一条记录。",children}:{title?:string;description?:string;children?:ReactNode}){return <div className="flex min-h-56 flex-col items-center justify-center gap-3 rounded-lg border border-dashed bg-white p-8 text-center"><Inbox className="text-slate-400"/><h2 className="font-semibold">{title}</h2><p className="text-sm text-slate-500">{description}</p>{children}</div>}
export function MockBoundary({children}:{children:ReactNode}){const params=useSearchParams();const router=useRouter();const state=params.get("mockState");if(state==="loading")return <div role="status" aria-label="正在加载" className="space-y-4">{[1,2,3,4].map(x=><Skeleton key={x} className="h-20 w-full"/>)}</div>;if(state==="empty")return <EmptyState/>;if(state==="error")return <EmptyState title="暂时无法加载内容" description="模拟请求失败，请重试。"><Button onClick={()=>{const next=new URLSearchParams(params);next.delete("mockState");router.replace("?"+next.toString())}}>重试</Button></EmptyState>;return children;}
export function useDetailSelection(){const params=useSearchParams();const router=useRouter();const selected=params.get("item");return {selected,select:(id:string|null)=>{const next=new URLSearchParams(params);if(id)next.set("item",id);else next.delete("item");router.replace("?"+next.toString(),{scroll:false})}}}
export function RightDetailPanel({title,children,onClose}:{title:string;children:ReactNode;onClose:()=>void}){
 const [wide,setWide]=useState(false);const panel=useRef<HTMLElement>(null);const close=useRef(onClose);
 useEffect(()=>{close.current=onClose},[onClose]);
 useEffect(()=>{const query=window.matchMedia("(min-width: 1440px)");const update=()=>setWide(query.matches);update();query.addEventListener("change",update);return()=>query.removeEventListener("change",update)},[]);
 useEffect(()=>{if(!wide)return;const previous=document.activeElement as HTMLElement;panel.current?.focus();return()=>previous?.focus()},[wide,title]);
 if(!wide)return <Sheet open onOpenChange={open=>{if(!open)close.current()}}><SheetContent className="w-full overflow-y-auto p-5 sm:max-w-md"><SheetTitle>{title}</SheetTitle><SheetDescription>查看内容详情与相关操作</SheetDescription><div className="mt-5 space-y-5">{children}</div></SheetContent></Sheet>;
 return <aside ref={panel} tabIndex={-1} aria-label={title+" 详情"} onKeyDown={e=>{if(e.key==="Escape")onClose()}} className="sticky top-20 max-h-[calc(100vh-100px)] w-[330px] shrink-0 overflow-y-auto rounded-xl border bg-white p-4 outline-none"><div className="mb-4 flex items-start justify-between gap-2"><h2 className="font-semibold">{title}</h2><Button size="icon" variant="ghost" aria-label="关闭详情" onClick={onClose}><X className="size-4"/></Button></div><div className="space-y-5">{children}</div></aside>;
}
