import "./globals.css";
import "./app.css";
import {Suspense} from "react";
import {AppShell} from "../src/components/layout/app-shell";
import type { Metadata } from "next";
export const metadata: Metadata = { title:"Content Intelligence Workbench", description:"A calm operating system for better content decisions." };
export default function RootLayout({children}:{children:React.ReactNode}) { return <html lang="zh-CN"><body><AppShell><Suspense fallback={<p role="status">正在加载…</p>}>{children}</Suspense></AppShell></body></html>; }
