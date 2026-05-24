"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bot, FileText, Loader2, MessageSquareText, Send, UserRound } from "lucide-react";

import { SectionCard } from "@/components/section-card";
import { MarkdownText } from "@/components/markdown-text";
import { Button } from "@/components/ui/button";

type Citation = {
  citation_id: string | null;
  document_id: string;
  chunk_id: string | null;
  attachment_id: string | null;
  document_title: string;
  file_name: string;
  attachment_title: string | null;
  page_no: number | null;
  article_no: string | null;
  quote_text: string;
  final_score: number;
};

type ChatResponse = {
  session_id: string;
  question: string;
  answer: string;
  policy_basis: string;
  ai_inference: string;
  citations: Citation[];
  agent?: AgentResponse | null;
};

type AgentSlotStatus = {
  key: string;
  name: string;
  value: string | number | boolean | Record<string, unknown> | unknown[] | null;
  status: string;
  question: string | null;
  required: boolean;
};

type EvidenceSummary = {
  retrieved_count?: number;
  document_titles?: string[];
  attachment_titles?: string[];
  policy_levels?: Record<string, number>;
  school_level_titles?: string[];
  college_level_titles?: string[];
  annual_notice_titles?: string[];
  expired_titles?: string[];
  missing_effective_date_titles?: string[];
  attachment_only?: boolean;
};

type AgentResponse = {
  intent: string;
  case: {
    case_id: string | null;
    case_type: string;
    case_title: string;
    status: string;
    slots: AgentSlotStatus[];
  } | null;
  missing_slots: AgentSlotStatus[];
  follow_up_questions: string[];
  eligibility: {
    result_status: string;
    matched_conditions: string[];
    unmet_conditions: string[];
    pending_conditions: string[];
    result_summary: string;
  } | null;
  material_list: string[];
  workflow_steps: string[];
  risk: {
    risk_level: string;
    warnings: string[];
  };
  evidence_summary?: EvidenceSummary;
  memory_updates: string[];
};

type ChatTurn = {
  id: string;
  question: string;
  response?: ChatResponse;
  error?: string;
};

const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";

const starterQuestions = [
  "校外做毕业论文需要什么申请表？",
  "毕业论文盲审不通过怎么办？",
  "大类专业分流系统在哪里进入？",
];

const inferenceFallbackTexts = new Set(["", "无", "无。", "暂无 AI 推断。", "未生成额外推断。"]);

