"use client";
import {useState,type ReactNode} from "react";
import {WorkbenchProvider} from "../../hooks/use-workbench";
import {AppSidebar} from "./app-sidebar";
import {AppTopbar} from "./app-topbar";
import {Toaster} from "../ui/sonner";
export function AppShell({children}:{children:ReactNode}){const [collapsed,setCollapsed]=useState(false);return <WorkbenchProvider><div className={collapsed?"shell is-collapsed":"shell"}><AppSidebar collapsed={collapsed}/><main className="main"><AppTopbar toggleSidebar={()=>setCollapsed(x=>!x)}/><div className="content thin-scroll">{children}</div></main></div><Toaster richColors/></WorkbenchProvider>}
