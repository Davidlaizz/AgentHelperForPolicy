"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  BarChart3,
  BookOpenCheck,
  Activity,
  FileText,
  GitBranch,
  MessageSquareText,
  RefreshCw,
  RotateCcw,
  Save,
  ShieldAlert,
  Trash2,
  Upload,
  Workflow,
} from "lucide-react";

import { SectionCard } from "@/components/section-card";
import { Button } from "@/components/ui/button";

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
  is_active: boolean;
  created_at: string;
};

type Dashboard = {
  document_count: number;
  active_document_count: number;
  parsed_document_count: number;
  chunk_count: number;
  today_question_count: number;
  hot_question_count: number;
  standard_answer_count: number;
  high_risk_answer_count: number;
  service_case_count: number;
  memory_item_count: number;
  top_policy_categories: { name: string; count: number }[];
  top_case_types: { name: string; count: number }[];
};

type HotQuestion = {
  id: string;
  question_text: string;
  policy_category: string | null;
  hit_count: number;
  last_asked_at: string;
};

type StandardAnswer = {
  id: string;
  title: string;
  policy_category: string | null;
  question_keywords: string[] | Record<string, unknown> | null;
  applicable_scope: string | null;
  answer_content: string;
  status: string;
  updated_at: string;
};

type AgentGraphNode = {
  id: string;
  label: string;
  type: string;
  description: string | null;
  input_keys: string[] | Record<string, unknown> | null;
  output_keys: string[] | Record<string, unknown> | null;
  enabled: boolean;
  call_count: number;
  average_duration_ms: number | null;
  failure_count: number;
  last_failure_message: string | null;
  last_failure_at: string | null;
};

type AgentGraphEdge = {
  source: string;
  target: string;
  condition: string | null;
  condition_expression: string | null;
};

type AgentGraph = {
  version: string;
  description: string;
  nodes: AgentGraphNode[];
  edges: AgentGraphEdge[];
};

type AgentRun = {
  run_id: string;
  session_id: string | null;
  question: string;
  intent: string | null;
  case_type: string | null;
  status: string;
  risk_level: string | null;
  started_at: string;
  finished_at: string | null;
  duration_ms: number | null;
};

type AgentStepLog = {
  id: string;
  node_key: string;
  node_name: string;
  status: string;
  input_summary: string | null;
  output_summary: string | null;
  started_at: string;
  finished_at: string | null;
  duration_ms: number | null;
  error_message: string | null;
};

type AgentRunDetail = {
  run: AgentRun;
  steps: AgentStepLog[];
};

type GraphSelection =
  | { kind: "node"; id: string }
  | { kind: "edge"; id: string }
  | null;

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

const flowLayers = [
  { title: "入口", nodes: ["memory_read"] },
  { title: "理解", nodes: ["intent", "case", "slot"] },
  { title: "知识", nodes: ["retrieval", "evidence"] },
  { title: "分支", nodes: ["followup", "eligibility", "workflow", "risk"] },
  { title: "生成", nodes: ["answer", "memory_write"] },
];

const conditionLabels: Record<string, string> = {
  always: "固定流转",
  missing_slots: "存在缺失条件",
  eligibility_check: "资格判断",
  workflow_or_material: "流程或材料",
  policy_qa_or_general: "普通问答",
};

