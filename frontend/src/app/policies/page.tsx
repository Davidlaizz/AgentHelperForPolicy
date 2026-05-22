import { SectionCard } from "@/components/section-card";

export default function PoliciesPage() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-6">
      <SectionCard
        title="政策库"
        description="用于查看已上传政策文件、通知正文、附件和知识库切片。"
      >
        <div className="rounded-lg border border-dashed border-border bg-background p-4 text-sm text-muted-foreground">
          政策库页面已占位，后续在 M7 接入文件列表、chunk 查看和检索结果核查。
        </div>
      </SectionCard>
    </div>
  );
}

