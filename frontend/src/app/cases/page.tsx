import { SectionCard } from "@/components/section-card";

export default function CasesPage() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-6">
      <SectionCard
        title="事项中心"
        description="按事项展示政策摘要、所需材料、办理入口和时间节点。"
      >
        <div className="rounded-lg border border-dashed border-border bg-background p-4 text-sm text-muted-foreground">
          事项中心页已创建，后续在 M8 细化为奖学金、转专业、毕业等事项入口。
        </div>
      </SectionCard>
    </div>
  );
}

