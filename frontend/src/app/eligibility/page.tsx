"use client";

import { FormEvent, useState } from "react";
import type { ReactNode } from "react";
import {
  CheckCircle2,
  ClipboardList,
  Loader2,
  MessageSquarePlus,
  Route,
  ShieldCheck,
} from "lucide-react";

import { SectionCard } from "@/components/section-card";
import { Button } from "@/components/ui/button";

type AgentSlot = {
  key: string;
  name: string;
  value: string | number | boolean | Record<string, unknown> | unknown[] | null;
  status: string;
  question: string | null;
};

type AgentResponse = {
  intent: string;
  case: {
    case_id: string | null;
    case_type: string;
    case_title: string;
    status: string;
    slots: AgentSlot[];
  } | null;
  missing_slots: AgentSlot[];
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
};

type ChatResponse = {
  session_id: string;
  policy_basis: string;
  ai_inference: string;
  agent: AgentResponse | null;
};

const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";

const presets = [
  "我能转专业吗？",
  "我是大一，绩点 3.6，无挂科，无处分，想转入计算机专业，今年申请",
  "转专业需要准备哪些材料？",
];

export default function EligibilityPage() {
  const [question, setQuestion] = useState(presets[0]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [responses, setResponses] = useState<ChatResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const current = responses.at(-1);
  const agent = current?.agent;

  async function ask(nextQuestion: string) {
    setLoading(true);
    try {
      const response = await fetch(`${apiBaseUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: nextQuestion,
          session_id: sessionId,
          top_k: 5,
          include_expired: true,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.detail ?? "资格判断请求失败");
      }
      setSessionId(payload.session_id);
      setResponses((currentResponses) => [...currentResponses, payload]);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = question.trim();
    if (trimmed) {
      void ask(trimmed);
    }
  }

  const knownSlots = agent?.case?.slots.filter((slot) => slot.status === "known") ?? [];

  return (
    <div className="mx-auto grid w-full max-w-7xl flex-1 gap-6 px-4 py-6 lg:grid-cols-[360px_1fr] lg:px-6">
      <aside className="space-y-4">
        <SectionCard title="资格判断" description="用 Agent 追问补齐条件，再给出可复核的初步判断。">
          <form onSubmit={handleSubmit} className="space-y-3">
            <textarea
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              rows={4}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
            <Button type="submit" disabled={loading || !question.trim()} className="w-full">
              {loading ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
              开始判断
            </Button>
          </form>
        </SectionCard>

        <SectionCard title="演示步骤" description="按顺序点击，能展示多轮记忆。">
          <div className="space-y-2">
            {presets.map((item) => (
              <Button
                key={item}
                type="button"
                variant="outline"
                size="sm"
                disabled={loading}
                className="w-full justify-start whitespace-normal text-left"
                onClick={() => {
                  setQuestion(item);
                  void ask(item);
                }}
              >
                {item}
              </Button>
            ))}
          </div>
        </SectionCard>
      </aside>

      <main className="space-y-6">
        <section className="grid gap-4 md:grid-cols-3">
          <StatusCard
            icon={<ClipboardList className="size-4" />}
            label="当前事项"
            value={agent?.case?.case_title ?? "尚未开始"}
          />
          <StatusCard
            icon={<CheckCircle2 className="size-4" />}
            label="已知条件"
            value={`${knownSlots.length} 项`}
          />
          <StatusCard
            icon={<MessageSquarePlus className="size-4" />}
            label="待补充"
            value={`${agent?.missing_slots.length ?? 0} 项`}
          />
        </section>

        <div className="grid gap-6 xl:grid-cols-2">
          <SectionCard title="已知条件" description="来自本轮输入、事项记忆和长期记忆。">
            <div className="flex flex-wrap gap-2">
              {knownSlots.map((slot) => (
                <span key={slot.key} className="rounded-md bg-muted px-2 py-1 text-xs text-foreground">
                  {slot.name}：{formatValue(slot.value)}
                </span>
              ))}
              {knownSlots.length === 0 ? (
                <p className="text-sm text-muted-foreground">还没有记录条件。</p>
              ) : null}
            </div>
          </SectionCard>

          <SectionCard title="Agent 追问区" description="缺口条件会先追问，不会直接下绝对结论。">
            <div className="space-y-2">
              {(agent?.follow_up_questions ?? []).map((item) => (
                <div key={item} className="rounded-md border border-border bg-background px-3 py-2 text-sm">
                  {item}
                </div>
              ))}
              {agent && agent.follow_up_questions.length === 0 ? (
                <p className="text-sm text-muted-foreground">关键条件已基本补齐。</p>
              ) : null}
              {!agent ? <p className="text-sm text-muted-foreground">提交问题后显示追问。</p> : null}
            </div>
          </SectionCard>
        </div>

        <SectionCard title="判断结果" description="资格结论来自政策片段和已知条件，仍需以学校审核为准。">
          {agent?.eligibility ? (
            <div className="space-y-4">
              <div className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-accent-foreground">
                {agent.eligibility.result_status}：{agent.eligibility.result_summary}
              </div>
              <ConditionList title="满足或已提供" items={agent.eligibility.matched_conditions} />
              <ConditionList title="不满足" items={agent.eligibility.unmet_conditions} />
              <ConditionList title="待确认" items={agent.eligibility.pending_conditions} />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">提交资格类问题后生成判断结果。</p>
          )}
        </SectionCard>

        <div className="grid gap-6 xl:grid-cols-2">
          <SectionCard title="政策依据" description="当前回答引用的主要政策信息。">
            <p className="whitespace-pre-wrap text-sm leading-6 text-foreground">
              {current?.policy_basis ?? "暂无政策依据。"}
            </p>
          </SectionCard>

          <SectionCard title="材料与流程" description="从检索片段中抽取材料线索和办理步骤。">
            <div className="space-y-4">
              <MiniList title="材料线索" items={agent?.material_list ?? []} />
              <MiniList title="办理流程" items={agent?.workflow_steps ?? []} icon={<Route className="size-4" />} />
            </div>
          </SectionCard>
        </div>
      </main>
    </div>
  );
}

function StatusCard({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <p className="text-lg font-semibold text-foreground">{value}</p>
    </div>
  );
}

function ConditionList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-foreground">{title}</h3>
      {items.length > 0 ? (
        <ul className="space-y-1 text-sm leading-6 text-muted-foreground">
          {items.map((item) => (
            <li key={item}>- {item}</li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">暂无</p>
      )}
    </div>
  );
}

function MiniList({
  title,
  items,
  icon,
}: {
  title: string;
  items: string[];
  icon?: ReactNode;
}) {
  return (
    <div>
      <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
        {icon}
        {title}
      </h3>
      {items.length > 0 ? (
        <ul className="space-y-1 text-sm leading-6 text-muted-foreground">
          {items.slice(0, 6).map((item) => (
            <li key={item}>- {item}</li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">暂无线索</p>
      )}
    </div>
  );
}

function formatValue(value: AgentSlot["value"]) {
  if (value === null || value === undefined) return "未填写";
  if (typeof value === "boolean") return value ? "是" : "否";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}
