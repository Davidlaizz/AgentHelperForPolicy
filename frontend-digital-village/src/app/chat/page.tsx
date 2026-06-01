"use client";

import { FormEvent, useState } from "react";
import { ArrowRight, FileText, Loader2, Send, ShieldAlert, AlertTriangle } from "lucide-react";

import { PageHeading } from "@/components/page-heading";
import { SectionCard } from "@/components/section-card";
import { featuredQuestions, fallbackPolicyAnswer, policyAnswers, type PolicyAnswer } from "@/data/platform-data";
import { askPolicyQuestion, type ChatResponse } from "@/lib/api";

const EXAMPLE_QUESTIONS = featuredQuestions;

interface DisplayAnswer {
  question: string;
  conclusion: string;
  policies: string[];
  conditions: string[];
  materials: string[];
  department: string;
  risk: string;
  evidence: Array<{ source: string; quote: string }>;
  isApiResponse: boolean;
}

function parseApiAnswer(response: ChatResponse, question: string): DisplayAnswer {
  const answer = response.answer || "";
  const basis = response.policy_basis || "";
  const inference = response.ai_inference || "";

  // Try to extract structured sections from the answer text
  const extract = (text: string, label: string): string => {
    const idx = text.indexOf(label);
    if (idx === -1) return "";
    const start = idx + label.length;
    const rest = text.slice(start);
    const nextLabels = ["简要结论", "适用政策", "可能符合", "需要准备", "办理部门", "咨询渠道", "风险提醒", "风险提示", "政策依据", "AI推断", "注意"];
    let end = rest.length;
    for (const nl of nextLabels) {
      const ni = rest.indexOf(nl);
      if (ni > 0 && ni < end) end = ni;
    }
    return rest.slice(0, end).replace(/^[：:\s]+/, "").trim();
  };

  const conclusion =
    extract(answer, "简要结论") ||
    extract(answer, "结论") ||
    (basis ? basis.slice(0, 300) : answer.slice(0, 300));

  const policiesRaw = extract(answer, "适用政策") || extract(answer, "相关政策");
  const conditionsRaw = extract(answer, "可能符合的条件") || extract(answer, "适用条件");
  const materialsRaw = extract(answer, "需要准备的材料") || extract(answer, "材料清单");
  const department = extract(answer, "办理部门") || extract(answer, "咨询渠道") || "请咨询当地主管部门";
  const risk = extract(answer, "风险提醒") || extract(answer, "风险提示") || "政策执行存在地区差异";

  const split = (raw: string): string[] => {
    if (!raw) return [];
    return raw.split(/[、,，\n]+/).map((s) => s.replace(/^[\d]+[.、]?\s*/, "").trim()).filter(Boolean);
  };

  const citations: Array<{ source: string; quote: string }> = response.citations?.length
    ? response.citations.map((c) => ({ source: c.document_title, quote: c.quote_text.slice(0, 300) }))
    : [{ source: "数字乡村政策知识库", quote: inference.slice(0, 200) || answer.slice(0, 200) }];

  return {
    question,
    conclusion: conclusion || "请查看完整回答",
    policies: split(policiesRaw).length ? split(policiesRaw) : ["参见完整回答"],
    conditions: split(conditionsRaw).length ? split(conditionsRaw) : ["参见完整回答"],
    materials: split(materialsRaw).length ? split(materialsRaw) : ["参见完整回答"],
    department,
    risk,
    evidence: citations,
    isApiResponse: true,
  };
}

function findStaticAnswer(question: string): PolicyAnswer {
  return policyAnswers.find((a) => a.question === question.trim()) ?? fallbackPolicyAnswer;
}

