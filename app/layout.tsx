import "./globals.css";
import type { Metadata } from "next";
export const metadata: Metadata = { title:"Content Intelligence Workbench", description:"A calm operating system for better content decisions." };
export default function RootLayout({children}:{children:React.ReactNode}) { return <html lang="zh-CN"><body>{children}</body></html>; }
