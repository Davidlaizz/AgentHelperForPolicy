import type { Metadata } from "next";

import { AppNav } from "@/components/app-nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "数字乡村智能体平台",
  description: "面向农业农村和城乡社区的政策问答、智慧农业诊断与办事引导工作台。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>
        <AppNav />
        <main>{children}</main>
      </body>
    </html>
  );
}
