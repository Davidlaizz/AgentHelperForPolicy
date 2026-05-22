import { SectionCard } from "@/components/section-card";

export default function AdminPage() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-6">
      <SectionCard
        title="管理后台"
        description="管理员上传政策文件、录入 metadata、查看解析状态和维护知识库。"
      >
        <div className="rounded-lg border border-dashed border-border bg-background p-4 text-sm text-muted-foreground">
          管理页骨架已创建，后续在 M3 和 M7 接入上传、解析状态和标准答案维护。
        </div>
      </SectionCard>
    </div>
  );
}

