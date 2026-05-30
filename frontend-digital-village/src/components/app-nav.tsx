"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BookOpenCheck,
  ClipboardList,
  Home,
  Leaf,
  Menu,
  MessageSquareText,
  Sprout,
  X,
} from "lucide-react";
import { useState } from "react";

const navItems = [
  { href: "/", label: "工作台", icon: Home },
  { href: "/chat", label: "政策问答", icon: MessageSquareText },
  { href: "/agriculture", label: "智慧农业", icon: Sprout },
  { href: "/guide", label: "办事引导", icon: ClipboardList },
  { href: "/cases", label: "事项中心", icon: Leaf },
  { href: "/policies", label: "政策库", icon: BookOpenCheck },
  { href: "/admin", label: "管理后台", icon: BarChart3 },
];

function isActive(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }
  return pathname.startsWith(href);
}

export function AppNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-white/92 backdrop-blur">
      <div className="mx-auto flex min-h-16 w-full max-w-7xl items-center justify-between gap-3 px-4 md:px-6">
        <Link href="/" className="focus-ring flex min-h-11 items-center gap-3 rounded-md">
          <div className="flex size-10 items-center justify-center rounded-md bg-[var(--primary)] text-white">
            <Leaf className="size-5" aria-hidden="true" />
          </div>
          <div className="leading-tight">
            <p className="text-base font-semibold text-[var(--foreground)]">数字乡村智能体平台</p>
            <p className="hidden text-xs text-[var(--muted-foreground)] sm:block">政策问答 · 智慧农业 · 办事引导</p>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="主导航">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                className={`focus-ring inline-flex min-h-11 items-center gap-2 rounded-md px-3 text-sm font-medium transition-colors ${
                  active
                    ? "bg-[var(--primary)] text-white"
                    : "text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
                }`}
              >
                <Icon className="size-4" aria-hidden="true" />
                {label}
              </Link>
            );
          })}
        </nav>

        <button
          type="button"
          className="focus-ring inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-[var(--border)] text-[var(--foreground)] lg:hidden"
          aria-label={open ? "关闭导航菜单" : "打开导航菜单"}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {open ? (
        <nav className="border-t border-[var(--border)] bg-white px-4 py-3 lg:hidden" aria-label="移动端导航">
          <div className="grid gap-2 sm:grid-cols-2">
            {navItems.map(({ href, label, icon: Icon }) => {
              const active = isActive(pathname, href);
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  className={`focus-ring flex min-h-11 items-center gap-2 rounded-md px-3 text-sm font-medium ${
                    active
                      ? "bg-[var(--primary)] text-white"
                      : "bg-[var(--muted)] text-[var(--foreground)]"
                  }`}
                >
                  <Icon className="size-4" aria-hidden="true" />
                  {label}
                </Link>
              );
            })}
          </div>
        </nav>
      ) : null}
    </header>
  );
}