export default function AdminPage() {
  const [documents, setDocuments] = useState<PolicyDocument[]>([]);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [hotQuestions, setHotQuestions] = useState<HotQuestion[]>([]);
  const [standardAnswers, setStandardAnswers] = useState<StandardAnswer[]>([]);
  const [agentGraph, setAgentGraph] = useState<AgentGraph | null>(null);
  const [agentRuns, setAgentRuns] = useState<AgentRun[]>([]);
  const [agentRunDetail, setAgentRunDetail] = useState<AgentRunDetail | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentRole, setDocumentRole] = useState<"main" | "attachment">("main");
  const [parentDocumentId, setParentDocumentId] = useState("");
  const [autoParse, setAutoParse] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [graphSelection, setGraphSelection] = useState<GraphSelection>({ kind: "node", id: "memory_read" });

  const mainDocuments = useMemo(
    () => documents.filter((document) => !document.is_attachment && document.is_active),
    [documents],
  );
  const selectedNode = useMemo(() => {
    if (graphSelection?.kind !== "node") {
      return null;
    }
    return agentGraph?.nodes.find((node) => node.id === graphSelection.id) ?? null;
  }, [agentGraph?.nodes, graphSelection]);
  const selectedEdge = useMemo(() => {
    if (graphSelection?.kind !== "edge") {
      return null;
    }
    return agentGraph?.edges.find((edge, index) => edgeKey(edge, index) === graphSelection.id) ?? null;
  }, [agentGraph?.edges, graphSelection]);
  const selectedStep = useMemo(() => {
    if (!selectedNode) {
      return null;
    }
    return agentRunDetail?.steps.find((step) => step.node_key === selectedNode.id) ?? null;
  }, [agentRunDetail?.steps, selectedNode]);

  const loadAgentRunDetail = useCallback(async (runId: string) => {
    const response = await fetch(`${apiBaseUrl}/api/management/agent-runs/${runId}`, { cache: "no-store" });
    if (!response.ok) throw new Error("Agent 运行详情加载失败");
    setAgentRunDetail(await response.json());
  }, []);

  const loadAll = useCallback(async () => {
    const [documentResponse, dashboardResponse, hotResponse, answerResponse, agentGraphResponse, agentRunsResponse] =
      await Promise.all([
        fetch(`${apiBaseUrl}/api/documents`, { cache: "no-store" }),
        fetch(`${apiBaseUrl}/api/management/dashboard`, { cache: "no-store" }),
        fetch(`${apiBaseUrl}/api/management/hot-questions?limit=8`, { cache: "no-store" }),
        fetch(`${apiBaseUrl}/api/management/standard-answers`, { cache: "no-store" }),
        fetch(`${apiBaseUrl}/api/management/agent-graph`, { cache: "no-store" }),
        fetch(`${apiBaseUrl}/api/management/agent-runs?limit=8`, { cache: "no-store" }),
      ]);

    if (!documentResponse.ok) throw new Error("文件列表加载失败");
    if (!dashboardResponse.ok) throw new Error("看板指标加载失败");
    if (!hotResponse.ok) throw new Error("热门问题加载失败");
    if (!answerResponse.ok) throw new Error("标准答案加载失败");
    if (!agentGraphResponse.ok) throw new Error("Agent 架构加载失败");
    if (!agentRunsResponse.ok) throw new Error("Agent 运行记录加载失败");

    setDocuments(await documentResponse.json());
    setDashboard(await dashboardResponse.json());
    setHotQuestions(await hotResponse.json());
    setStandardAnswers(await answerResponse.json());
    setAgentGraph(await agentGraphResponse.json());
    const agentRunsData: AgentRun[] = await agentRunsResponse.json();
    setAgentRuns(agentRunsData);
    if (agentRunsData[0]) {
      await loadAgentRunDetail(agentRunsData[0].run_id);
    } else {
      setAgentRunDetail(null);
    }
  }, [loadAgentRunDetail]);

  useEffect(() => {
    let cancelled = false;

    async function loadInitial() {
      try {
        await loadAll();
      } catch (error) {
        if (!cancelled) {
          setMessage(error instanceof Error ? error.message : "后台数据加载失败");
        }
      }
    }

    void loadInitial();

    return () => {
      cancelled = true;
    };
  }, [loadAll]);

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
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
      await loadAll();
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
      await loadAll();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "重新解析失败");
    } finally {
      setLoading(false);
    }
  }

  async function saveDocumentMetadata(document: PolicyDocument, formData: FormData) {
    setLoading(true);
    setMessage("");
    try {
      const payload = formObject(formData);
      const response = await fetch(`${apiBaseUrl}/api/documents/${document.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.detail ?? "metadata 保存失败");
      }
      setMessage(`已保存：${body.title}`);
      await loadAll();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "metadata 保存失败");
    } finally {
      setLoading(false);
    }
  }

  async function disableDocument(document: PolicyDocument) {
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch(`${apiBaseUrl}/api/documents/${document.id}`, {
        method: "DELETE",
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.detail ?? "禁用失败");
      }
      setMessage(`已禁用：${body.title}`);
      await loadAll();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "禁用失败");
    } finally {
      setLoading(false);
    }
  }

  async function createStandardAnswer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const keywords = String(formData.get("question_keywords") ?? "")
      .split(/[，,\s]+/)
      .map((item) => item.trim())
      .filter(Boolean);

    setLoading(true);
    setMessage("");
    try {
      const response = await fetch(`${apiBaseUrl}/api/management/standard-answers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.get("title"),
          policy_category: emptyToNull(formData.get("policy_category")),
          question_keywords: keywords,
          applicable_scope: emptyToNull(formData.get("applicable_scope")),
          answer_content: formData.get("answer_content"),
          status: "active",
        }),
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.detail ?? "标准答案保存失败");
      }
      form.reset();
      setMessage(`已创建标准答案：${body.title}`);
      await loadAll();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "标准答案保存失败");
    } finally {
      setLoading(false);
    }
  }

  async function disableStandardAnswer(answer: StandardAnswer) {
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch(`${apiBaseUrl}/api/management/standard-answers/${answer.id}`, {
        method: "DELETE",
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.detail ?? "标准答案停用失败");
      }
      setMessage(`已停用标准答案：${body.title}`);
      await loadAll();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "标准答案停用失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-6 py-6">
      <SectionCard title="管理后台" description="政策知识库、运营指标、热门问题和标准答案维护。">
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <Metric icon={<FileText className="size-4" />} label="政策文件" value={dashboard?.document_count ?? 0} />
          <Metric icon={<BookOpenCheck className="size-4" />} label="已解析" value={dashboard?.parsed_document_count ?? 0} />
          <Metric icon={<BarChart3 className="size-4" />} label="知识切片" value={dashboard?.chunk_count ?? 0} />
          <Metric icon={<MessageSquareText className="size-4" />} label="今日问答" value={dashboard?.today_question_count ?? 0} />
          <Metric icon={<ShieldAlert className="size-4" />} label="高风险" value={dashboard?.high_risk_answer_count ?? 0} />
          <Metric icon={<BookOpenCheck className="size-4" />} label="标准答案" value={dashboard?.standard_answer_count ?? 0} />
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button type="button" variant="outline" disabled={loading} onClick={() => loadAll()}>
            <RefreshCw className="size-4" />
            刷新后台数据
          </Button>
          {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
        </div>
      </SectionCard>

      <SectionCard title="Agent 架构与运行轨迹" description="展示 LangGraph 多 Agent 编排节点、条件路由和最近运行状态。">
        <div className="mb-4 grid gap-3 md:grid-cols-3">
          <Metric icon={<Workflow className="size-4" />} label="Agent 节点" value={agentGraph?.nodes.length ?? 0} />
          <Metric icon={<GitBranch className="size-4" />} label="路由边" value={agentGraph?.edges.length ?? 0} />
          <Metric icon={<Activity className="size-4" />} label="最近运行" value={agentRuns.length} />
        </div>

        <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{agentGraph?.version ?? "未加载"}</span>
              <span>{agentGraph?.description ?? "暂无 Agent 编排信息"}</span>
            </div>
            <AgentFlowDiagram
              graph={agentGraph}
              selectedSteps={agentRunDetail?.steps ?? []}
              selection={graphSelection}
              onSelect={setGraphSelection}
            />
            <div className="grid gap-3 md:grid-cols-2">
              {(agentGraph?.nodes ?? []).map((node) => (
                <div key={node.id} className="rounded-lg border border-border bg-background p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{node.label}</p>
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                        {node.description}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
                      {node.type}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span>调用 {node.call_count}</span>
                    <span>平均 {node.average_duration_ms ?? 0}ms</span>
                    <span>失败 {node.failure_count}</span>
                    <span>{node.enabled ? "启用" : "停用"}</span>
                  </div>
                  <details className="mt-3 text-xs text-muted-foreground">
                    <summary className="cursor-pointer text-foreground">输入/输出字段</summary>
                    <p className="mt-2">输入：{formatKeys(node.input_keys)}</p>
                    <p className="mt-1">输出：{formatKeys(node.output_keys)}</p>
                    {node.last_failure_message ? (
                      <p className="mt-1 text-red-600">
                        最近失败：{node.last_failure_message}
                      </p>
                    ) : null}
                  </details>
                </div>
              ))}
              {!agentGraph?.nodes.length ? (
                <p className="text-sm text-muted-foreground">暂无 Agent 节点信息</p>
              ) : null}
            </div>
            <AgentGovernanceTable nodes={agentGraph?.nodes ?? []} />
          </div>

          <div className="space-y-4">
            <GraphSelectionPanel
              node={selectedNode}
              edge={selectedEdge}
              step={selectedStep}
            />

            <div className="rounded-lg border border-border">
              <div className="border-b border-border px-3 py-2 text-sm font-medium text-foreground">
                最近运行
              </div>
              <div className="divide-y divide-border">
                {agentRuns.map((run) => (
                  <div key={run.run_id} className="px-3 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <p className="line-clamp-2 text-sm font-medium leading-6 text-foreground">{run.question}</p>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
                          {run.status}
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => loadAgentRunDetail(run.run_id)}
                        >
                          查看
                        </Button>
                      </div>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {run.intent ?? "unknown"} / {run.case_type ?? "general"} / {run.risk_level ?? "未评估"} / {run.duration_ms ?? 0}ms
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(run.started_at)}</p>
                  </div>
                ))}
                {agentRuns.length === 0 ? (
                  <p className="px-3 py-6 text-sm text-muted-foreground">暂无 Agent 运行记录</p>
                ) : null}
              </div>
            </div>

            <div className="rounded-lg border border-border">
              <div className="border-b border-border px-3 py-2 text-sm font-medium text-foreground">
                运行详情
              </div>
              <div className="max-h-96 divide-y divide-border overflow-auto">
                {agentRunDetail ? (
                  <div className="px-3 py-3">
                    <p className="line-clamp-2 text-sm font-medium leading-6 text-foreground">
                      {agentRunDetail.run.question}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {agentRunDetail.run.intent ?? "unknown"} / {agentRunDetail.run.case_type ?? "general"} / {agentRunDetail.run.risk_level ?? "未评估"} / {agentRunDetail.run.duration_ms ?? 0}ms
                    </p>
                  </div>
                ) : null}
                {(agentRunDetail?.steps ?? []).map((step) => (
                  <div key={step.id} className="px-3 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="truncate text-sm font-medium text-foreground">{step.node_name}</p>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {step.status} / {step.duration_ms ?? 0}ms
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                      {step.output_summary ?? step.error_message ?? step.input_summary ?? "无摘要"}
                    </p>
                    <details className="mt-2 text-xs leading-5 text-muted-foreground">
                      <summary className="cursor-pointer text-foreground">查看输入/输出摘要</summary>
                      <p className="mt-2 break-words">输入：{step.input_summary ?? "无"}</p>
                      <p className="mt-1 break-words">输出：{step.output_summary ?? "无"}</p>
                      {step.error_message ? <p className="mt-1 text-red-600">错误：{step.error_message}</p> : null}
                    </details>
                  </div>
                ))}
                {!agentRunDetail?.steps.length ? (
                  <p className="px-3 py-6 text-sm text-muted-foreground">暂无执行步骤</p>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="政策文件上传" description="上传政策主文件或附件，并录入可参与检索过滤的 metadata。">
        <form onSubmit={handleUpload} className="grid gap-4 lg:grid-cols-[1fr_1fr]">
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
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <Field name="publish_date" label="发布时间" type="date" />
              <Field name="effective_from" label="生效时间" type="date" />
              <Field name="effective_to" label="失效时间" type="date" />
            </div>
            <Field name="version" label="版本" />
            <div className="grid gap-4 md:grid-cols-2">
              <SelectField
                label="文件类型"
                value={documentRole}
                onChange={(value) => setDocumentRole(value as "main" | "attachment")}
                options={[
                  { label: "主文件", value: "main" },
                  { label: "附件", value: "attachment" },
                ]}
              />
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
            <Button type="submit" disabled={loading} size="lg">
              <Upload className="size-4" />
              上传
            </Button>
          </div>
        </form>
      </SectionCard>

      <SectionCard title="政策文件管理" description="查看解析状态、chunk 数量，并维护文件 metadata。">
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full table-fixed border-collapse text-left text-sm">
            <thead className="bg-muted/70 text-xs text-muted-foreground">
              <tr>
                <th className="w-[30%] px-3 py-2 font-medium">文件</th>
                <th className="w-[15%] px-3 py-2 font-medium">分类</th>
                <th className="w-[12%] px-3 py-2 font-medium">状态</th>
                <th className="w-[10%] px-3 py-2 font-medium">切片</th>
                <th className="w-[13%] px-3 py-2 font-medium">启用</th>
                <th className="w-[20%] px-3 py-2 font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((document) => (
                <DocumentRow
                  key={document.id}
                  document={document}
                  loading={loading}
                  onRetry={() => retryParse(document.id)}
                  onSave={(formData) => saveDocumentMetadata(document, formData)}
                  onDisable={() => disableDocument(document)}
                />
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

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <SectionCard title="热门问题看板" description="按用户咨询次数排序，辅助发现高频政策服务需求。">
          <div className="space-y-3">
            {hotQuestions.map((question) => (
              <div key={question.id} className="border-b border-border pb-3 last:border-0 last:pb-0">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-medium leading-6 text-foreground">{question.question_text}</p>
                  <span className="shrink-0 rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
                    {question.hit_count} 次
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {question.policy_category ?? "未分类"} · {formatDateTime(question.last_asked_at)}
                </p>
              </div>
            ))}
            {hotQuestions.length === 0 ? (
              <p className="text-sm text-muted-foreground">暂无热门问题</p>
            ) : null}
          </div>
        </SectionCard>

        <SectionCard title="标准答案维护" description="为高频问题沉淀人工审核答案。">
          <form onSubmit={createStandardAnswer} className="mb-5 grid gap-3 md:grid-cols-2">
            <Field name="title" label="标题" required />
            <Field name="policy_category" label="政策类别" />
            <Field name="question_keywords" label="问题关键词" placeholder="用逗号或空格分隔" />
            <Field name="applicable_scope" label="适用范围" />
            <label className="block space-y-2 text-sm font-medium text-foreground md:col-span-2">
              <span>答案内容</span>
              <textarea
                name="answer_content"
                required
                rows={4}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </label>
            <div className="md:col-span-2">
              <Button type="submit" disabled={loading}>
                <Save className="size-4" />
                保存标准答案
              </Button>
            </div>
          </form>

          <div className="space-y-3">
            {standardAnswers.map((answer) => (
              <div key={answer.id} className="rounded-lg border border-border p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-foreground">{answer.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {answer.policy_category ?? "未分类"} · {answer.status} · {formatDateTime(answer.updated_at)}
                    </p>
                  </div>
                  {answer.status !== "disabled" ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={loading}
                      onClick={() => disableStandardAnswer(answer)}
                    >
                      <Trash2 className="size-3.5" />
                      停用
                    </Button>
                  ) : null}
                </div>
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
                  {answer.answer_content}
                </p>
              </div>
            ))}
            {standardAnswers.length === 0 ? (
              <p className="text-sm text-muted-foreground">暂无标准答案</p>
            ) : null}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

function AgentFlowDiagram({
  graph,
  selectedSteps,
  selection,
  onSelect,
}: {
  graph: AgentGraph | null;
  selectedSteps: AgentStepLog[];
  selection: GraphSelection;
  onSelect: (selection: GraphSelection) => void;
}) {
  const executed = new Set(selectedSteps.map((step) => step.node_key));
  const failed = new Set(selectedSteps.filter((step) => step.status === "failed").map((step) => step.node_key));
  const nodeById = new Map((graph?.nodes ?? []).map((node) => [node.id, node]));

  if (!graph?.nodes.length) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-background p-4 text-sm text-muted-foreground">
        暂无可视化 Agent 图。
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-background p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-foreground">多 Agent 状态图</p>
          <p className="text-xs text-muted-foreground">按 LangGraph 编排顺序展示节点、路由和最近运行命中情况。</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2 text-xs text-muted-foreground">
          <span className="rounded-md bg-emerald-50 px-2 py-1 text-emerald-700">已执行</span>
          <span className="rounded-md bg-red-50 px-2 py-1 text-red-700">失败</span>
          <span className="rounded-md bg-muted px-2 py-1">未命中</span>
        </div>
      </div>
      <div className="space-y-3">
        <div className="flex justify-center">
          <FlowTerminus label="Start" />
        </div>
        {flowLayers.map((layer, layerIndex) => (
          <div key={layer.title} className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-muted px-2 py-1 text-xs font-medium text-foreground">
                {layer.title}
              </span>
              <div className="h-px flex-1 bg-border" />
            </div>
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
              {layer.nodes.map((nodeId) => {
                const node = nodeById.get(nodeId);
                if (!node) {
                  return null;
                }
                return (
                  <FlowNodeButton
                    key={node.id}
                    node={node}
                    active={selection?.kind === "node" && selection.id === node.id}
                    executed={executed.has(node.id)}
                    failed={failed.has(node.id)}
                    onClick={() => onSelect({ kind: "node", id: node.id })}
                  />
                );
              })}
            </div>
            <div className="flex flex-wrap gap-2">
              {edgesForLayer(graph.edges, layer.nodes, layerIndex).map((edge) => {
                const key = edgeKey(edge.edge, edge.index);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => onSelect({ kind: "edge", id: key })}
                    className={`rounded-md border px-2 py-1 text-left text-xs transition ${
                      selection?.kind === "edge" && selection.id === key
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-background text-muted-foreground hover:border-primary/50"
                    }`}
                  >
                    {edge.edge.source} → {edge.edge.target} · {conditionText(edge.edge.condition)}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        <div className="flex justify-center">
          <FlowTerminus label="End" />
        </div>
      </div>
    </div>
  );
}

function FlowNodeButton({
  node,
  active,
  executed,
  failed,
  onClick,
}: {
  node: AgentGraphNode;
  active: boolean;
  executed: boolean;
  failed: boolean;
  onClick: () => void;
}) {
  const stateClass = failed
    ? "border-red-200 bg-red-50"
    : executed
      ? "border-emerald-200 bg-emerald-50"
      : "border-border bg-muted/30";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-28 rounded-lg border p-3 text-left transition hover:border-primary/50 ${
        active ? "ring-2 ring-primary/40" : ""
      } ${stateClass}`}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="rounded-md bg-background px-2 py-1 text-xs text-muted-foreground">
          {node.type}
        </span>
        <span className="rounded-md bg-background px-2 py-1 text-xs text-muted-foreground">
          {executed ? "已执行" : "未命中"}
        </span>
      </div>
      <p className="truncate text-sm font-medium text-foreground">{node.label}</p>
      <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{node.description}</p>
      <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
        <span>入 {countKeys(node.input_keys)}</span>
        <span>出 {countKeys(node.output_keys)}</span>
        <span>{node.average_duration_ms ?? 0}ms</span>
      </div>
    </button>
  );
}

function FlowTerminus({ label }: { label: string }) {
  return (
    <div className="rounded-full border border-border bg-muted px-4 py-1 text-xs font-medium text-muted-foreground">
      {label}
    </div>
  );
}

function GraphSelectionPanel({
  node,
  edge,
  step,
}: {
  node: AgentGraphNode | null;
  edge: AgentGraphEdge | null;
  step: AgentStepLog | null;
}) {
  return (
    <div className="rounded-lg border border-border bg-background">
      <div className="border-b border-border px-3 py-2 text-sm font-medium text-foreground">
        编排详情
      </div>
      <div className="space-y-4 p-3">
        {node ? (
          <>
            <div>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-foreground">{node.label}</span>
                <span className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">{node.type}</span>
                <span className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
                  {node.enabled ? "启用" : "停用"}
                </span>
              </div>
              <p className="text-xs leading-5 text-muted-foreground">{node.description}</p>
            </div>
            <KeyList title="入参" value={node.input_keys} />
            <KeyList title="出参" value={node.output_keys} />
            <div className="grid grid-cols-3 gap-2 text-xs">
              <MetricMini label="调用" value={`${node.call_count}`} />
              <MetricMini label="平均耗时" value={`${node.average_duration_ms ?? 0}ms`} />
              <MetricMini label="失败" value={`${node.failure_count}`} danger={node.failure_count > 0} />
            </div>
            <RuntimeSummary step={step} />
            {node.last_failure_message ? (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-xs leading-5 text-red-700">
                最近失败：{node.last_failure_message}
              </div>
            ) : null}
          </>
        ) : edge ? (
          <>
            <div>
              <p className="text-sm font-medium text-foreground">
                {edge.source} → {edge.target}
              </p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                {conditionExplanation(edge.condition)}
              </p>
            </div>
            <div className="grid gap-2 text-xs text-muted-foreground">
              <p>条件：{edge.condition ?? "always"}（{conditionText(edge.condition)}）</p>
              <p>表达式：{edge.condition_expression ?? "无"}</p>
              <p>源节点：{edge.source}</p>
              <p>目标节点：{edge.target}</p>
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">请选择一个节点或一条边查看详情。</p>
        )}
      </div>
    </div>
  );
}

function KeyList({ title, value }: { title: string; value: string[] | Record<string, unknown> | null }) {
  const keys = keyArray(value);
  return (
    <div>
      <p className="mb-2 text-xs font-medium text-foreground">{title}</p>
      <div className="flex flex-wrap gap-1.5">
        {keys.length ? (
          keys.map((key) => (
            <span key={key} className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
              {key}
            </span>
          ))
        ) : (
          <span className="text-xs text-muted-foreground">无</span>
        )}
      </div>
    </div>
  );
}

function MetricMini({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className="rounded-md border border-border bg-muted/30 p-2">
      <p className="text-muted-foreground">{label}</p>
      <p className={danger ? "mt-1 font-medium text-red-600" : "mt-1 font-medium text-foreground"}>{value}</p>
    </div>
  );
}

function RuntimeSummary({ step }: { step: AgentStepLog | null }) {
  if (!step) {
    return (
      <div className="rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
        当前选中运行未经过该节点。
      </div>
    );
  }

  return (
    <div className="rounded-md border border-border bg-muted/20 p-3 text-xs leading-5 text-muted-foreground">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="font-medium text-foreground">最近运行摘要</span>
        <span>{step.status} / {step.duration_ms ?? 0}ms</span>
      </div>
      <p className="break-words">输入：{step.input_summary ?? "无"}</p>
      <p className="mt-1 break-words">输出：{step.output_summary ?? "无"}</p>
      {step.error_message ? <p className="mt-1 text-red-600">错误：{step.error_message}</p> : null}
    </div>
  );
}

function AgentGovernanceTable({ nodes }: { nodes: AgentGraphNode[] }) {
  if (!nodes.length) {
    return null;
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-background">
      <div className="border-b border-border px-3 py-2 text-sm font-medium text-foreground">
        节点治理统计
      </div>
      <table className="w-full table-fixed border-collapse text-left text-xs">
        <thead className="bg-muted/70 text-muted-foreground">
          <tr>
            <th className="w-[22%] px-3 py-2 font-medium">节点</th>
            <th className="w-[12%] px-3 py-2 font-medium">类型</th>
            <th className="w-[18%] px-3 py-2 font-medium">调用</th>
            <th className="w-[24%] px-3 py-2 font-medium">输入</th>
            <th className="w-[24%] px-3 py-2 font-medium">输出</th>
          </tr>
        </thead>
        <tbody>
          {nodes.map((node) => (
            <tr key={node.id} className="border-t border-border align-top">
              <td className="px-3 py-2">
                <p className="font-medium text-foreground">{node.label}</p>
                <p className="mt-1 text-muted-foreground">{node.enabled ? "启用" : "停用"}</p>
              </td>
              <td className="px-3 py-2 text-muted-foreground">{node.type}</td>
              <td className="px-3 py-2 text-muted-foreground">
                <p>{node.call_count} 次</p>
                <p>平均 {node.average_duration_ms ?? 0}ms</p>
                <p className={node.failure_count ? "text-red-600" : ""}>失败 {node.failure_count}</p>
              </td>
              <td className="px-3 py-2 text-muted-foreground">{formatKeys(node.input_keys)}</td>
              <td className="px-3 py-2 text-muted-foreground">{formatKeys(node.output_keys)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DocumentRow({
  document,
  loading,
  onRetry,
  onSave,
  onDisable,
}: {
  document: PolicyDocument;
  loading: boolean;
  onRetry: () => void;
  onSave: (formData: FormData) => void;
  onDisable: () => void;
}) {
  return (
    <>
      <tr className="border-t border-border align-top">
        <td className="px-3 py-3">
          <div className="flex min-w-0 gap-2">
            <FileText className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <p className="truncate font-medium text-foreground">{document.title}</p>
              <p className="truncate text-xs text-muted-foreground">{document.file_name}</p>
              <p className="text-xs text-muted-foreground">
                {document.is_attachment ? "附件" : "主文件"}
              </p>
            </div>
          </div>
        </td>
        <td className="px-3 py-3 text-xs text-muted-foreground">
          <p>{document.policy_level}</p>
          <p>{document.policy_category}</p>
        </td>
        <td className="px-3 py-3">
          <span className={`inline-flex rounded-md border px-2 py-1 text-xs ${statusClassName[document.parse_status]}`}>
            {statusLabel[document.parse_status]}
          </span>
          {document.parse_error ? (
            <p className="mt-1 line-clamp-2 text-xs text-red-600">{document.parse_error}</p>
          ) : null}
        </td>
        <td className="px-3 py-3 text-sm text-foreground">{document.chunk_count}</td>
        <td className="px-3 py-3 text-sm text-foreground">{document.is_active ? "启用" : "已禁用"}</td>
        <td className="px-3 py-3">
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" disabled={loading} onClick={onRetry}>
              <RotateCcw className="size-3.5" />
              解析
            </Button>
            {document.is_active ? (
              <Button type="button" variant="outline" size="sm" disabled={loading} onClick={onDisable}>
                <Trash2 className="size-3.5" />
                禁用
              </Button>
            ) : null}
          </div>
        </td>
      </tr>
      <tr className="border-t border-border bg-muted/20">
        <td colSpan={6} className="px-3 py-3">
          <details>
            <summary className="cursor-pointer text-sm font-medium text-foreground">编辑 metadata</summary>
            <form
              className="mt-3 grid gap-3 md:grid-cols-4"
              onSubmit={(event) => {
                event.preventDefault();
                onSave(new FormData(event.currentTarget));
              }}
            >
              <Field name="title" label="标题" defaultValue={document.title} required />
              <Field name="policy_level" label="层级" defaultValue={document.policy_level} required />
              <Field name="policy_category" label="类别" defaultValue={document.policy_category} required />
              <Field name="issuing_department" label="发布部门" defaultValue={document.issuing_department ?? ""} />
              <Field name="applicable_scope" label="适用范围" defaultValue={document.applicable_scope ?? ""} />
              <Field name="college" label="学院" defaultValue={document.college ?? ""} />
              <Field name="version" label="版本" defaultValue={document.version ?? ""} />
              <Field name="publish_date" label="发布时间" type="date" defaultValue={document.publish_date ?? ""} />
              <Field name="effective_from" label="生效时间" type="date" defaultValue={document.effective_from ?? ""} />
              <Field name="effective_to" label="失效时间" type="date" defaultValue={document.effective_to ?? ""} />
              <label className="flex items-end gap-2 pb-2 text-sm text-foreground">
                <input name="is_active" type="checkbox" defaultChecked={document.is_active} className="size-4" />
                <span>启用</span>
              </label>
              <div className="flex items-end">
                <Button type="submit" disabled={loading}>
                  <Save className="size-4" />
                  保存
                </Button>
              </div>
            </form>
          </details>
        </td>
      </tr>
    </>
  );
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <p className="text-2xl font-semibold text-foreground">{value}</p>
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

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { label: string; value: string }[];
}) {
  return (
    <label className="block space-y-2 text-sm font-medium text-foreground">
      <span>{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function formObject(formData: FormData) {
  return {
    title: emptyToNull(formData.get("title")),
    policy_level: emptyToNull(formData.get("policy_level")),
    policy_category: emptyToNull(formData.get("policy_category")),
    issuing_department: emptyToNull(formData.get("issuing_department")),
    applicable_scope: emptyToNull(formData.get("applicable_scope")),
    college: emptyToNull(formData.get("college")),
    version: emptyToNull(formData.get("version")),
    publish_date: emptyToNull(formData.get("publish_date")),
    effective_from: emptyToNull(formData.get("effective_from")),
    effective_to: emptyToNull(formData.get("effective_to")),
    is_active: formData.get("is_active") === "on",
  };
}

function emptyToNull(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text ? text : null;
}

function formatKeys(value: string[] | Record<string, unknown> | null) {
  return keyArray(value).join("、") || "无";
}

function keyArray(value: string[] | Record<string, unknown> | null) {
  if (!value) {
    return [];
  }
  return Array.isArray(value) ? value : Object.keys(value);
}

function countKeys(value: string[] | Record<string, unknown> | null) {
  return keyArray(value).length;
}

function edgeKey(edge: AgentGraphEdge, index: number) {
  return `${edge.source}-${edge.target}-${edge.condition ?? "always"}-${index}`;
}

function edgesForLayer(edges: AgentGraphEdge[], nodeIds: string[], layerIndex: number) {
  return edges
    .map((edge, index) => ({ edge, index }))
    .filter(({ edge }) => nodeIds.includes(edge.source) || (layerIndex === 0 && edge.source === "start"));
}

function conditionText(condition: string | null) {
  return conditionLabels[condition ?? "always"] ?? condition ?? "固定流转";
}

function conditionExplanation(condition: string | null) {
  const key = condition ?? "always";
  const descriptions: Record<string, string> = {
    always: "该边为固定流转，源节点执行成功后直接进入目标节点。",
    missing_slots: "当 SlotAgent 发现必要条件缺失时，EvidenceAgent 后进入 FollowupAgent 生成追问。",
    eligibility_check: "当用户意图是资格判断，且关键条件足够时，进入 EligibilityAgent 做资格初判。",
    workflow_or_material: "当用户需要办理流程或材料清单时，进入 WorkflowAgent 抽取材料和步骤。",
    policy_qa_or_general: "普通政策问答或一般咨询会跳过资格/流程分支，直接进入风险校验。",
  };
  return descriptions[key] ?? "该条件由 LangGraph 路由规则控制。";
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
