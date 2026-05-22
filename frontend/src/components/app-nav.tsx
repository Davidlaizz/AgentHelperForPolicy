import Link from "next/link";
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
  return (
    <header className="border-b border-border bg-background">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-6 px-6 py-4">
        <div className="flex min-w-0 items-center gap-4">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            智
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">智策通</p>
            <p className="truncate text-xs text-muted-foreground">
              高校政策智能服务工作台
            </p>
          </div>
        </div>
        <nav className="hidden items-center gap-2 md:flex">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex h-9 items-center gap-2 rounded-md px-3 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
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

