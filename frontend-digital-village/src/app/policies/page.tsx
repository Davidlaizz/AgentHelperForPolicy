import { BookOpenCheck, Filter, Search } from "lucide-react";

import { PageHeading } from "@/components/page-heading";
import { SectionCard } from "@/components/section-card";
import { policyDocuments } from "@/data/platform-data";

const categories = ["全部", "数字乡村建设", "乡村振兴", "农业补贴", "农产品电商", "返乡创业", "社区治理"];
const levels = ["国家", "省/县", "市/县", "县区"];

export default function PoliciesPage() {
  return (
    <div className="page-shell">
      <PageHeading
        eyebrow="Policy Library"
        title="政策库"
        description="按政策分类、地区层级、适用主体组织资料和引用片段，支撑政策问答与办事引导。"
      />

      <div className="grid gap-6 lg:grid-cols-[0.78fr_1.22fr]">
        <SectionCard title="筛选条件" description="按关键词、政策分类和地区层级快速定位资料。">
          <div className="space-y-5">
            <div>
              <label className="text-sm font-semibold text-[var(--foreground)]" htmlFor="policy-search">
                搜索关键词
              </label>
              <div className="mt-2 flex min-h-12 items-center gap-2 rounded-md border border-[var(--border)] bg-white px-3">
                <Search className="size-4 text-[var(--muted-foreground)]" aria-hidden="true" />
                <input
                  id="policy-search"
                  className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                  placeholder="补贴、创业、直播、电商"
                />
              </div>
            </div>

            <FilterGroup title="政策分类" items={categories} />
            <FilterGroup title="地区层级" items={levels} />
          </div>
        </SectionCard>

        <SectionCard title="政策文件列表" description="每条政策都展示摘要和引用片段，便于追溯依据来源。">
          <div className="grid gap-4">
            {policyDocuments.map((doc) => (
              <article key={doc.title} className="rounded-md border border-[var(--border)] bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <BookOpenCheck className="size-5 text-[var(--primary)]" aria-hidden="true" />
                      <h2 className="text-lg font-semibold text-[var(--foreground)]">{doc.title}</h2>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">{doc.summary}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-md bg-emerald-50 px-2.5 py-1 text-xs text-emerald-800">{doc.category}</span>
                    <span className="rounded-md bg-sky-50 px-2.5 py-1 text-xs text-sky-800">{doc.level}</span>
                  </div>
                </div>
                <div className="mt-4 rounded-md bg-[var(--muted)] p-3 text-sm leading-6">
                  <p className="font-medium text-[var(--foreground)]">适用主体：{doc.subject}</p>
                  <p className="mt-1 text-[var(--muted-foreground)]">引用片段：{doc.snippet}</p>
                </div>
              </article>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

function FilterGroup({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <Filter className="size-4 text-[var(--secondary)]" aria-hidden="true" />
        <p className="text-sm font-semibold text-[var(--foreground)]">{title}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map((item, index) => (
          <button
            key={item}
            type="button"
            className={`focus-ring min-h-10 rounded-md px-3 text-sm ${
              index === 0 ? "bg-[var(--primary)] text-white" : "bg-[var(--muted)] text-[var(--foreground)]"
            }`}
          >
            {item}
          </button>
        ))}
      </div>
    </div>
  );
}
