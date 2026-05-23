"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { FileSearch, RefreshCw, Search } from "lucide-react";

import { SectionCard } from "@/components/section-card";
import { Button } from "@/components/ui/button";

type PolicyDocument = {
  id: string;
  title: string;
  file_name: string;
  policy_level: string;
  policy_category: string;
  parse_status: string;
  chunk_count: number;
  is_active: boolean;
};

type PolicyChunk = {
  chunk_id: string;
  document_id: string;
  document_title: string;
  file_name: string;
  chunk_index: number;
  chunk_text: string;
  section_title: string | null;
  article_no: string | null;
  page_no: number | null;
  policy_level: string | null;
  policy_category: string | null;
  applicable_scope: string | null;
  effective_from: string | null;
  effective_to: string | null;
  metadata: Record<string, unknown>;
};

type ChunkResponse = {
  total: number;
  limit: number;
  offset: number;
  results: PolicyChunk[];
};

const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";

export default function PoliciesPage() {
  const [documents, setDocuments] = useState<PolicyDocument[]>([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState("");
  const [query, setQuery] = useState("");
  const [chunks, setChunks] = useState<ChunkResponse | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const selectedDocument = useMemo(
    () => documents.find((document) => document.id === selectedDocumentId),
    [documents, selectedDocumentId],
  );

  async function loadChunks(documentId = selectedDocumentId, nextQuery = query) {
    const params = new URLSearchParams({ limit: "30", offset: "0" });
    if (documentId) {
      params.set("document_id", documentId);
    }
    if (nextQuery.trim()) {
      params.set("query", nextQuery.trim());
    }

    setLoading(true);
    setMessage("");
    try {
      const response = await fetch(`${apiBaseUrl}/api/management/policy-chunks?${params}`, {
        cache: "no-store",
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.detail ?? "条款加载失败");
      }
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
        const response = await fetch(`${apiBaseUrl}/api/documents`, { cache: "no-store" });
        if (!response.ok) {
          throw new Error("政策文件加载失败");
        }
        const payload: PolicyDocument[] = await response.json();
        const activeDocuments = payload.filter((document) => document.is_active);
        if (cancelled) {
          return;
        }
        setDocuments(activeDocuments);
        const firstDocumentId = activeDocuments[0]?.id ?? "";
        setSelectedDocumentId(firstDocumentId);
        if (firstDocumentId) {
          const params = new URLSearchParams({
            document_id: firstDocumentId,
            limit: "30",
            offset: "0",
          });
          const chunkResponse = await fetch(`${apiBaseUrl}/api/management/policy-chunks?${params}`, {
            cache: "no-store",
          });
          const chunkPayload = await chunkResponse.json();
          if (!chunkResponse.ok) {
            throw new Error(chunkPayload.detail ?? "条款加载失败");
          }
          if (!cancelled) {
            setChunks(chunkPayload);
          }
        }
      } catch (error) {
        if (!cancelled) {
          setMessage(error instanceof Error ? error.message : "政策文件加载失败");
        }
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
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-6 py-6">
      <SectionCard title="政策库" description="查看政策文件、附件和知识库切片，辅助管理员核查 RAG 内容。">
        <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
          <aside className="rounded-lg border border-border bg-background">
            <div className="border-b border-border px-3 py-2 text-sm font-medium text-foreground">
              政策文件
            </div>
            <div className="max-h-[560px] overflow-y-auto">
              {documents.map((document) => (
                <button
                  key={document.id}
                  type="button"
                  onClick={() => {
                    setSelectedDocumentId(document.id);
                    void loadChunks(document.id, query);
                  }}
                  className={`block w-full border-b border-border px-3 py-3 text-left text-sm last:border-0 ${
                    selectedDocumentId === document.id ? "bg-muted" : "bg-background hover:bg-muted/60"
                  }`}
                >
                  <span className="block truncate font-medium text-foreground">{document.title}</span>
                  <span className="mt-1 block truncate text-xs text-muted-foreground">
                    {document.policy_category} · {document.chunk_count} 个切片 · {document.is_active ? "启用" : "禁用"}
                  </span>
                </button>
              ))}
              {documents.length === 0 ? (
                <p className="px-3 py-8 text-center text-sm text-muted-foreground">暂无政策文件</p>
              ) : null}
            </div>
          </aside>

          <section className="min-w-0">
            <div className="mb-4 rounded-lg border border-border bg-background p-4">
              <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate text-lg font-semibold text-foreground">
                    {selectedDocument?.title ?? "请选择政策文件"}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {selectedDocument
                      ? `${selectedDocument.policy_level} · ${selectedDocument.policy_category} · ${selectedDocument.file_name}`
                      : "左侧选择文件后可查看切片"}
                  </p>
                </div>
                <Button type="button" variant="outline" disabled={loading} onClick={() => loadChunks()}>
                  <RefreshCw className="size-4" />
                  刷新
                </Button>
              </div>

              <form onSubmit={handleSearch} className="flex gap-3">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-muted-foreground" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="搜索条款正文、章节或条款号"
                    className="h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                  />
                </div>
                <Button type="submit" disabled={loading}>
                  <FileSearch className="size-4" />
                  检索
                </Button>
              </form>
              {message ? <p className="mt-3 text-sm text-muted-foreground">{message}</p> : null}
            </div>

            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">
                共 {chunks?.total ?? 0} 个切片，当前展示 {chunks?.results.length ?? 0} 个
              </div>
              {chunks?.results.map((chunk) => (
                <article key={chunk.chunk_id} className="rounded-lg border border-border bg-background p-4">
                  <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="rounded-md bg-muted px-2 py-1">#{chunk.chunk_index}</span>
                    <span className="rounded-md bg-muted px-2 py-1">{chunk.policy_category ?? "未分类"}</span>
                    {chunk.page_no ? (
                      <span className="rounded-md bg-muted px-2 py-1">第 {chunk.page_no} 页</span>
                    ) : null}
                    {chunk.article_no ? (
                      <span className="rounded-md bg-muted px-2 py-1">{chunk.article_no}</span>
                    ) : null}
                  </div>
                  {chunk.section_title ? (
                    <h3 className="mb-2 text-sm font-semibold text-foreground">{chunk.section_title}</h3>
                  ) : null}
                  <p className="whitespace-pre-wrap text-sm leading-6 text-foreground">{chunk.chunk_text}</p>
                  <p className="mt-3 text-xs text-muted-foreground">
                    来源：{chunk.document_title} · {chunk.file_name}
                  </p>
                </article>
              ))}
              {chunks && chunks.results.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border bg-background p-8 text-center text-sm text-muted-foreground">
                  未找到匹配切片
                </div>
              ) : null}
            </div>
          </section>
        </div>
      </SectionCard>
    </div>
  );
}
