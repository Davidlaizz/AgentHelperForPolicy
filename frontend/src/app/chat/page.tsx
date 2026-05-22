import { SectionCard } from "@/components/section-card";

export default function ChatPage() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-6">
      <SectionCard
        title="智能问答"
        description="学生以自然语言提问，系统返回结论、依据、风险提示和下一步建议。"
      >
        <div className="rounded-lg border border-dashed border-border bg-background p-4 text-sm text-muted-foreground">
          问答页骨架已就位，后续在 M5 接入 RAG 检索与回答渲染。
        </div>
      </SectionCard>
    </div>
  );
}

