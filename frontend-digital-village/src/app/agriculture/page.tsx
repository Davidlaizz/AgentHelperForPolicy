"use client";

import Link from "next/link";
import { ArrowRight, BarChart3, CheckCircle2, ClipboardList, Lightbulb, Sprout } from "lucide-react";
import { useMemo, useState } from "react";

import { PageHeading } from "@/components/page-heading";
import { SectionCard } from "@/components/section-card";
import { agricultureScenarios } from "@/data/platform-data";

export default function AgriculturePage() {
  const [activeId, setActiveId] = useState(agricultureScenarios[0].id);
  const active = useMemo(
    () => agricultureScenarios.find((item) => item.id === activeId) ?? agricultureScenarios[0],
    [activeId],
  );

  return (
    <div className="page-shell">
      <PageHeading
        eyebrow="Smart Agriculture"
        title="智慧农业"
        description="把生产、销售、经营和治理问题拆解成痛点、数字化方向、落地步骤和可匹配政策。"
      />

      <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <SectionCard title="问题场景" description="选择一个基层问题，查看诊断结果和行动建议。">
          <div className="grid gap-3">
            {agricultureScenarios.map((scenario) => (
              <button
                key={scenario.id}
                type="button"
                onClick={() => setActiveId(scenario.id)}
                className={`focus-ring rounded-md border p-4 text-left transition-colors ${
                  activeId === scenario.id
                    ? "border-[var(--primary)] bg-emerald-50"
                    : "border-[var(--border)] bg-white hover:bg-[var(--muted)]"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold text-[var(--foreground)]">{scenario.title}</p>
                    <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">{scenario.question}</p>
                  </div>
                  <Sprout className="mt-1 size-5 shrink-0 text-[var(--primary)]" />
                </div>
              </button>
            ))}
          </div>
        </SectionCard>

        <section className="surface p-5 md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--border)] pb-4">
            <div>
              <p className="text-sm font-semibold text-[var(--secondary)]">问题诊断</p>
              <h2 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">{active.title}</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">{active.category}</p>
            </div>
            <Link
              href="/chat"
              className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-md bg-[var(--primary)] px-4 text-sm font-medium text-white"
            >
              关联政策问答
              <ArrowRight className="size-4" />
            </Link>
          </div>

          <div className="mt-5 grid gap-4">
            <InfoBlock icon={Lightbulb} title="核心痛点" items={active.painPoints} tone="amber" />
            <InfoBlock icon={CheckCircle2} title="涉及对象" items={active.actors} tone="green" />
            <InfoBlock icon={Sprout} title="数字化解决方向" items={active.directions} tone="blue" />
            <InfoBlock icon={ClipboardList} title="可匹配政策或资源" items={active.policyLinks} tone="green" />

            <div className="rounded-md border border-[var(--border)] bg-white p-4">
              <p className="text-sm font-semibold text-[var(--foreground)]">落地步骤</p>
              <ol className="mt-4 grid gap-3">
                {active.steps.map((step, index) => (
                  <li key={step} className="grid grid-cols-[32px_1fr] gap-3 text-sm leading-6 text-[var(--muted-foreground)]">
                    <span className="flex size-8 items-center justify-center rounded-md bg-[var(--muted)] font-semibold text-[var(--primary)]">
                      {index + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <InfoBlock icon={BarChart3} title="建议采集的数据" items={active.metrics} tone="blue" compact />
              <InfoBlock icon={Lightbulb} title="风险和前置条件" items={active.risks} tone="amber" compact />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function InfoBlock({
  icon: Icon,
  title,
  items,
  tone,
  compact = false,
}: {
  icon: typeof Lightbulb;
  title: string;
  items: string[];
  tone: "green" | "blue" | "amber";
  compact?: boolean;
}) {
  const toneClass = {
    green: "bg-emerald-50 text-emerald-900",
    blue: "bg-sky-50 text-sky-900",
    amber: "bg-amber-50 text-amber-950",
  };

  return (
    <div className="rounded-md border border-[var(--border)] bg-white p-4">
      <div className="flex items-center gap-2">
        <span className={`flex size-9 items-center justify-center rounded-md ${toneClass[tone]}`}>
          <Icon className="size-4" aria-hidden="true" />
        </span>
        <p className="text-sm font-semibold text-[var(--foreground)]">{title}</p>
      </div>
      <div className={`mt-3 flex flex-wrap gap-2 ${compact ? "" : "md:max-w-4xl"}`}>
        {items.map((item) => (
          <span key={item} className="rounded-md bg-[var(--muted)] px-2.5 py-1.5 text-sm text-[var(--foreground)]">
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
