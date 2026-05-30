"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, CheckSquare, ClipboardCheck, FileCheck2, MapPin, Square } from "lucide-react";

import { PageHeading } from "@/components/page-heading";
import { SectionCard } from "@/components/section-card";
import { guideCases } from "@/data/platform-data";

export default function GuidePage() {
  const [activeId, setActiveId] = useState(guideCases[0].id);
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  const active = useMemo(() => guideCases.find((item) => item.id === activeId) ?? guideCases[0], [activeId]);
  const missing = active.materials.filter((item) => item.required && !checked[`${active.id}:${item.name}`]);

  function switchCase(id: string) {
    setActiveId(id);
  }

  function toggleMaterial(name: string) {
    const key = `${active.id}:${name}`;
    setChecked((current) => ({ ...current, [key]: !current[key] }));
  }

  return (
    <div className="page-shell">
      <PageHeading
        eyebrow="Service Guide"
        title="办事引导"
        description="把“我要办一件事”拆成主体条件、材料清单、办理步骤、部门路径和当前缺口。"
      />

      <div className="grid gap-6 lg:grid-cols-[0.78fr_1.22fr]">
        <SectionCard title="事项选择" description="切换不同办理事项，并勾选材料完成缺口检查。">
          <div className="grid gap-3">
            {guideCases.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => switchCase(item.id)}
                className={`focus-ring rounded-md border p-4 text-left transition-colors ${
                  active.id === item.id
                    ? "border-[var(--primary)] bg-emerald-50"
                    : "border-[var(--border)] bg-white hover:bg-[var(--muted)]"
                }`}
              >
                <p className="text-base font-semibold text-[var(--foreground)]">{item.title}</p>
                <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">{item.subject}</p>
              </button>
            ))}
          </div>
        </SectionCard>

        <section className="surface p-5 md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--border)] pb-4">
            <div>
              <p className="text-sm font-semibold text-[var(--secondary)]">办理事项</p>
              <h2 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">{active.title}</h2>
              <p className="mt-2 flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
                <MapPin className="size-4" aria-hidden="true" />
                {active.region}
              </p>
            </div>
            <span className="inline-flex min-h-9 items-center rounded-md bg-sky-50 px-3 text-sm font-medium text-sky-800">
              {active.stage}
            </span>
          </div>

          <div className="mt-5 grid gap-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-md border border-[var(--border)] bg-white p-4">
                <p className="text-sm font-semibold text-[var(--foreground)]">适用对象</p>
                <p className="mt-3 text-sm leading-6 text-[var(--muted-foreground)]">{active.subject}</p>
              </div>
              <div className="rounded-md border border-[var(--border)] bg-white p-4">
                <p className="text-sm font-semibold text-[var(--foreground)]">咨询或办理部门</p>
                <p className="mt-3 text-sm leading-6 text-[var(--muted-foreground)]">{active.department}</p>
              </div>
            </div>

            <div className="rounded-md border border-[var(--border)] bg-white p-4">
              <div className="flex items-center gap-2">
                <FileCheck2 className="size-5 text-[var(--primary)]" aria-hidden="true" />
                <p className="text-sm font-semibold text-[var(--foreground)]">材料清单</p>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {active.materials.map((material) => {
                  const key = `${active.id}:${material.name}`;
                  const selected = Boolean(checked[key]);
                  return (
                    <button
                      key={material.name}
                      type="button"
                      onClick={() => toggleMaterial(material.name)}
                      className={`focus-ring flex min-h-12 items-center gap-3 rounded-md border px-3 text-left text-sm transition-colors ${
                        selected
                          ? "border-emerald-200 bg-emerald-50 text-emerald-950"
                          : "border-[var(--border)] bg-[var(--muted)] text-[var(--foreground)]"
                      }`}
                    >
                      {selected ? <CheckSquare className="size-5 shrink-0" /> : <Square className="size-5 shrink-0" />}
                      <span className="min-w-0 flex-1">{material.name}</span>
                      <span className="shrink-0 rounded-md bg-white px-2 py-1 text-xs">
                        {material.required ? "必备" : "建议"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-md border border-[var(--border)] bg-white p-4">
              <div className="flex items-center gap-2">
                <ClipboardCheck className="size-5 text-[var(--secondary)]" aria-hidden="true" />
                <p className="text-sm font-semibold text-[var(--foreground)]">办理步骤</p>
              </div>
              <ol className="mt-4 grid gap-3">
                {active.steps.map((step, index) => (
                  <li key={step} className="grid grid-cols-[34px_1fr] gap-3 text-sm leading-6 text-[var(--muted-foreground)]">
                    <span className="flex size-8 items-center justify-center rounded-md bg-sky-50 font-semibold text-sky-800">
                      {index + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-md border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-semibold text-amber-950">当前缺口</p>
                {missing.length ? (
                  <ul className="mt-3 space-y-2 text-sm leading-6 text-amber-950">
                    {missing.map((item) => (
                      <li key={item.name}>还缺：{item.name}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-sm leading-6 text-amber-950">必备材料已全部勾选，建议进入人工复核。</p>
                )}
              </div>
              <div className="rounded-md border border-rose-200 bg-rose-50 p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 size-5 shrink-0 text-rose-800" aria-hidden="true" />
                  <div>
                    <p className="text-sm font-semibold text-rose-950">注意事项</p>
                    <p className="mt-2 text-sm leading-6 text-rose-950">{active.risk}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {active.tips.map((tip) => (
                <span key={tip} className="rounded-md bg-[var(--muted)] px-3 py-2 text-sm text-[var(--foreground)]">
                  {tip}
                </span>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
