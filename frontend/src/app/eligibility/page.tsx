import { SectionCard } from "@/components/section-card";

export default function EligibilityPage() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-6">
      <SectionCard
        title="资格判断"
        description="围绕奖学金、转专业、毕业要求追问关键条件并输出判断结果。"
      >
        <div className="rounded-lg border border-dashed border-border bg-background p-4 text-sm text-muted-foreground">
          资格判断页已预留，后续在 M6 接入事项记忆、缺口追问和资格判断逻辑。
        </div>
      </SectionCard>
    </div>
  );
}

