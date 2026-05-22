"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { FileText, RefreshCw, RotateCcw, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/section-card";

type PolicyDocument = {
  id: string;
  title: string;
  file_name: string;
  file_type: string;
  file_size: number | null;
  policy_level: string;
  policy_category: string;
  issuing_department: string | null;
  applicable_scope: string | null;
  college: string | null;
  publish_date: string | null;
  effective_from: string | null;
  effective_to: string | null;
  version: string | null;
  parse_status: "uploaded" | "parsing" | "parsed" | "indexed" | "failed";
  parse_error: string | null;
  is_attachment: boolean;
  parent_document_id: string | null;
  attachment_title: string | null;
  chunk_count: number;
  created_at: string;
};

const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";

const statusLabel: Record<PolicyDocument["parse_status"], string> = {
  uploaded: "已上传",
  parsing: "解析中",
  parsed: "已解析",
  indexed: "已入库",
  failed: "失败",
};

const statusClassName: Record<PolicyDocument["parse_status"], string> = {
  uploaded: "border-slate-200 bg-slate-50 text-slate-700",
  parsing: "border-blue-200 bg-blue-50 text-blue-700",
  parsed: "border-emerald-200 bg-emerald-50 text-emerald-700",
  indexed: "border-indigo-200 bg-indigo-50 text-indigo-700",
  failed: "border-red-200 bg-red-50 text-red-700",
};

