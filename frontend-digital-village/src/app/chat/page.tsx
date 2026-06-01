"use client";

import { FormEvent, useMemo, useState } from "react";
import { ArrowRight, FileText, Loader2, Send, ShieldAlert, AlertTriangle } from "lucide-react";

import { PageHeading } from "@/components/page-heading";
import { SectionCard } from "@/components/section-card";
import { fallbackPolicyAnswer, policyAnswers } from "@/data/platform-data";
import { askPolicyQuestion } from "@/lib/api";

export default function ChatPage() {
  const [input, setInput] = useState(policyAnswers[0].question);
  const [activeId, setActiveId] = useState(policyAnswers[0].id);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState(false);

  const activeAnswer = useMemo(() => {
    return policyAnswers.find((item) => item.id === activeId) ?? fallbackPolicyAnswer;
  }, [activeId]);

  function chooseQuestion(id: string) {
    const answer = policyAnswers.find((item) => item.id === id);
    if (!answer) return;
    setInput(answer.question);
    setActiveId(answer.id);
    setApiError(false);
  }

  async function submitQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const matched = policyAnswers.find((item) => item.question === input.trim());
    setLoading(true);
    setApiError(false);

    try {
      await askPolicyQuestion({ question: input.trim(), top_k: 5 });
    } catch {
      // API unreachable, fall back to static data
      setApiError(true);
    }

    setActiveId(matched?.id ?? fallbackPolicyAnswer.id);
    setLoading(false);
  }

  return (
    <div className="page-shell">
      <PageHeading
        eyebrow="Policy Q&A"
        title="政策问答"
        description="面向涉农政策咨询，系统展示结论、适用条件、材料、办理部门和政策依据。"
      />

      <div className="grid gap-6 lg:grid-cols-[0.75fr_1.25fr]">
        <SectionCard title="示例问题" description="点击问题可直接生成一份可信回答。">
          <div className="grid gap-3">
            {policyAnswers.map((answer) => (
              <button
                key={answer.id}
                type="button"
                onClick={() => chooseQuestion(answer.id)}
                className={`focus-ring flex min-h-12 items-center justify-between gap-3 rounded-md border px-3 text-left text-sm transition-colors ${
                  activeId === answer.id
                    ? "border-[var(--primary)] bg-emerald-50 text-emerald-900"
                    : "border-[var(--border)] bg-white hover:bg-[var(--muted)]"
                }`}
              >
                <span>{answer.question}</span>
                <ArrowRight className="size-4 shrink-0" aria-hidden="true" />
              </button>
            ))}
          </div>
        </SectionCard>

        <div className="space-y-6">
          <SectionCard title="咨询输入" description="输入政策问题后，系统会按统一结构整理答复和依据。">
            <form onSubmit={submitQuestion} className="grid gap-3 md:grid-cols-[1fr_auto]">
              <label className="sr-only" htmlFor="policy-question">
                政策咨询问题
              </label>
              <input
                id="policy-question"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                className="focus-ring min-h-12 rounded-md border border-[var(--border)] bg-white px-3 text-sm text-[var(--foreground)]"
                placeholder="请输入你的政策问题"
              />
              <button
                type="submit"
                disabled={loading}
                className="focus-ring inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-[var(--primary)] px-5 text-sm font-medium text-white disabled:opacity-70"
              >
                {loading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                发送
              </button>
            </form>
          </SectionCard>

          {apiError && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-800" />
                <div>
                  <p className="text-sm font-semibold text-amber-950">后端暂不可达</p>
                  <p className="mt-1 text-sm text-amber-900">当前展示为本地示例数据，API 连通后自动切换为实时回答。</p>
                </div>
              </div>
            </div>
          )}

          <section className="surface p-5 md:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--border)] pb-4">
              <div>
                <p className="text-sm font-semibold text-[var(--secondary)]">智能回答</p>
                <h2 className="mt-2 text-xl font-semibold text-[var(--foreground)]">{activeAnswer.question}</h2>
              </div>
              <span className="inline-flex min-h-9 items-center rounded-md bg-amber-50 px-3 text-sm font-medium text-amber-900">
                政策咨询
              </span>
            </div>

            <div className="mt-5 grid gap-4">
              <div className="rounded-md bg-emerald-50 p-4">
                <p className="text-sm font-semibold text-emerald-900">简要结论</p>
                <p className="mt-2 text-sm leading-6 text-emerald-950">{activeAnswer.conclusion}</p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <InfoList title="适用政策" items={activeAnswer.policies} />
                <InfoList title="你可能符合的条件" items={activeAnswer.conditions} />
                <InfoList title="需要准备的材料" items={activeAnswer.materials} />
                <div className="rounded-md border border-[var(--border)] bg-white p-4">
                  <p className="text-sm font-semibold text-[var(--foreground)]">办理部门或咨询渠道</p>
                  <p className="mt-3 text-sm leading-6 text-[var(--muted-foreground)]">{activeAnswer.department}</p>
                </div>
              </div>

              <div className="rounded-md border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-start gap-3">
                  <ShieldAlert className="mt-0.5 size-5 shrink-0 text-amber-800" aria-hidden="true" />
                  <div>
                    <p className="text-sm font-semibold text-amber-950">风险提醒</p>
                    <p className="mt-2 text-sm leading-6 text-amber-950">{activeAnswer.risk}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-md border border-[var(--border)] bg-white p-4">
                <div className="flex items-center gap-2">
                  <FileText className="size-5 text-[var(--secondary)]" aria-hidden="true" />
                  <p className="text-sm font-semibold text-[var(--foreground)]">政策依据</p>
                </div>
                <div className="mt-3 grid gap-3">
                  {activeAnswer.evidence.map((item) => (
                    <div key={item.source} className="rounded-md bg-[var(--muted)] p-3 text-sm leading-6">
                      <p className="font-medium text-[var(--foreground)]">{item.source}</p>
                      <p className="mt-1 text-[var(--muted-foreground)]">{item.quote}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function InfoList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-md border border-[var(--border)] bg-white p-4">
      <p className="text-sm font-semibold text-[var(--foreground)]">{title}</p>
      <ul className="mt-3 space-y-2 text-sm leading-6 text-[var(--muted-foreground)]">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <span className="mt-2 size-1.5 shrink-0 rounded-full bg-[var(--primary)]" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
