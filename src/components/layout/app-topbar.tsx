"use client";
import {useEffect,useState} from "react";
import {useRouter} from "next/navigation";
import {Search,Plus,ChevronDown,Bell,PanelLeft} from "lucide-react";
import {Button} from "../ui/button";
import {CommandDialog,CommandInput,CommandList,CommandEmpty,CommandGroup,CommandItem} from "../ui/command";
import {DropdownMenu,DropdownMenuTrigger,DropdownMenuContent,DropdownMenuItem} from "../ui/dropdown-menu";
import {Popover,PopoverTrigger,PopoverContent} from "../ui/popover";
import {useWorkbench} from "../../hooks/use-workbench";
import {QuickAddDialog,type AddKind} from "../../features/inbox/quick-add-dialog";

export function AppTopbar({toggleSidebar}:{toggleSidebar:()=>void}){
 const [search,setSearch]=useState(false);const [add,setAdd]=useState<AddKind|null>(null);const router=useRouter();const {state}=useWorkbench();
 const activities=[...state.inbox.slice(0,3).map(item=>"新增灵感："+item.title),...state.content.slice(0,2).map(item=>"更新排期："+item.title)];
 useEffect(()=>{const listener=(e:KeyboardEvent)=>{if(e.key.toLowerCase()==="k"&&(e.ctrlKey||e.metaKey)){e.preventDefault();setSearch(x=>!x)}};window.addEventListener("keydown",listener);return()=>window.removeEventListener("keydown",listener)},[]);
 const groups=[{name:"情报库",route:"intelligence",items:state.intelligence.map(x=>({id:x.id,title:x.title,keywords:x.author+" "+x.url+" "+x.tags.join(" ")}))},{name:"灵感 Inbox",route:"inbox",items:state.inbox.map(x=>({id:x.id,title:x.title,keywords:x.note+" "+x.url}))},{name:"对手监控",route:"competitors",items:state.competitors.map(x=>({id:x.id,title:x.name,keywords:x.handle+" "+x.recentTopics.join(" ")}))},{name:"选题",route:"ideas",items:state.ideas.map(x=>({id:x.id,title:x.title,keywords:x.tags.join(" ")}))}];
 return <header className="topbar"><Button variant="ghost" size="icon" aria-label="折叠或展开侧边栏" onClick={toggleSidebar}><PanelLeft className="size-4"/></Button><button className="search" onClick={()=>setSearch(true)} aria-label="全局搜索"><Search size={17}/><span>搜索内容、作者、链接、选题或灵感...</span><kbd>⌘ K</kbd></button><div className="top-actions"><DropdownMenu><DropdownMenuTrigger asChild><button className="quick"><Plus size={17}/>快速添加<ChevronDown size={15}/></button></DropdownMenuTrigger><DropdownMenuContent align="end">{(["添加链接","记录灵感","添加对手","新建选题","新建内容"] as const).map(kind=><DropdownMenuItem key={kind} onSelect={()=>setAdd(kind)}>{kind}</DropdownMenuItem>)}</DropdownMenuContent></DropdownMenu><Popover><PopoverTrigger asChild><Button variant="ghost" size="icon" aria-label="查看通知"><Bell className="size-5"/></Button></PopoverTrigger><PopoverContent align="end"><h2 className="font-semibold">最近动态</h2>{activities.length?activities.map(x=><p key={x} className="border-b py-3 text-sm">{x}</p>):<p className="py-3 text-sm text-slate-500">暂无动态</p>}</PopoverContent></Popover><DropdownMenu><DropdownMenuTrigger asChild><button className="avatar" aria-label="工作区菜单">林</button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onSelect={()=>router.push("/settings")}>工作区设置</DropdownMenuItem></DropdownMenuContent></DropdownMenu></div>
 <CommandDialog open={search} onOpenChange={setSearch} title="全局搜索" description="搜索情报、灵感、对手或选题"><CommandInput placeholder="搜索标题、作者、链接或关键词..."/><CommandList><CommandEmpty>没有找到结果</CommandEmpty>{groups.map(group=><CommandGroup key={group.route} heading={group.name}>{group.items.map(item=><CommandItem key={item.id} value={group.route+" "+item.id+" "+item.title+" "+item.keywords} onSelect={()=>{setSearch(false);router.push(group.route==="ideas"?"/ideas/"+item.id:"/"+group.route+"?item="+item.id)}}>{item.title}</CommandItem>)}</CommandGroup>)}</CommandList></CommandDialog>
 <QuickAddDialog kind={add} onClose={()=>setAdd(null)}/></header>;
}
