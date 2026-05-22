import type { Metadata } from "next";

import { AppNav } from "@/components/app-nav";

import "./globals.css";

export const metadata: Metadata = {
  title: "智策通 V1.0",
  description: "高校政策智能服务工作台",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      className="h-full antialiased"
    >
      <body className="flex min-h-full flex-col bg-muted/30">
        <AppNav />
        {children}
      </body>
    </html>
  );
}