export default function ChatPage() {
  const [input, setInput] = useState(EXAMPLE_QUESTIONS[0]);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState(false);
  const [apiResult, setApiResult] = useState<DisplayAnswer | null>(null);

  const staticAnswer = findStaticAnswer(input);

  function chooseQuestion(question: string) {
    setInput(question);
    setApiResult(null);
    setApiError(false);
  }

  async function submitQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setApiError(false);
    setApiResult(null);

    const question = input.trim();

    try {
      const response = await askPolicyQuestion({ question, top_k: 5 });
      setApiResult(parseApiAnswer(response, question));
    } catch {
      setApiError(true);
    }
    setLoading(false);
  }

  const displayed = apiResult ?? staticAnswer;

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
            {EXAMPLE_QUESTIONS.map((question) => (
              <button
                key={question}
                type="button"
                onClick={() => chooseQuestion(question)}
                className={`focus-ring flex min-h-12 items-center justify-between gap-3 rounded-md border px-3 text-left text-sm transition-colors ${
                  input === question
                    ? "border-[var(--primary)] bg-emerald-50 text-emerald-900"
                    : "border-[var(--border)] bg-white hover:bg-[var(--muted)]"
                }`}
              >
                <span>{question}</span>
                <ArrowRight className="size-4 shrink-0" aria-hidden="true" />
              </button>
            ))}
          </div>
        </SectionCard>

        <div className="space-y-6">
          <SectionCard title="咨询输入" description="输入政策问题后，系统会按统一结构整理答复和依据。">
            <form onSubmit={submitQuestion} className="grid gap-3 md:grid-cols-[1fr_auto]">
              <label className="sr-only" htmlFor="policy-question">政策咨询问题</label>
              <input
                id="policy-question"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                className="focus-ring min-h-12 rounded-md border border-[var(--border)] bg-white px-3 text-sm text-[var(--foreground)]"
                placeholder="请输入你的政策问题"
              />
              <button type="submit" disabled={loading}
                className="focus-ring inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-[var(--primary)] px-5 text-sm font-medium text-white disabled:opacity-70">
                {loading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                发送
              </button>
            </form>
          </SectionCard>

          {loading && (
            <div className="surface flex flex-col items-center justify-center gap-3 py-16">
              <Loader2 className="size-8 animate-spin text-[var(--primary)]" />
              <p className="text-sm text-[var(--muted-foreground)]">智能体正在检索政策并生成回答...</p>
            </div>
          )}

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

          {!loading && (
            <section className="surface p-5 md:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--border)] pb-4">
                <div>
                  <p className="text-sm font-semibold text-[var(--secondary)]">
                    {apiResult?.isApiResponse ? "智能回答 (实时)" : "示例回答"}
                  </p>
                  <h2 className="mt-2 text-xl font-semibold text-[var(--foreground)]">
                    {"isApiResponse" in displayed && (displayed as DisplayAnswer).isApiResponse
                      ? displayed.question
                      : (displayed as PolicyAnswer).question}
                  </h2>
                </div>
                <span className="inline-flex min-h-9 items-center rounded-md bg-amber-50 px-3 text-sm font-medium text-amber-900">
                  政策咨询
                </span>
              </div>

              <div className="mt-5 grid gap-4">
                <div className="rounded-md bg-emerald-50 p-4">
                  <p className="text-sm font-semibold text-emerald-900">简要结论</p>
                  <p className="mt-2 text-sm leading-6 text-emerald-950">{displayed.conclusion}</p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <InfoList title="适用政策" items={displayed.policies} />
                  <InfoList title="你可能符合的条件" items={displayed.conditions} />
                  <InfoList title="需要准备的材料" items={displayed.materials} />
                  <div className="rounded-md border border-[var(--border)] bg-white p-4">
                    <p className="text-sm font-semibold text-[var(--foreground)]">办理部门或咨询渠道</p>
                    <p className="mt-3 text-sm leading-6 text-[var(--muted-foreground)]">{displayed.department}</p>
                  </div>
                </div>

                <div className="rounded-md border border-amber-200 bg-amber-50 p-4">
                  <div className="flex items-start gap-3">
                    <ShieldAlert className="mt-0.5 size-5 shrink-0 text-amber-800" aria-hidden="true" />
                    <div>
                      <p className="text-sm font-semibold text-amber-950">风险提醒</p>
                      <p className="mt-2 text-sm leading-6 text-amber-950">{displayed.risk}</p>
                    </div>
                  </div>
                </div>

                {"evidence" in displayed && displayed.evidence && displayed.evidence.length > 0 && (
                  <div className="rounded-md border border-[var(--border)] bg-white p-4">
                    <div className="flex items-center gap-2">
                      <FileText className="size-5 text-[var(--secondary)]" aria-hidden="true" />
                      <p className="text-sm font-semibold text-[var(--foreground)]">政策依据</p>
                    </div>
                    <div className="mt-3 grid gap-3">
                      {displayed.evidence.map((item, i) => (
                        <div key={i} className="rounded-md bg-[var(--muted)] p-3 text-sm leading-6">
                          <p className="font-medium text-[var(--foreground)]">{item.source}</p>
                          <p className="mt-1 text-[var(--muted-foreground)]">{item.quote}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}
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
