"use client";

import { FormEvent, useMemo, useState } from "react";
import { Bot, FileText, Loader2, MessageSquareText, Send, UserRound } from "lucide-react";

import { SectionCard } from "@/components/section-card";
import { featuredQuestions } from "@/data/platform-data";
import { askPolicyQuestion, type ChatResponse } from "@/lib/api";

type ChatTurn = {
  id: string;
  question: string;
  response?: ChatResponse;
  error?: string;
};

const EXAMPLE_QUESTIONS = featuredQuestions;

export default function ChatPage() {
  const [question, setQuestion] = useState("");
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [loading, setLoading] = useState(false);

  const canSubmit = useMemo(() => question.trim().length > 0 && !loading, [question, loading]);

  async function ask(nextQuestion: string) {
    const trimmed = nextQuestion.trim();
    if (!trimmed) return;

    const turnId = crypto.randomUUID();
    setTurns((prev) => [...prev, { id: turnId, question: trimmed }]);
    setQuestion("");
    setLoading(true);

    try {
      const response = await askPolicyQuestion({ question: trimmed, top_k: 5 });
      setTurns((prev) =>
        prev.map((t) => (t.id === turnId ? { ...t, response } : t)),
      );
    } catch (error) {
      setTurns((prev) =>
        prev.map((t) =>
          t.id === turnId
            ? { ...t, error: error instanceof Error ? error.message : "问答请求失败" }
            : t,
        ),
      );
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (canSubmit) void ask(question);
  }

  return (
    <div className="page-shell">
      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        {/* 左侧边栏 */}
        <aside className="space-y-4">
          <SectionCard title="会话脉络" description="保留本轮咨询问题，便于演示连续追问。">
            <div className="space-y-2">
              {turns.length === 0 ? (
                <p className="text-sm text-[var(--muted-foreground)]">还没有开始咨询。</p>
              ) : (
                turns.map((turn, index) => (
                  <div key={turn.id} className="rounded-md border border-[var(--border)] bg-white p-3">
                    <div className="mb-1 flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]">
                      <MessageSquareText className="size-3.5" />
                      <span>第 {index + 1} 轮</span>
                    </div>
                    <p className="line-clamp-3 text-sm text-[var(--foreground)]">{turn.question}</p>
                  </div>
                ))
              )}
            </div>
          </SectionCard>

          <SectionCard title="常见问题" description="点击问题开始咨询。">
            <div className="space-y-2">
              {EXAMPLE_QUESTIONS.map((item) => (
                <button
                  key={item}
                  type="button"
                  disabled={loading}
                  onClick={() => ask(item)}
                  className="focus-ring w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-left text-sm transition-colors hover:bg-[var(--muted)] disabled:opacity-50"
                >
                  {item}
                </button>
              ))}
            </div>
          </SectionCard>
        </aside>

        {/* 右侧主体 */}
        <main className="flex min-w-0 flex-col gap-6">
          <SectionCard
            title="智能问答"
            description="基于政策知识库回答问题，展示政策依据、AI 推断和引用出处。"
          >
            <p className="text-sm text-[var(--muted-foreground)]">
              适合自由问政策，也适合进入多轮资格判断。回答会带出处和风险提示。
            </p>
          </SectionCard>

          <section className="flex min-h-[520px] flex-col rounded-md border border-[var(--border)] bg-white">
            <div className="flex-1 space-y-5 overflow-y-auto p-5">
              {turns.length === 0 ? (
                <div className="flex h-full min-h-[360px] items-center justify-center rounded-md border border-dashed border-[var(--border)] text-sm text-[var(--muted-foreground)]">
                  选择一个示例问题，或输入你想咨询的政策事项。
                </div>
              ) : (
                turns.map((turn) => (
                  <div key={turn.id} className="space-y-3">
                    {/* 用户消息 */}
                    <div className="flex justify-end">
                      <div className="max-w-[78%] rounded-md bg-[var(--primary)] px-4 py-3 text-sm text-white">
                        <div className="mb-1 flex items-center justify-end gap-1.5 text-xs opacity-80">
                          <UserRound className="size-3.5" />
                          <span>用户</span>
                        </div>
                        {turn.question}
                      </div>
                    </div>

                    {/* AI 回答 */}
                    <div className="flex justify-start">
                      <div className="max-w-[86%] rounded-md border border-[var(--border)] bg-white px-4 py-3 text-sm">
                        <div className="mb-3 flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]">
                          <Bot className="size-3.5" />
                          <span>数字乡村智能体</span>
                        </div>

                        {turn.response ? (
                          <AnswerContent response={turn.response} />
                        ) : turn.error ? (
                          <p className="text-[var(--danger)]">{turn.error}</p>
                        ) : (
                          <div className="flex items-center gap-2 text-[var(--muted-foreground)]">
                            <Loader2 className="size-4 animate-spin" />
                            <span>正在检索政策并生成回答</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* 底部输入栏 */}
            <form onSubmit={handleSubmit} className="border-t border-[var(--border)] p-4">
              <div className="flex gap-3">
                <input
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="请输入政策问题，例如：农机补贴怎么申请？"
                  className="focus-ring h-10 flex-1 rounded-md border border-[var(--border)] bg-white px-3 text-sm outline-none"
                />
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="focus-ring inline-flex items-center gap-1.5 rounded-md bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  {loading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                  发送
                </button>
              </div>
            </form>
          </section>
        </main>
      </div>
    </div>
  );
}

function AnswerContent({ response }: { response: ChatResponse }) {
  const { answer, policy_basis, ai_inference, citations } = response;

  const hasAiInference = ai_inference && ai_inference.trim();

  return (
    <div className="space-y-4">
      <div className={hasAiInference ? "grid gap-3" : undefined}>
        <div className="rounded-md border border-[var(--border)] bg-[var(--muted)] p-4">
          <h3 className="mb-2 text-sm font-semibold text-[var(--foreground)]">政策依据</h3>
          <p className="whitespace-pre-wrap text-sm leading-6 text-[var(--foreground)]">
            {policy_basis || answer || "暂无政策依据。"}
          </p>
        </div>
        {hasAiInference ? (
          <div className="rounded-md border border-[var(--border)] bg-blue-50 p-4">
            <h3 className="mb-2 text-sm font-semibold text-[var(--foreground)]">AI 推断</h3>
            <p className="whitespace-pre-wrap text-sm leading-6 text-[var(--foreground)]">
              {ai_inference}
            </p>
          </div>
        ) : null}
      </div>

      {citations && citations.length > 0 ? (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-[var(--foreground)]">引用出处</h3>
          <div className="grid gap-2">
            {citations.map((citation) => (
              <details
                key={citation.citation_id}
                className="rounded-md border border-[var(--border)] bg-white p-3"
              >
                <summary className="flex cursor-pointer list-none items-start gap-2 text-sm">
                  <FileText className="mt-0.5 size-4 shrink-0 text-[var(--muted-foreground)]" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-[var(--foreground)]">
                      {citation.document_title}
                    </span>
                    <span className="text-xs text-[var(--muted-foreground)]">
                      {citation.page_no ? `第 ${citation.page_no} 页` : "无页码"}
                      {citation.article_no ? ` · ${citation.article_no}` : ""}
                      {` · 分数 ${citation.final_score.toFixed(3)}`}
                    </span>
                  </span>
                </summary>
                <p className="mt-3 whitespace-pre-wrap text-xs leading-5 text-[var(--muted-foreground)]">
                  {citation.quote_text}
                </p>
              </details>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