export default function ChatPage() {
  const [question, setQuestion] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [loading, setLoading] = useState(false);
  const autoAsked = useRef(false);

  const canSubmit = useMemo(() => question.trim().length > 0 && !loading, [question, loading]);

  const ask = useCallback(async (nextQuestion: string) => {
    const trimmed = nextQuestion.trim();
    if (!trimmed) {
      return;
    }

    const turnId = crypto.randomUUID();
    setTurns((current) => [...current, { id: turnId, question: trimmed }]);
    setQuestion("");
    setLoading(true);

    try {
      const response = await fetch(`${apiBaseUrl}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: trimmed,
          session_id: sessionId,
          top_k: 5,
          include_expired: true,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.detail ?? "问答请求失败");
      }
      setSessionId(payload.session_id);
      setTurns((current) =>
        current.map((turn) =>
          turn.id === turnId ? { ...turn, response: payload } : turn,
        ),
      );
    } catch (error) {
      setTurns((current) =>
        current.map((turn) =>
          turn.id === turnId
            ? { ...turn, error: error instanceof Error ? error.message : "问答请求失败" }
            : turn,
        ),
      );
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (canSubmit) {
      void ask(question);
    }
  }

  useEffect(() => {
    if (autoAsked.current) {
      return;
    }
    const params = new URLSearchParams(window.location.search);
    const initialQuestion = params.get("question");
    if (initialQuestion) {
      autoAsked.current = true;
      void ask(initialQuestion);
    }
  }, [ask]);

  return (
    <div className="mx-auto grid w-full max-w-7xl flex-1 gap-6 px-4 py-6 lg:grid-cols-[280px_1fr] lg:px-6">
      <aside className="space-y-4">
        <SectionCard title="会话脉络" description="保留本轮咨询问题，便于演示连续追问。">
          <div className="space-y-2">
            {turns.length === 0 ? (
              <p className="text-sm leading-6 text-muted-foreground">还没有开始咨询。</p>
            ) : null}
            {turns.map((turn, index) => (
              <div key={turn.id} className="rounded-md border border-border bg-background p-3">
                <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
                  <MessageSquareText className="size-3.5" />
                  <span>第 {index + 1} 轮</span>
                </div>
                <p className="line-clamp-3 text-sm leading-6 text-foreground">{turn.question}</p>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="演示脚本" description="点击问题即可开始稳定链路。">
          <div className="space-y-2">
            {starterQuestions.map((item) => (
              <Button
                key={item}
                type="button"
                variant="outline"
                size="sm"
                disabled={loading}
                className="w-full justify-start whitespace-normal text-left"
                onClick={() => ask(item)}
              >
                {item}
              </Button>
            ))}
          </div>
        </SectionCard>
      </aside>

      <main className="flex min-w-0 flex-col gap-6">
      <SectionCard
        title="智能问答"
        description="基于政策知识库回答问题，并展示政策依据、AI 推断和引用出处。"
      >
        <p className="text-sm leading-6 text-muted-foreground">
          适合自由问政策，也适合进入多轮资格判断。回答会带出处、Agent 状态和风险提示。
        </p>
      </SectionCard>

      <section className="flex min-h-[520px] flex-col rounded-lg border border-border bg-card">
        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          {turns.length === 0 ? (
            <div className="flex h-full min-h-[360px] items-center justify-center rounded-lg border border-dashed border-border bg-background text-sm text-muted-foreground">
              选择一个示例问题，或输入你想咨询的政策事项。
            </div>
          ) : null}

          {turns.map((turn) => (
            <div key={turn.id} className="space-y-3">
              <div className="flex justify-end">
                <div className="max-w-[78%] rounded-lg bg-primary px-4 py-3 text-sm text-primary-foreground">
                  <div className="mb-1 flex items-center justify-end gap-2 text-xs opacity-80">
                    <UserRound className="size-3.5" />
                    <span>用户</span>
                  </div>
                  {turn.question}
                </div>
              </div>

              <div className="flex justify-start">
                <div className="max-w-[86%] rounded-lg border border-border bg-background px-4 py-3 text-sm">
                  <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
                    <Bot className="size-3.5" />
                    <span>智策通</span>
                  </div>

                  {turn.response ? (
                    <AnswerContent response={turn.response} />
                  ) : turn.error ? (
                    <p className="text-destructive">{turn.error}</p>
                  ) : (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="size-4 animate-spin" />
                      <span>正在检索政策并生成回答</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="border-t border-border p-4">
          <div className="flex gap-3">
            <input
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="请输入政策问题，例如：校外做毕业论文需要什么申请表？"
              className="h-10 flex-1 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            />
            <Button type="submit" disabled={!canSubmit} size="lg">
              {loading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              发送
            </Button>
          </div>
        </form>
      </section>
      </main>
    </div>
  );
}

function AnswerContent({ response }: { response: ChatResponse }) {
  const { policyBasis, aiInference, hasAiInference } = splitDisplaySections(response);

  return (
    <div className="space-y-4">
      <div className={hasAiInference ? "grid gap-3 xl:grid-cols-[1.15fr_0.85fr]" : "grid gap-3"}>
        <div className="rounded-lg border border-border bg-muted/30 p-4">
          <h3 className="mb-2 text-sm font-semibold text-foreground">政策依据</h3>
          <MarkdownText text={policyBasis} emptyText="暂无政策依据。" />
        </div>
        {hasAiInference ? (
          <div className="rounded-lg border border-border bg-blue-50/40 p-4">
            <h3 className="mb-2 text-sm font-semibold text-foreground">AI 推断</h3>
            <MarkdownText text={aiInference} emptyText="暂无 AI 推断。" />
          </div>
        ) : null}
      </div>

      {response.agent ? <AgentPanel agent={response.agent} /> : null}

      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-foreground">引用出处</h3>
        <div className="grid gap-2">
          {response.citations.map((citation) => (
            <details
              key={citation.citation_id ?? citation.chunk_id}
              className="rounded-lg border border-border bg-card p-3"
            >
              <summary className="flex cursor-pointer list-none items-start gap-2 text-sm">
                <FileText className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-foreground">
                    {citation.document_title}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {citation.page_no ? `第 ${citation.page_no} 页` : "无页码"}
                    {citation.article_no ? ` · ${citation.article_no}` : ""}
                    {` · 分数 ${citation.final_score.toFixed(3)}`}
                  </span>
                </span>
              </summary>
              <p className="mt-3 whitespace-pre-wrap text-xs leading-5 text-muted-foreground">
                {citation.quote_text}
              </p>
            </details>
          ))}
        </div>
      </div>
    </div>
  );
}

function splitDisplaySections(response: ChatResponse) {
  const fallbackInference = response.ai_inference.trim();
  const embeddedInferenceMatch = response.policy_basis.match(
    /(?:^|\n)\s*(?:#{1,6}\s*)?(?:[-*]\s*)?(?:\*\*)?\s*(?:\d+[.、]\s*)?(?:AI\s*推断|AI推断|目前不确定点|不确定点)\s*(?:\*\*)?\s*(?:[：:]|$)/i,
  );

  if (embeddedInferenceMatch?.index !== undefined) {
    const headingStart = embeddedInferenceMatch.index;
    const headingEnd = headingStart + embeddedInferenceMatch[0].length;
    const policyBasis = stripLeadingDisplayHeading(response.policy_basis.slice(0, headingStart));
    const embeddedInference = stripLeadingDisplayHeading(response.policy_basis.slice(headingEnd));
    const aiInference = isMeaningfulInference(embeddedInference) ? embeddedInference : fallbackInference;
    return {
      policyBasis,
      aiInference,
      hasAiInference: isMeaningfulInference(aiInference),
    };
  }

  return {
    policyBasis: stripLeadingDisplayHeading(response.policy_basis),
    aiInference: fallbackInference,
    hasAiInference: isMeaningfulInference(fallbackInference),
  };
}

function stripLeadingDisplayHeading(text: string) {
  return text
    .trim()
    .replace(
      /^(?:#{1,6}\s*)?(?:[-*]\s*)?(?:\*\*)?\s*(?:\d+[.、]\s*)?(?:政策依据|AI\s*推断|AI推断|目前不确定点|不确定点)\s*(?:\*\*)?\s*[：:]?\s*/i,
      "",
    )
    .trim();
}

function isMeaningfulInference(text: string) {
  return !inferenceFallbackTexts.has(text.trim());
}

function AgentPanel({ agent }: { agent: AgentResponse }) {
  const knownSlots = agent.case?.slots.filter((slot) => slot.status === "known") ?? [];
  const evidence = agent.evidence_summary ?? {};
  const evidenceGroups = [
    { label: "校级政策", items: evidence.school_level_titles ?? [] },
    { label: "学院细则", items: evidence.college_level_titles ?? [] },
    { label: "年度通知", items: evidence.annual_notice_titles ?? [] },
    { label: "附件材料", items: evidence.attachment_titles ?? [] },
    { label: "缺少有效期", items: evidence.missing_effective_date_titles ?? [] },
    { label: "可能过期", items: evidence.expired_titles ?? [] },
  ].filter((group) => group.items.length > 0);
  const policyLevelText = Object.entries(evidence.policy_levels ?? {})
    .map(([level, count]) => `${level} ${count}`)
    .join(" / ");

  return (
    <div className="rounded-lg border border-border bg-muted/20 p-3">
      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span className="rounded-md bg-background px-2 py-1">意图：{agent.intent}</span>
        {agent.case ? (
          <span className="rounded-md bg-background px-2 py-1">事项：{agent.case.case_title}</span>
        ) : null}
        <span className="rounded-md bg-background px-2 py-1">风险：{agent.risk.risk_level}</span>
        {typeof evidence.retrieved_count === "number" ? (
          <span className="rounded-md bg-background px-2 py-1">
            证据：{evidence.retrieved_count} 段
          </span>
        ) : null}
      </div>

      {agent.follow_up_questions.length > 0 ? (
        <div className="mb-3">
          <h3 className="mb-2 text-sm font-semibold text-foreground">需要追问</h3>
          <ul className="space-y-1 text-sm leading-6 text-foreground">
            {agent.follow_up_questions.map((item) => (
              <li key={item}>- {item}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {agent.eligibility ? (
        <div className="mb-3">
          <h3 className="mb-2 text-sm font-semibold text-foreground">资格判断</h3>
          <p className="text-sm leading-6 text-foreground">{agent.eligibility.result_summary}</p>
        </div>
      ) : null}

      {agent.risk.warnings.length > 0 ? (
        <div className="mb-3">
          <h3 className="mb-2 text-sm font-semibold text-foreground">风险提示</h3>
          <ul className="space-y-1 text-sm leading-6 text-foreground">
            {agent.risk.warnings.map((item) => (
              <li key={item}>- {item}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {evidenceGroups.length > 0 || policyLevelText ? (
        <details className="mb-3">
          <summary className="cursor-pointer text-sm font-semibold text-foreground">证据分层</summary>
          <div className="mt-2 space-y-2 text-xs leading-5 text-muted-foreground">
            {policyLevelText ? <p>层级分布：{policyLevelText}</p> : null}
            {evidenceGroups.map((group) => (
              <div key={group.label}>
                <p className="font-medium text-foreground">{group.label}</p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {group.items.map((item) => (
                    <span key={`${group.label}-${item}`} className="rounded-md bg-background px-2 py-1">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            ))}
            {evidence.attachment_only ? <p>当前检索结果主要来自附件材料。</p> : null}
          </div>
        </details>
      ) : null}

      {knownSlots.length > 0 ? (
        <details className="mb-3">
          <summary className="cursor-pointer text-sm font-semibold text-foreground">已记住条件</summary>
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
            {knownSlots.map((slot) => (
              <span key={slot.key} className="rounded-md bg-background px-2 py-1">
                {slot.name}：{formatSlotValue(slot.value)}
              </span>
            ))}
          </div>
        </details>
      ) : null}

      {agent.material_list.length > 0 ? (
        <details className="mb-3">
          <summary className="cursor-pointer text-sm font-semibold text-foreground">材料线索</summary>
          <ul className="mt-2 space-y-1 text-xs leading-5 text-muted-foreground">
            {agent.material_list.map((item) => (
              <li key={item}>- {item}</li>
            ))}
          </ul>
        </details>
      ) : null}

      {agent.workflow_steps.length > 0 ? (
        <details>
          <summary className="cursor-pointer text-sm font-semibold text-foreground">流程线索</summary>
          <ul className="mt-2 space-y-1 text-xs leading-5 text-muted-foreground">
            {agent.workflow_steps.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}

function formatSlotValue(value: AgentSlotStatus["value"]) {
  if (value === null || value === undefined) {
    return "未填写";
  }
  if (typeof value === "boolean") {
    return value ? "是" : "否";
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
}
