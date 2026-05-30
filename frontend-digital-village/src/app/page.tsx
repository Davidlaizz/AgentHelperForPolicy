import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  Bot,
  ClipboardList,
  Database,
  FileSearch,
  MapPinned,
  MessageSquareText,
  Route,
  ShieldCheck,
  Sprout,
} from "lucide-react";

import { ModuleCard } from "@/components/module-card";
import { SectionCard } from "@/components/section-card";
import { StatCard } from "@/components/stat-card";
import { dashboardMetrics, featuredQuestions } from "@/data/platform-data";

const moduleCards = [
  {
    href: "/chat",
    title: "政策问答",
    description: "把农业补贴、返乡创业、农村电商等政策解释成基层能理解的答案。",
    icon: MessageSquareText,
    tone: "green" as const,
    points: ["政策依据", "条件初判", "材料提醒"],
  },
  {
    href: "/agriculture",
    title: "智慧农业",
    description: "把生产、销售、经营和治理问题转成数字化诊断与落地方案。",
    icon: Sprout,
    tone: "blue" as const,
    points: ["问题诊断", "方案建议", "指标设计"],
  },
  {
    href: "/guide",
    title: "办事引导",
    description: "把我要办一件事拆成材料清单、办理步骤、部门路径和风险提示。",
    icon: ClipboardList,
    tone: "amber" as const,
    points: ["材料清单", "流程步骤", "缺口检查"],
  },
];

const flow = [
  { title: "政策资料", desc: "文件、通知、办事指南统一沉淀", icon: BookOpenCheck },
  { title: "智能检索", desc: "按地区、主体、事项定位依据", icon: FileSearch },
  { title: "Agent 诊断", desc: "识别场景、条件、材料和风险", icon: Bot },
  { title: "方案生成", desc: "输出问答、农业方案和办理路径", icon: Route },
  { title: "运营沉淀", desc: "形成高频问题和项目线索", icon: BarChart3 },
];

export default function Home() {
  return (
    <div className="page-shell">
      <section className="grid gap-6 lg:grid-cols-[1.45fr_0.85fr]">
        <div className="surface p-6 md:p-7">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex min-h-9 items-center rounded-md bg-emerald-50 px-3 text-sm font-medium text-emerald-800">
              数字乡村服务中台
            </span>
            <span className="inline-flex min-h-9 items-center gap-2 rounded-md bg-sky-50 px-3 text-sm font-medium text-sky-800">
              <MapPinned className="size-4" aria-hidden="true" />
              面向农业农村和城乡社区
            </span>
          </div>

          <div className="mt-6 max-w-4xl">
            <h1 className="text-balance text-3xl font-semibold leading-tight text-[var(--foreground)] md:text-5xl">
              数字乡村智能体平台
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--muted-foreground)]">
              围绕政策问答、智慧农业、办事引导三大模块，把基层用户的问题转化为政策解释、数字化方案、材料清单和办理路径。
            </p>
          </div>

          <div className="mt-7 grid gap-4 md:grid-cols-3">
            {moduleCards.map((item) => (
              <ModuleCard key={item.href} {...item} />
            ))}
          </div>
        </div>

        <SectionCard
          eyebrow="Featured Questions"
          title="高频服务入口"
          description="点击问题即可进入对应模块，快速获得政策解释、农业方案或办理路径。"
        >
          <div className="grid gap-3">
            {featuredQuestions.map((question, index) => {
              const href = index === 1 ? "/agriculture" : index === 2 ? "/guide" : `/chat?question=${encodeURIComponent(question)}`;
              return (
                <Link
                  key={question}
                  href={href}
                  className="focus-ring flex min-h-12 items-center justify-between gap-3 rounded-md border border-[var(--border)] bg-white px-3 text-sm transition-colors hover:bg-[var(--muted)]"
                >
                  <span>{question}</span>
                  <ArrowRight className="size-4 shrink-0 text-[var(--muted-foreground)]" />
                </Link>
              );
            })}
          </div>
        </SectionCard>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {dashboardMetrics.map((metric, index) => (
          <StatCard
            key={metric.label}
            label={metric.label}
            value={metric.value}
            note={metric.note}
            tone={metric.tone}
            icon={[MessageSquareText, ClipboardList, ShieldCheck, Database][index]}
          />
        ))}
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
        <SectionCard title="智能体服务闭环" description="从资料沉淀、智能检索到方案生成和运营分析，形成可追踪的服务闭环。">
          <div className="grid gap-3 md:grid-cols-5">
            {flow.map(({ title, desc, icon: Icon }, index) => (
              <div key={title} className="soft-surface p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex size-10 items-center justify-center rounded-md bg-[var(--muted)]">
                    <Icon className="size-5 text-[var(--primary)]" aria-hidden="true" />
                  </div>
                  <span className="text-sm font-semibold text-[var(--muted-foreground)]">0{index + 1}</span>
                </div>
                <h3 className="mt-4 text-base font-semibold text-[var(--foreground)]">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">{desc}</p>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="可信输出标准" description="每个模块都要给出依据、边界和下一步。">
          <div className="space-y-3">
            {["政策依据可追溯", "AI 推断有边界", "办理材料可勾选", "高风险事项有提醒"].map((item) => (
              <div key={item} className="flex min-h-12 items-center gap-3 rounded-md bg-[var(--muted)] px-3 text-sm">
                <ShieldCheck className="size-4 text-[var(--primary)]" aria-hidden="true" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </SectionCard>
      </section>
    </div>
  );
}
