import Link from "next/link";
import { ArrowRight, ClipboardList, MessageSquareText, Sprout } from "lucide-react";

import { PageHeading } from "@/components/page-heading";
import { SectionCard } from "@/components/section-card";
import { caseItems } from "@/data/platform-data";

function routeHref(route: string) {
  if (route === "智慧农业") return "/agriculture";
  if (route === "办事引导") return "/guide";
  if (route === "管理后台") return "/admin";
  return "/chat";
}

function RouteIcon({ route }: { route: string }) {
  if (route === "智慧农业") return <Sprout className="size-4" aria-hidden="true" />;
  if (route === "办事引导") return <ClipboardList className="size-4" aria-hidden="true" />;
  return <MessageSquareText className="size-4" aria-hidden="true" />;
}

export default function CasesPage() {
  return (
    <div className="page-shell">
      <PageHeading
        eyebrow="Service Center"
        title="事项中心"
        description="把数字乡村常见事项组织成清晰的业务入口，帮助用户从场景进入三大核心模块。"
      />

      <SectionCard title="数字乡村事项地图" description="每个事项都包含适用对象、常见问题、材料线索和推荐进入模块。">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {caseItems.map((item) => (
            <article key={item.title} className="surface p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-[var(--foreground)]">{item.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">{item.target}</p>
                </div>
                <span className="inline-flex min-h-8 shrink-0 items-center rounded-md bg-[var(--muted)] px-2 text-xs text-[var(--foreground)]">
                  {item.route}
                </span>
              </div>
              <div className="mt-4 space-y-3 text-sm leading-6">
                <div>
                  <p className="font-medium text-[var(--foreground)]">常见问题</p>
                  <p className="text-[var(--muted-foreground)]">{item.question}</p>
                </div>
                <div>
                  <p className="font-medium text-[var(--foreground)]">需要材料</p>
                  <p className="text-[var(--muted-foreground)]">{item.materials}</p>
                </div>
              </div>
              <Link
                href={routeHref(item.route)}
                className="focus-ring mt-4 inline-flex min-h-11 w-full items-center justify-between rounded-md bg-[var(--primary)] px-3 text-sm font-medium text-white"
              >
                <span className="inline-flex items-center gap-2">
                  <RouteIcon route={item.route} />
                  进入{item.route}
                </span>
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </article>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
