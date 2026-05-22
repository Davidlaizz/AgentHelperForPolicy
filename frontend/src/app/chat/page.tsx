"use client";

import { FormEvent, useMemo, useState } from "react";
import { Bot, FileText, Loader2, Send, UserRound } from "lucide-react";

import { SectionCard } from "@/components/section-card";
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

export default function ChatPage() {
  const [question, setQuestion] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [loading, setLoading] = useState(false);

  const canSubmit = useMemo(() => question.trim().length > 0 && !loading, [question, loading]);

  async function ask(nextQuestion: string) {
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
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (canSubmit) {
      void ask(question);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-6">
      <SectionCard
        title="智能问答"
        description="基于政策知识库回答问题，并展示政策依据、AI 推断和引用出处。"
      >
        <div className="flex flex-wrap gap-2">
          {starterQuestions.map((item) => (
            <Button
              key={item}
              type="button"
              variant="outline"
              size="sm"
              disabled={loading}
              onClick={() => ask(item)}
            >
              {item}
            </Button>
          ))}
        </div>
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
    </div>
  );
}

function AnswerContent({ response }: { response: ChatResponse }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-lg border border-border bg-muted/30 p-3">
          <h3 className="mb-2 text-sm font-semibold text-foreground">政策依据</h3>
          <p className="whitespace-pre-wrap text-sm leading-6 text-foreground">
            {response.policy_basis}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-muted/30 p-3">
          <h3 className="mb-2 text-sm font-semibold text-foreground">AI 推断</h3>
          <p className="whitespace-pre-wrap text-sm leading-6 text-foreground">
            {response.ai_inference}
          </p>
        </div>
      </div>

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
