"use client";

import { useEffect, useState } from "react";
import { BookOpenCheck, Filter, Loader2, Search } from "lucide-react";

import { PageHeading } from "@/components/page-heading";
import { SectionCard } from "@/components/section-card";
import { policyDocuments } from "@/data/platform-data";
import { listDocuments, type PolicyDocumentItem } from "@/lib/api";

const categories = ["全部", "数字乡村建设", "乡村振兴", "农业补贴", "农产品电商", "返乡创业", "社区治理"];

export default function PoliciesPage() {
  const [apiDocs, setApiDocs] = useState<PolicyDocumentItem[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listDocuments()
      .then((docs) => setApiDocs(docs.filter((d) => d.is_active)))
      .catch(() => setApiDocs(null))
      .finally(() => setLoading(false));
  }, []);

  const hasApi = apiDocs !== null;
  const docs = apiDocs ?? policyDocuments;

  return (
    <div className="page-shell">
      <PageHeading eyebrow="Policy Library" title="政策库"
        description="按政策分类、地区层级、适用主体组织资料和引用片段。" />
      <div className="grid gap-6 lg:grid-cols-[0.78fr_1.22fr]">
        <SectionCard title="筛选条件" description="按关键词和政策分类快速定位资料。">
          <div className="space-y-5">
            <div>
              <label className="text-sm font-semibold" htmlFor="policy-search">搜索关键词</label>
              <div className="mt-2 flex min-h-12 items-center gap-2 rounded-md border bg-white px-3">
                <Search className="size-4 text-muted-foreground" />
                <input id="policy-search" className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                  placeholder="补贴、创业、直播、电商" />
              </div>
            </div>
            <FilterGroup title="政策分类" items={categories} />
          </div>
        </SectionCard>
        <SectionCard title="政策文件列表"
          description={hasApi ? "来自后端实时数据" : "本地示例数据（后端暂不可达）"}>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-8 animate-spin text-[var(--primary)]" />
            </div>
          ) : (
            <div className="grid gap-4">
              {apiDocs ? (
                apiDocs.map((doc) => (
                  <article key={doc.id} className="rounded-md border bg-white p-4">
                    <div className="flex items-center gap-2">
                      <BookOpenCheck className="size-5 text-[var(--primary)]" />
                      <h2 className="text-lg font-semibold">{doc.title}</h2>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      分类：{doc.policy_category} | 层级：{doc.policy_level} | 状态：{doc.parse_status}
                    </p>
                    <div className="mt-4 rounded-md bg-[var(--muted)] p-3 text-sm">
                      <p>文件：{doc.file_name} | 切片：{doc.chunk_count}</p>
                    </div>
                  </article>
                ))
              ) : (
                policyDocuments.map((doc) => (
                  <article key={doc.title} className="rounded-md border bg-white p-4">
                    <div className="flex items-center gap-2">
                      <BookOpenCheck className="size-5 text-[var(--primary)]" />
                      <h2 className="text-lg font-semibold">{doc.title}</h2>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{doc.summary}</p>
                    <div className="mt-4 rounded-md bg-[var(--muted)] p-3 text-sm">
                      <p className="font-medium">适用主体：{doc.subject}</p>
                      <p className="mt-1">{doc.snippet}</p>
                    </div>
                  </article>
                ))
              )}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}

function FilterGroup({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <Filter className="size-4 text-[var(--secondary)]" />
        <p className="text-sm font-semibold">{title}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map((item, index) => (
          <button key={item} type="button"
            className={"min-h-10 rounded-md px-3 text-sm " + (index === 0 ? "bg-[var(--primary)] text-white" : "bg-[var(--muted)]")}>
            {item}
          </button>
        ))}
      </div>
    </div>
  );
}
