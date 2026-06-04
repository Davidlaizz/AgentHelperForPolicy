"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BellRing, FolderKanban, LayoutDashboard, Library, SearchCheck, ShieldCheck } from "lucide-react";

const navItems = [
  { href: "/", label: "工作台", icon: LayoutDashboard },
  { href: "/chat", label: "智能问答", icon: SearchCheck },
  { href: "/eligibility", label: "资格判断", icon: ShieldCheck },
  { href: "/cases", label: "事项中心", icon: FolderKanban },
  { href: "/policies", label: "政策库", icon: Library },
  { href: "/admin", label: "管理后台", icon: BellRing },
];

export function AppNav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between md:px-6">
        <Link href="/" className="flex min-w-0 items-center gap-4">
          <Image
            src="/zhicetong-mark.svg"
            alt="智策通 Logo"
            width={40}
            height={40}
            className="size-10 shrink-0 rounded-lg"
            priority
          />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">智策通</p>
            <p className="truncate text-xs text-muted-foreground">
              高校政策智能服务工作台
            </p>
          </div>
        </Link>
        <nav className="flex min-w-0 gap-1 overflow-x-auto pb-1 md:items-center md:overflow-visible md:pb-0">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`flex h-9 shrink-0 items-center gap-2 rounded-md px-3 text-sm transition-colors ${
                pathname === href
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon className="size-4" />
              <span>{label}</span>
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
