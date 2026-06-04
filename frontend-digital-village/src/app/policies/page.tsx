"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { FileSearch, Loader2, RefreshCw, Search } from "lucide-react";

import { SectionCard } from "@/components/section-card";
import { PageHeading } from "@/components/page-heading";
import {
  getPolicyChunks,
  listDocuments,
  type PolicyDocumentItem,
  type PolicyChunkItem,
  type PolicyChunkListResponse,
} from "@/lib/api";

export default function PoliciesPage() {
  const [documents, setDocuments] = useState<PolicyDocumentItem[]>([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState("");
  const [query, setQuery] = useState("");
  const [chunks, setChunks] = useState<PolicyChunkListResponse | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [initLoading, setInitLoading] = useState(true);

  const selectedDocument = useMemo(
    () => documents.find((document) => document.id === selectedDocumentId),
    [documents, selectedDocumentId],
  );

  async function loadChunks(documentId = selectedDocumentId, nextQuery = query) {
    setLoading(true);
    setMessage("");
    try {
      const payload = await getPolicyChunks({
        document_id: documentId || undefined,
        query: nextQuery.trim() || undefined,
        limit: 30,
        offset: 0,
      });
      setChunks(payload);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "条款加载失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function loadInitial() {
      try {
        const docs = await listDocuments();
        const activeDocuments = docs.filter((d) => d.is_active);
        if (cancelled) return;

        setDocuments(activeDocuments);
        const firstDocumentId = activeDocuments[0]?.id ?? "";
        setSelectedDocumentId(firstDocumentId);

        if (firstDocumentId) {
          const chunkPayload = await getPolicyChunks({
            document_id: firstDocumentId,
            limit: 30,
            offset: 0,
          });
          if (!cancelled) setChunks(chunkPayload);
        }
      } catch (error) {
        if (!cancelled) setMessage(error instanceof Error ? error.message : "政策文件加载失败");
      } finally {
        if (!cancelled) setInitLoading(false);
      }
    }

    void loadInitial();
    return () => {
      cancelled = true;
    };
  }, []);

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void loadChunks();
  }

  return (
    <div className="page-shell">
      <PageHeading
        eyebrow="Policy Library"
        title="政策库"
        description="查看政策文件与知识库切片，按关键词搜索条款正文、章节或条款号。"
      />

      {initLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="size-8 animate-spin text-[var(--primary)]" />
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
          {/* 左侧：政策文件列表 */}
          <aside>
            <SectionCard title="政策文件" description="选择文件查看切片">
              <div className="max-h-[540px] overflow-y-auto -mx-5 -mb-5">
                {documents.map((doc) => (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={() => {
                      setSelectedDocumentId(doc.id);
                      void loadChunks(doc.id, query);
                    }}
                    className="block w-full border-b border-[var(--border)] px-5 py-3 text-left text-sm transition-colors last:border-0"
                    style={{
                      backgroundColor:
                        selectedDocumentId === doc.id ? "var(--muted)" : "transparent",
                    }}
                  >
                    <span className="block truncate font-semibold text-[var(--foreground)]">
                      {doc.title}
                    </span>
                    <span className="mt-1 block truncate text-xs text-[var(--muted-foreground)]">
                      {doc.policy_category} · {doc.chunk_count} 个切片 · {doc.is_active ? "启用" : "禁用"}
                    </span>
                  </button>
                ))}
                {documents.length === 0 ? (
                  <p className="px-5 py-10 text-center text-sm text-[var(--muted-foreground)]">
                    暂无政策文件
                  </p>
                ) : null}
              </div>
            </SectionCard>
          </aside>

          {/* 右侧：切片详情 */}
          <section className="min-w-0">
            <SectionCard
              title={selectedDocument?.title ?? "请选择政策文件"}
              description={
                selectedDocument
                  ? `${selectedDocument.policy_level} · ${selectedDocument.policy_category} · ${selectedDocument.file_name}`
                  : "左侧选择文件后可查看切片"
              }
              action={
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => loadChunks()}
                  className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border)] bg-white px-3 py-1.5 text-sm text-[var(--foreground)] transition-colors hover:bg-[var(--muted)] disabled:opacity-50"
                >
                  <RefreshCw className="size-4" />
                  刷新
                </button>
              }
            >
              <form onSubmit={handleSearch} className="mb-5 flex gap-3">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-[var(--muted-foreground)]" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="搜索条款正文、章节或条款号"
                    className="h-10 w-full rounded-md border border-[var(--border)] bg-white pl-9 pr-3 text-sm outline-none focus:ring-3 focus:ring-[var(--ring)]/40"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="focus-ring inline-flex items-center gap-1.5 rounded-md bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white transition-colors hover:brightness-110 disabled:opacity-50"
                >
                  <FileSearch className="size-4" />
                  检索
                </button>
              </form>

              {message ? (
                <p className="mb-4 text-sm text-[var(--muted-foreground)]">{message}</p>
              ) : null}

              <p className="mb-3 text-sm text-[var(--muted-foreground)]">
                共 {chunks?.total ?? 0} 个切片，当前展示 {chunks?.results.length ?? 0} 个
              </p>

              <div className="space-y-3">
                {chunks?.results.map((chunk) => (
                  <ChunkCard key={chunk.chunk_id} chunk={chunk} />
                ))}
                {chunks && chunks.results.length === 0 ? (
                  <div className="rounded-md border border-dashed border-[var(--border)] bg-white p-8 text-center text-sm text-[var(--muted-foreground)]">
                    未找到匹配切片
                  </div>
                ) : null}
              </div>
            </SectionCard>
          </section>
        </div>
      )}
    </div>
  );
}

function ChunkCard({ chunk }: { chunk: PolicyChunkItem }) {
  return (
    <article className="rounded-md border border-[var(--border)] bg-white p-4">
      <div className="mb-2 flex flex-wrap items-center gap-1.5 text-xs">
        <span className="rounded bg-[var(--muted)] px-2 py-0.5 text-[var(--muted-foreground)]">
          #{chunk.chunk_index}
        </span>
        {chunk.policy_category ? (
          <span className="rounded bg-[var(--muted)] px-2 py-0.5 text-[var(--muted-foreground)]">
            {chunk.policy_category}
          </span>
        ) : null}
        {chunk.page_no ? (
          <span className="rounded bg-[var(--muted)] px-2 py-0.5 text-[var(--muted-foreground)]">
            第 {chunk.page_no} 页
          </span>
        ) : null}
        {chunk.article_no ? (
          <span className="rounded bg-[var(--muted)] px-2 py-0.5 text-[var(--muted-foreground)]">
            {chunk.article_no}
          </span>
        ) : null}
      </div>
      {chunk.section_title ? (
        <h3 className="mb-2 text-sm font-semibold text-[var(--foreground)]">
          {chunk.section_title}
        </h3>
      ) : null}
      <p className="whitespace-pre-wrap text-sm leading-6 text-[var(--foreground)]">
        {chunk.chunk_text}
      </p>
      <p className="mt-3 text-xs text-[var(--muted-foreground)]">
        来源：{chunk.document_title} · {chunk.file_name}
      </p>
    </article>
  );
}