export default function AdminPage() {
  const [documents, setDocuments] = useState<PolicyDocument[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentRole, setDocumentRole] = useState<"main" | "attachment">("main");
  const [parentDocumentId, setParentDocumentId] = useState("");
  const [autoParse, setAutoParse] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const mainDocuments = useMemo(
    () => documents.filter((document) => !document.is_attachment),
    [documents],
  );

  async function loadDocuments() {
    const response = await fetch(`${apiBaseUrl}/api/documents`, {
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error("文件列表加载失败");
    }
    setDocuments(await response.json());
  }

  useEffect(() => {
    let cancelled = false;

    async function loadInitialDocuments() {
      try {
        const response = await fetch(`${apiBaseUrl}/api/documents`, {
          cache: "no-store",
        });
        if (!response.ok) {
          throw new Error("文件列表加载失败");
        }
        const payload = await response.json();
        if (!cancelled) {
          setDocuments(payload);
        }
      } catch (error) {
        if (!cancelled) {
          setMessage(error instanceof Error ? error.message : "文件列表加载失败");
        }
      }
    }

    void loadInitialDocuments();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedFile) {
      setMessage("请选择 PDF 或 DOCX 文件");
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);
    formData.set("document_role", documentRole);
    formData.set("auto_parse", String(autoParse));
    if (documentRole === "attachment") {
      formData.set("parent_document_id", parentDocumentId);
    } else {
      formData.delete("parent_document_id");
      formData.delete("attachment_title");
    }

    setLoading(true);
    setMessage("");
    try {
      const response = await fetch(`${apiBaseUrl}/api/documents/upload`, {
        method: "POST",
        body: formData,
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.detail ?? "上传失败");
      }
      form.reset();
      setSelectedFile(null);
      setDocumentRole("main");
      setParentDocumentId("");
      setAutoParse(true);
      setMessage(`已上传：${payload.title}`);
      await loadDocuments();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "上传失败");
    } finally {
      setLoading(false);
    }
  }

  async function retryParse(documentId: string) {
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch(`${apiBaseUrl}/api/documents/${documentId}/parse`, {
        method: "POST",
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.detail ?? "重新解析失败");
      }
      setMessage(`已重新解析：${payload.title}`);
      await loadDocuments();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "重新解析失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-6 py-6">
      <SectionCard title="管理后台" description="政策文件上传、metadata 录入与解析状态管理。">
        <form onSubmit={handleSubmit} className="grid gap-4 lg:grid-cols-[1fr_1fr]">
          <div className="space-y-4">
            <label className="block space-y-2 text-sm font-medium text-foreground">
              <span>政策文件</span>
              <input
                name="file"
                type="file"
                accept=".pdf,.docx"
                required
                onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
                className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </label>
            <div className="grid gap-4 md:grid-cols-2">
              <Field name="title" label="政策标题" placeholder="默认使用文件名" />
              <Field name="policy_category" label="政策类别" defaultValue="未分类" required />
              <Field name="policy_level" label="政策层级" defaultValue="校级" required />
              <Field name="issuing_department" label="发布部门" />
              <Field name="applicable_scope" label="适用范围" />
              <Field name="college" label="学院" />
              <Field name="version" label="版本" />
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <Field name="publish_date" label="发布时间" type="date" />
              <Field name="effective_from" label="生效时间" type="date" />
              <Field name="effective_to" label="失效时间" type="date" />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block space-y-2 text-sm font-medium text-foreground">
                <span>文件类型</span>
                <select
                  value={documentRole}
                  onChange={(event) =>
                    setDocumentRole(event.target.value as "main" | "attachment")
                  }
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="main">主文件</option>
                  <option value="attachment">附件</option>
                </select>
              </label>

              <label className="block space-y-2 text-sm font-medium text-foreground">
                <span>所属主文件</span>
                <select
                  name="parent_document_id"
                  value={parentDocumentId}
                  disabled={documentRole === "main"}
                  required={documentRole === "attachment"}
                  onChange={(event) => setParentDocumentId(event.target.value)}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm disabled:bg-muted"
                >
                  <option value="">请选择</option>
                  {mainDocuments.map((document) => (
                    <option key={document.id} value={document.id}>
                      {document.title}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {documentRole === "attachment" ? (
              <Field name="attachment_title" label="附件标题" placeholder="默认使用政策标题" />
            ) : null}

            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                name="auto_parse"
                type="checkbox"
                checked={autoParse}
                onChange={(event) => setAutoParse(event.target.checked)}
                className="size-4 rounded border-input"
              />
              <span>上传后自动解析</span>
            </label>

            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" disabled={loading} size="lg">
                <Upload className="size-4" />
                上传
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={loading}
                onClick={() => loadDocuments()}
                size="lg"
              >
                <RefreshCw className="size-4" />
                刷新
              </Button>
              {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
            </div>
          </div>
        </form>
      </SectionCard>

      <SectionCard title="政策文件" description="已上传文件、附件关系与解析结果。">
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full table-fixed border-collapse text-left text-sm">
            <thead className="bg-muted/70 text-xs text-muted-foreground">
              <tr>
                <th className="w-[30%] px-3 py-2 font-medium">文件</th>
                <th className="w-[14%] px-3 py-2 font-medium">metadata</th>
                <th className="w-[12%] px-3 py-2 font-medium">关系</th>
                <th className="w-[12%] px-3 py-2 font-medium">状态</th>
                <th className="w-[12%] px-3 py-2 font-medium">段落</th>
                <th className="w-[20%] px-3 py-2 font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((document) => (
                <tr key={document.id} className="border-t border-border align-top">
                  <td className="px-3 py-3">
                    <div className="flex min-w-0 gap-2">
                      <FileText className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">{document.title}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {document.file_name}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-xs text-muted-foreground">
                    <p>{document.policy_level}</p>
                    <p>{document.policy_category}</p>
                  </td>
                  <td className="px-3 py-3 text-xs text-muted-foreground">
                    {document.is_attachment ? "附件" : "主文件"}
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={`inline-flex rounded-md border px-2 py-1 text-xs ${statusClassName[document.parse_status]}`}
                    >
                      {statusLabel[document.parse_status]}
                    </span>
                    {document.parse_error ? (
                      <p className="mt-1 line-clamp-2 text-xs text-red-600">
                        {document.parse_error}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-3 py-3 text-sm text-foreground">{document.chunk_count}</td>
                  <td className="px-3 py-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={loading}
                      onClick={() => retryParse(document.id)}
                    >
                      <RotateCcw className="size-3.5" />
                      重新解析
                    </Button>
                  </td>
                </tr>
              ))}
              {documents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-sm text-muted-foreground">
                    暂无政策文件
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}

function Field({
  name,
  label,
  type = "text",
  placeholder,
  defaultValue,
  required,
}: {
  name: string;
  label: string;
  type?: string;
  placeholder?: string;
  defaultValue?: string;
  required?: boolean;
}) {
  return (
    <label className="block space-y-2 text-sm font-medium text-foreground">
      <span>{label}</span>
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        defaultValue={defaultValue}
        required={required}
        className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
      />
    </label>
  );
}
