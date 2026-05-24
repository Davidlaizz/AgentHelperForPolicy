"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent, ReactNode } from "react";
import {
  BarChart3,
  BookOpenCheck,
  Activity,
  Cpu,
  Database,
  FileText,
  GitBranch,
  KeyRound,
  MessageSquareText,
  Pencil,
  RefreshCw,
  RotateCcw,
  Save,
  ShieldAlert,
  SlidersHorizontal,
  Trash2,
  Upload,
  Workflow,
  ZoomIn,
  ZoomOut,
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

type SystemConfig = {
  model_service: {
    provider: string;
    model: string;
    api_url: string | null;
    api_key_status: string;
    api_key_masked: string | null;
    max_tokens: number | null;
    timeout_seconds: number;
    thinking_type: string | null;
    compatible_protocol: string;
    editable_fields: string[];
    available_presets: {
      id: string;
      label: string;
      provider: string;
      model: string;
      api_url: string | null;
      description: string;
      keep_current_api_key: boolean;
    }[];
  };
  rag_service: {
    embedding_provider: string;
    embedding_model: string;
    embedding_dimensions: number;
    embedding_api_url: string | null;
    embedding_api_key_status: string;
    embedding_api_key_masked: string | null;
    vector_schema: string;
    vector_table: string;
    editable_fields: string[];
  };
  agent_governance: {
    graph_version: string;
    node_count: number;
    edge_count: number;
    orchestration_framework: string;
    editable_items: string[];
    runtime_observability: boolean;
  };
  edit_mode: string;
  edit_note: string;
  updated_at: string;
};

type GraphSelection =
  | { kind: "node"; id: string }
  | { kind: "edge"; id: string }
  | null;

type AdminTab = "overview" | "knowledge" | "operations" | "agents" | "settings";
type DocumentStatusFilter = "all" | "active" | "inactive";

const DOCUMENT_PAGE_SIZE = 10;
const AGENT_SPLIT_STORAGE_KEY = "zhicetong.admin.agentGraphSplitRatio";
const AGENT_SPLIT_DEFAULT_RATIO = 0.72;
const AGENT_SPLIT_MIN_RATIO = 0.55;
const AGENT_SPLIT_MAX_RATIO = 0.82;
const AGENT_SPLIT_HANDLE_WIDTH = 10;
const AGENT_SPLIT_GRAPH_MIN_WIDTH = 260;
const AGENT_SPLIT_DETAIL_MIN_WIDTH = 200;
const RUNTIME_SUMMARY_PREVIEW_LENGTH = 120;

const adminTabs: { id: AdminTab; label: string; description: string }[] = [
  { id: "overview", label: "总览工作台", description: "指标、状态和关键入口" },
  { id: "knowledge", label: "政策知识库", description: "文件、解析、metadata" },
  { id: "operations", label: "问答运营", description: "热门问题和标准答案" },
  { id: "agents", label: "Agent 治理", description: "编排图、运行轨迹、节点治理" },
  { id: "settings", label: "系统配置", description: "模型、检索和治理配置" },
];

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

const conditionLabels: Record<string, string> = {
  always: "固定流转",
  missing_slots: "存在缺失条件",
  eligibility_check: "资格判断",
  workflow_or_material: "流程或材料",
  policy_qa_or_general: "普通问答",
};

const graphCanvas = { width: 1320, height: 620 };
const graphZoom = { min: 0.6, max: 1.6, step: 0.1, default: 0.6 };

const graphNodePositions: Record<string, { x: number; y: number; width: number; height: number; layer: string }> = {
  start: { x: 58, y: 258, width: 74, height: 42, layer: "入口" },
  memory_read: { x: 162, y: 240, width: 146, height: 78, layer: "记忆" },
  intent: { x: 352, y: 240, width: 146, height: 78, layer: "理解" },
  case: { x: 542, y: 240, width: 146, height: 78, layer: "理解" },
  slot: { x: 732, y: 240, width: 146, height: 78, layer: "理解" },
  retrieval: { x: 922, y: 240, width: 146, height: 78, layer: "知识" },
  evidence: { x: 1112, y: 240, width: 146, height: 78, layer: "知识" },
  followup: { x: 1112, y: 96, width: 146, height: 78, layer: "分支" },
  eligibility: { x: 732, y: 468, width: 146, height: 78, layer: "分支" },
  workflow: { x: 922, y: 468, width: 146, height: 78, layer: "分支" },
  risk: { x: 1112, y: 468, width: 146, height: 78, layer: "治理" },
  answer: { x: 542, y: 468, width: 146, height: 78, layer: "生成" },
  memory_write: { x: 352, y: 468, width: 146, height: 78, layer: "记忆" },
  end: { x: 202, y: 486, width: 74, height: 42, layer: "结束" },
};

const graphEdgeLabelPoints: Record<string, { x: number; y: number }> = {
  "evidence->followup": { x: 1240, y: 204 },
  "evidence->eligibility": { x: 888, y: 402 },
  "evidence->workflow": { x: 1030, y: 382 },
  "evidence->risk": { x: 1240, y: 438 },
  "followup->risk": { x: 1262, y: 326 },
  "eligibility->workflow": { x: 900, y: 452 },
  "workflow->risk": { x: 1090, y: 452 },
  "risk->answer": { x: 900, y: 584 },
  "answer->memory_write": { x: 520, y: 488 },
  "memory_write->end": { x: 324, y: 488 },
};

const graphEdgeBusinessLabels: Record<string, string> = {
  "followup->risk": "追问校验",
  "eligibility->workflow": "补齐流程",
  "workflow->risk": "流程校验",
  "risk->answer": "可信生成",
};

const graphEdgeRoutes: Record<string, [number, number][]> = {
  "evidence->followup": [
    [1185, 240],
    [1185, 194],
    [1185, 174],
  ],
  "evidence->eligibility": [
    [1176, 318],
    [1176, 414],
    [805, 414],
    [805, 468],
  ],
  "evidence->workflow": [
    [1152, 318],
    [1152, 398],
    [995, 398],
    [995, 468],
  ],
  "evidence->risk": [
    [1202, 318],
    [1202, 412],
    [1202, 468],
  ],
  "followup->risk": [
    [1258, 135],
    [1294, 135],
    [1294, 507],
    [1258, 507],
  ],
  "workflow->risk": [
    [1068, 507],
    [1112, 507],
  ],
  "risk->answer": [
    [1185, 546],
    [1185, 584],
    [615, 584],
    [615, 546],
  ],
};

const reactLoopEdges = [
  {
    id: "followup-slot-loop",
    label: "用户补充后重入",
    points: [
      [1112, 135],
      [805, 135],
      [805, 240],
    ] as [number, number][],
    labelPoint: { x: 958, y: 124 },
  },
  {
    id: "memory-feedback-loop",
    label: "记忆反馈/下一轮",
    points: [
      [352, 507],
      [118, 507],
      [118, 356],
      [235, 356],
      [235, 318],
    ] as [number, number][],
    labelPoint: { x: 174, y: 376 },
  },
];

const agentDisplayNames: Record<string, string> = {
  memory_read: "记忆读取",
  intent: "意图识别",
  case: "事项识别",
  slot: "槽位抽取",
  retrieval: "RAG 检索",
  evidence: "证据整理",
  followup: "缺口追问",
  eligibility: "资格判断",
  workflow: "流程材料",
  risk: "风险校验",
  answer: "答案生成",
  memory_write: "记忆写入",
};

export default function AdminPage() {
  const [documents, setDocuments] = useState<PolicyDocument[]>([]);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [hotQuestions, setHotQuestions] = useState<HotQuestion[]>([]);
  const [standardAnswers, setStandardAnswers] = useState<StandardAnswer[]>([]);
  const [agentGraph, setAgentGraph] = useState<AgentGraph | null>(null);
  const [agentRuns, setAgentRuns] = useState<AgentRun[]>([]);
  const [agentRunDetail, setAgentRunDetail] = useState<AgentRunDetail | null>(null);
  const [systemConfig, setSystemConfig] = useState<SystemConfig | null>(null);
  const [configEditOpen, setConfigEditOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentRole, setDocumentRole] = useState<"main" | "attachment">("main");
  const [parentDocumentId, setParentDocumentId] = useState("");
  const [autoParse, setAutoParse] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [activeAdminTab, setActiveAdminTab] = useState<AdminTab>("overview");
  const [documentStatusFilter, setDocumentStatusFilter] = useState<DocumentStatusFilter>("all");
  const [documentPage, setDocumentPage] = useState(1);
  const [editingDocumentId, setEditingDocumentId] = useState<string | null>(null);
  const [graphSelection, setGraphSelection] = useState<GraphSelection>({ kind: "node", id: "memory_read" });

  const mainDocuments = useMemo(
    () => documents.filter((document) => !document.is_attachment && document.is_active),
    [documents],
  );
  const filteredDocuments = useMemo(() => {
    if (documentStatusFilter === "active") {
      return documents.filter((document) => document.is_active);
    }
    if (documentStatusFilter === "inactive") {
      return documents.filter((document) => !document.is_active);
    }
    return documents;
  }, [documentStatusFilter, documents]);
  const activeDocumentCount = useMemo(
    () => documents.filter((document) => document.is_active).length,
    [documents],
  );
  const inactiveDocumentCount = documents.length - activeDocumentCount;
  const documentTotalPages = Math.max(1, Math.ceil(filteredDocuments.length / DOCUMENT_PAGE_SIZE));
  const normalizedDocumentPage = Math.min(documentPage, documentTotalPages);
  const paginatedDocuments = useMemo(() => {
    const start = (normalizedDocumentPage - 1) * DOCUMENT_PAGE_SIZE;
    return filteredDocuments.slice(start, start + DOCUMENT_PAGE_SIZE);
  }, [filteredDocuments, normalizedDocumentPage]);
  const documentPageStart = filteredDocuments.length === 0 ? 0 : (normalizedDocumentPage - 1) * DOCUMENT_PAGE_SIZE + 1;
  const documentPageEnd = Math.min(normalizedDocumentPage * DOCUMENT_PAGE_SIZE, filteredDocuments.length);
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
    const [
      documentResponse,
      dashboardResponse,
      hotResponse,
      answerResponse,
      agentGraphResponse,
      agentRunsResponse,
      systemConfigResponse,
    ] = await Promise.all([
        fetch(`${apiBaseUrl}/api/documents`, { cache: "no-store" }),
        fetch(`${apiBaseUrl}/api/management/dashboard`, { cache: "no-store" }),
        fetch(`${apiBaseUrl}/api/management/hot-questions?limit=8`, { cache: "no-store" }),
        fetch(`${apiBaseUrl}/api/management/standard-answers`, { cache: "no-store" }),
        fetch(`${apiBaseUrl}/api/management/agent-graph`, { cache: "no-store" }),
        fetch(`${apiBaseUrl}/api/management/agent-runs?limit=8`, { cache: "no-store" }),
        fetch(`${apiBaseUrl}/api/management/system-config`, { cache: "no-store" }),
      ]);

    if (!documentResponse.ok) throw new Error("文件列表加载失败");
    if (!dashboardResponse.ok) throw new Error("看板指标加载失败");
    if (!hotResponse.ok) throw new Error("热门问题加载失败");
    if (!answerResponse.ok) throw new Error("标准答案加载失败");
    if (!agentGraphResponse.ok) throw new Error("Agent 架构加载失败");
    if (!agentRunsResponse.ok) throw new Error("Agent 运行记录加载失败");

    if (!systemConfigResponse.ok) throw new Error("系统配置加载失败");

    setDocuments(await documentResponse.json());
    setDashboard(await dashboardResponse.json());
    setHotQuestions(await hotResponse.json());
    setStandardAnswers(await answerResponse.json());
    setAgentGraph(await agentGraphResponse.json());
    setSystemConfig(await systemConfigResponse.json());
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

  async function enableDocument(document: PolicyDocument) {
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch(`${apiBaseUrl}/api/documents/${document.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: true }),
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.detail ?? "启用失败");
      }
      setMessage(`已启用：${body.title}`);
      await loadAll();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "启用失败");
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
      <SectionCard title="管理后台" description="政策智能服务运营与治理中心。">
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <Metric icon={<FileText className="size-4" />} label="政策文件" value={dashboard?.document_count ?? 0} />
          <Metric icon={<BookOpenCheck className="size-4" />} label="已解析" value={dashboard?.parsed_document_count ?? 0} />
          <Metric icon={<BarChart3 className="size-4" />} label="知识切片" value={dashboard?.chunk_count ?? 0} />
          <Metric icon={<MessageSquareText className="size-4" />} label="今日问答" value={dashboard?.today_question_count ?? 0} />
          <Metric icon={<ShieldAlert className="size-4" />} label="需人工复核" value={dashboard?.high_risk_answer_count ?? 0} />
          <Metric icon={<BookOpenCheck className="size-4" />} label="标准答案" value={dashboard?.standard_answer_count ?? 0} />
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button type="button" variant="outline" disabled={loading} onClick={() => loadAll()}>
            <RefreshCw className="size-4" />
            刷新后台数据
          </Button>
          {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
        </div>
        <div className="mt-5 grid gap-2 rounded-xl border border-border bg-muted/20 p-2 md:grid-cols-5">
          {adminTabs.map((tab) => {
            const active = activeAdminTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                className={
                  active
                    ? "rounded-lg border border-primary bg-background px-3 py-2 text-left shadow-sm"
                    : "rounded-lg border border-transparent px-3 py-2 text-left hover:border-border hover:bg-background"
                }
                onClick={() => setActiveAdminTab(tab.id)}
              >
                <span className={active ? "block text-sm font-medium text-primary" : "block text-sm font-medium text-foreground"}>
                  {tab.label}
                </span>
                <span className="mt-1 block text-xs text-muted-foreground">{tab.description}</span>
              </button>
            );
          })}
        </div>
      </SectionCard>

      {activeAdminTab === "overview" ? (
        <div className="grid gap-6 xl:grid-cols-3">
          <SectionCard title="知识库概况" description="政策文件解析、索引和可检索资产状态。">
            <div className="grid gap-3">
              <Metric icon={<FileText className="size-4" />} label="有效文件" value={dashboard?.active_document_count ?? 0} />
              <Metric icon={<BookOpenCheck className="size-4" />} label="已解析文件" value={dashboard?.parsed_document_count ?? 0} />
              <Metric icon={<BarChart3 className="size-4" />} label="知识切片" value={dashboard?.chunk_count ?? 0} />
            </div>
          </SectionCard>
          <SectionCard title="问答运营" description="高频咨询、人工标准答案和风险复核入口。">
            <div className="grid gap-3">
              <Metric icon={<MessageSquareText className="size-4" />} label="今日问答" value={dashboard?.today_question_count ?? 0} />
              <Metric icon={<BarChart3 className="size-4" />} label="热门问题" value={dashboard?.hot_question_count ?? 0} />
              <Metric icon={<BookOpenCheck className="size-4" />} label="标准答案" value={dashboard?.standard_answer_count ?? 0} />
            </div>
          </SectionCard>
          <SectionCard title="Agent 治理" description="多 Agent 架构、运行轨迹和风险状态。">
            <div className="grid gap-3">
              <Metric icon={<Workflow className="size-4" />} label="Agent 节点" value={agentGraph?.nodes.length ?? 0} />
              <Metric icon={<GitBranch className="size-4" />} label="路由边" value={agentGraph?.edges.length ?? 0} />
              <Metric icon={<ShieldAlert className="size-4" />} label="复核预警" value={dashboard?.high_risk_answer_count ?? 0} />
            </div>
          </SectionCard>
        </div>
      ) : null}

      {activeAdminTab === "agents" ? (
      <SectionCard title="Agent 架构与运行轨迹" description="展示 LangGraph 多 Agent 编排节点、条件路由和最近运行状态。">
        <div className="mb-4 grid gap-3 md:grid-cols-3">
          <Metric icon={<Workflow className="size-4" />} label="Agent 节点" value={agentGraph?.nodes.length ?? 0} />
          <Metric icon={<GitBranch className="size-4" />} label="路由边" value={agentGraph?.edges.length ?? 0} />
          <Metric icon={<Activity className="size-4" />} label="最近运行" value={agentRuns.length} />
        </div>

        <div className="space-y-5">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{agentGraph?.version ?? "未加载"}</span>
              <span>{agentGraph?.description ?? "暂无 Agent 编排信息"}</span>
            </div>
            <ResizableAgentSplit
              left={
              <AgentFlowDiagram
                graph={agentGraph}
                selectedSteps={agentRunDetail?.steps ?? []}
                selection={graphSelection}
                onSelect={setGraphSelection}
              />
              }
              right={
              <GraphSelectionPanel
                node={selectedNode}
                edge={selectedEdge}
                step={selectedStep}
              />
              }
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
            <RunObservabilityPanel
              runs={agentRuns}
              detail={agentRunDetail}
              loading={loading}
              onSelectRun={loadAgentRunDetail}
            />
            <AgentGovernanceTable nodes={agentGraph?.nodes ?? []} />
          </div>
        </div>
      </SectionCard>
      ) : null}

      {activeAdminTab === "knowledge" ? (
        <>
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
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm font-medium text-foreground">
              <span>状态筛选</span>
              <select
                value={documentStatusFilter}
                onChange={(event) => {
                  setDocumentStatusFilter(event.target.value as DocumentStatusFilter);
                  setDocumentPage(1);
                }}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="all">全部（{documents.length}）</option>
                <option value="active">启用（{activeDocumentCount}）</option>
                <option value="inactive">禁用（{inactiveDocumentCount}）</option>
              </select>
            </label>
            <span className="text-xs text-muted-foreground">每页最多 {DOCUMENT_PAGE_SIZE} 个文件</span>
          </div>
          <p className="text-xs text-muted-foreground">
            {filteredDocuments.length === 0
              ? "当前筛选下暂无文件"
              : `显示 ${documentPageStart}-${documentPageEnd} / 共 ${filteredDocuments.length} 个文件`}
          </p>
        </div>
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
              {paginatedDocuments.map((document) => (
                <DocumentRow
                  key={document.id}
                  document={document}
                  loading={loading}
                  isEditing={editingDocumentId === document.id}
                  onToggleEdit={() =>
                    setEditingDocumentId((current) => (current === document.id ? null : document.id))
                  }
                  onRetry={() => retryParse(document.id)}
                  onSave={(formData) => saveDocumentMetadata(document, formData)}
                  onDisable={() => disableDocument(document)}
                  onEnable={() => enableDocument(document)}
                />
              ))}
              {filteredDocuments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-sm text-muted-foreground">
                    暂无政策文件
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        {filteredDocuments.length > 0 ? (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              第 {normalizedDocumentPage} / {documentTotalPages} 页
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={normalizedDocumentPage <= 1}
                onClick={() => setDocumentPage(Math.max(1, normalizedDocumentPage - 1))}
              >
                上一页
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={normalizedDocumentPage >= documentTotalPages}
                onClick={() => setDocumentPage(Math.min(documentTotalPages, normalizedDocumentPage + 1))}
              >
                下一页
              </Button>
            </div>
          </div>
        ) : null}
      </SectionCard>
        </>
      ) : null}

      {activeAdminTab === "operations" ? (
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
      ) : null}

      {activeAdminTab === "settings" ? (
        <SystemConfigPanel
          config={systemConfig}
          editOpen={configEditOpen}
          onToggleEdit={() => setConfigEditOpen((current) => !current)}
          onConfigSaved={setSystemConfig}
        />
      ) : null}
    </div>
  );
}

function SystemConfigPanel({
  config,
  editOpen,
  onToggleEdit,
  onConfigSaved,
}: {
  config: SystemConfig | null;
  editOpen: boolean;
  onToggleEdit: () => void;
  onConfigSaved: (config: SystemConfig) => void;
}) {
  const model = config?.model_service;
  const rag = config?.rag_service;
  const governance = config?.agent_governance;
  const [savingConfig, setSavingConfig] = useState(false);
  const [configMessage, setConfigMessage] = useState("");

  async function saveModelConfig(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setSavingConfig(true);
    setConfigMessage("");
    try {
      const response = await fetch(`${apiBaseUrl}/api/management/system-config/model-service`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: String(formData.get("provider") ?? "").trim(),
          model: String(formData.get("model") ?? "").trim(),
          api_url: String(formData.get("api_url") ?? "").trim(),
          api_key: String(formData.get("api_key") ?? "").trim() || null,
          max_tokens: numberFromForm(formData.get("max_tokens")),
          timeout_seconds: numberFromForm(formData.get("timeout_seconds")),
          thinking_type: String(formData.get("thinking_type") ?? "").trim() || null,
        }),
      });
      if (!response.ok) {
        throw new Error(await readErrorMessage(response, "模型配置热更新失败"));
      }
      const nextConfig: SystemConfig = await response.json();
      onConfigSaved(nextConfig);
      setConfigMessage("模型配置已热更新，新问答请求会立即使用当前配置。");
    } catch (error) {
      setConfigMessage(error instanceof Error ? error.message : "模型配置热更新失败");
    } finally {
      setSavingConfig(false);
    }
  }

  async function applyPreset(presetId: string) {
    setSavingConfig(true);
    setConfigMessage("");
    try {
      const response = await fetch(`${apiBaseUrl}/api/management/system-config/model-service`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preset_id: presetId }),
      });
      if (!response.ok) {
        throw new Error(await readErrorMessage(response, "模型预设切换失败"));
      }
      const nextConfig: SystemConfig = await response.json();
      onConfigSaved(nextConfig);
      setConfigMessage(`已切换到 ${nextConfig.model_service.model}，新请求立即生效。`);
    } catch (error) {
      setConfigMessage(error instanceof Error ? error.message : "模型预设切换失败");
    } finally {
      setSavingConfig(false);
    }
  }

  return (
    <SectionCard
      title="系统配置"
      description="集中展示当前后端实际生效的模型、RAG 和 Agent 编排配置，并预留配置中心编辑入口。"
    >
      <div className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
        <div className="rounded-lg border border-indigo-100 bg-indigo-50/40 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-indigo-600 p-2 text-white">
                <Cpu className="size-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-indigo-950">模型服务</p>
                <p className="mt-1 text-2xl font-semibold tracking-tight text-indigo-950">
                  {model?.model ?? "加载中"}
                </p>
                <p className="mt-1 text-xs text-indigo-700">
                  {model?.provider ?? "--"} · {model?.compatible_protocol ?? "OpenAI-compatible"}
                </p>
              </div>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={onToggleEdit}>
              <SlidersHorizontal className="size-4" />
              {editOpen ? "收起编辑" : "编辑配置"}
            </Button>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <ConfigItem label="API 地址" value={model?.api_url ?? "未配置"} />
            <ConfigItem
              label="API Key"
              value={secretStatusLabel(model?.api_key_status, model?.api_key_masked)}
              icon={<KeyRound className="size-4" />}
            />
            <ConfigItem label="最大输出" value={model?.max_tokens ? `${model.max_tokens} tokens` : "未限制"} />
            <ConfigItem label="超时时间" value={model ? `${model.timeout_seconds}s` : "--"} />
            <ConfigItem label="思考模式" value={model?.thinking_type ?? "未配置"} />
            <ConfigItem label="更新时间" value={config ? formatDateTime(config.updated_at) : "--"} />
          </div>

          {editOpen ? (
            <form
              key={`${model?.provider}-${model?.model}-${model?.api_url}`}
              onSubmit={saveModelConfig}
              className="mt-4 rounded-lg border border-indigo-100 bg-background p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-foreground">热更新配置</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    保存后立即写入当前后端进程，新问答请求会直接使用新模型；API Key 留空表示沿用原密钥。
                  </p>
                </div>
                <span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs text-amber-700">
                  {config?.edit_mode ?? "runtime_readonly"}
                </span>
              </div>
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {(model?.available_presets ?? []).map((preset) => {
                  const active = model?.provider === preset.provider && model?.model === preset.model;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      disabled={savingConfig}
                      onClick={() => applyPreset(preset.id)}
                      className={`rounded-lg border p-3 text-left transition ${
                        active
                          ? "border-indigo-300 bg-indigo-50 text-indigo-950"
                          : "border-border bg-muted/30 hover:border-indigo-200 hover:bg-indigo-50/60"
                      }`}
                    >
                      <span className="text-sm font-medium">{preset.label}</span>
                      <span className="mt-1 block text-xs text-muted-foreground">{preset.description}</span>
                    </button>
                  );
                })}
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <ConfigDraftField name="provider" label="LLM_PROVIDER" defaultValue={model?.provider} />
                <ConfigDraftField name="model" label="LLM_MODEL" defaultValue={model?.model} />
                <ConfigDraftField name="api_url" label="LLM_API_URL" defaultValue={model?.api_url} />
                <ConfigDraftField
                  name="api_key"
                  label="LLM_API_KEY"
                  placeholder="留空则不修改当前密钥"
                  type="password"
                />
                <ConfigDraftField name="max_tokens" label="LLM_MAX_TOKENS" defaultValue={model?.max_tokens?.toString()} type="number" />
                <ConfigDraftField name="timeout_seconds" label="LLM_TIMEOUT_SECONDS" defaultValue={model?.timeout_seconds?.toString()} type="number" />
                <ConfigDraftField name="thinking_type" label="LLM_THINKING_TYPE" defaultValue={model?.thinking_type} />
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs leading-5 text-muted-foreground">{config?.edit_note}</p>
                <Button type="submit" variant="outline" size="sm" disabled={savingConfig}>
                  <Save className="size-4" />
                  保存并热更新
                </Button>
              </div>
              {configMessage ? (
                <p className="mt-3 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">{configMessage}</p>
              ) : null}
            </form>
          ) : null}
        </div>

        <div className="grid gap-4">
          <div className="rounded-lg border border-border bg-background p-4">
            <div className="flex items-center gap-2">
              <Database className="size-4 text-emerald-600" />
              <p className="text-sm font-medium text-foreground">RAG 检索</p>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
              <ConfigItem label="Embedding 模型" value={rag?.embedding_model ?? "加载中"} />
              <ConfigItem label="向量维度" value={rag ? `${rag.embedding_dimensions}` : "--"} />
              <ConfigItem label="向量表" value={rag ? `${rag.vector_schema}.${rag.vector_table}` : "--"} />
              <ConfigItem label="Embedding Key" value={secretStatusLabel(rag?.embedding_api_key_status, rag?.embedding_api_key_masked)} />
            </div>
          </div>

          <div className="rounded-lg border border-border bg-background p-4">
            <div className="flex items-center gap-2">
              <GitBranch className="size-4 text-sky-600" />
              <p className="text-sm font-medium text-foreground">Agent 治理</p>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
              <ConfigItem label="编排框架" value={governance?.orchestration_framework ?? "加载中"} />
              <ConfigItem label="图版本" value={governance?.graph_version ?? "--"} />
              <ConfigItem
                label="节点/边"
                value={governance ? `${governance.node_count} 个节点 / ${governance.edge_count} 条边` : "--"}
              />
              <ConfigItem label="观测能力" value={governance?.runtime_observability ? "已开启" : "未开启"} />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {(governance?.editable_items ?? []).map((item) => (
                <span key={item} className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </SectionCard>
  );
}

function ConfigItem({ label, value, icon }: { label: string; value: string; icon?: ReactNode }) {
  return (
    <div className="min-w-0 rounded-md border border-border bg-background/80 p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <p className="mt-1 break-words text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}

function ConfigDraftField({
  name,
  label,
  defaultValue,
  placeholder,
  type = "text",
}: {
  name: string;
  label: string;
  defaultValue?: string | null;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="block space-y-1 text-xs font-medium text-muted-foreground">
      <span>{label}</span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
      />
    </label>
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
  const [zoom, setZoom] = useState(graphZoom.default);
  const executed = new Set((graph?.nodes ?? []).map((node) => node.id));
  const failed = new Set(selectedSteps.filter((step) => step.status === "failed").map((step) => step.node_key));
  const zoomPercent = Math.round(zoom * 100);

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
          <p className="text-sm font-medium text-foreground">多 Agent 编排图</p>
          <p className="text-xs text-muted-foreground">
            实线为当前 LangGraph 路由，虚线为跨轮次 ReAct 反馈闭环。
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1 rounded-lg border border-border bg-background p-1">
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              title="缩小"
              onClick={() => setZoom((current) => clampGraphZoom(current - graphZoom.step))}
            >
              <ZoomOut />
            </Button>
            <button
              type="button"
              className="min-w-12 rounded-md px-2 py-1 text-xs font-medium text-foreground hover:bg-muted"
              title="重置缩放"
              onClick={() => setZoom(graphZoom.default)}
            >
              {zoomPercent}%
            </button>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              title="放大"
              onClick={() => setZoom((current) => clampGraphZoom(current + graphZoom.step))}
            >
              <ZoomIn />
            </Button>
          </div>
          <span className="rounded-md bg-emerald-50 px-2 py-1 text-emerald-700">已执行</span>
          <span className="rounded-md bg-red-50 px-2 py-1 text-red-700">失败</span>
          <span className="rounded-md bg-muted px-2 py-1">未命中</span>
        </div>
      </div>
      <div
        className="h-[560px] overflow-auto rounded-lg border border-border bg-muted/20"
        onWheel={(event) => {
          event.preventDefault();
          setZoom((current) => clampGraphZoom(current + (event.deltaY < 0 ? graphZoom.step : -graphZoom.step)));
        }}
      >
        <svg
          viewBox={`0 0 ${graphCanvas.width} ${graphCanvas.height}`}
          className="block"
          style={{ width: graphCanvas.width * zoom, height: graphCanvas.height * zoom }}
        >
          <defs>
            <marker
              id="agent-arrow"
              markerHeight="8"
              markerWidth="8"
              orient="auto"
              refX="7"
              refY="4"
            >
              <path d="M0,0 L8,4 L0,8 Z" fill="currentColor" />
            </marker>
            <marker
              id="react-loop-arrow"
              markerHeight="8"
              markerWidth="8"
              orient="auto"
              refX="7"
              refY="4"
            >
              <path d="M0,0 L8,4 L0,8 Z" fill="currentColor" />
            </marker>
          </defs>

          <g>
            <rect
              x="150"
              y="42"
              width="458"
              height="38"
              rx="10"
              className="fill-background/85 stroke-border"
            />
            <text x="166" y="66" className="fill-muted-foreground text-[13px] font-medium">
              ReAct 闭环：Observe 观察 → Reason 推理 → Act 行动 → Memory 反馈
            </text>
          </g>

          {Object.entries(layerBands()).map(([name, band]) => (
            <g key={name}>
              <rect
                x={band.x}
                y={band.y}
                width={band.width}
                height={band.height}
                rx="16"
                className="fill-background/70 stroke-border"
              />
              <text x={band.x + 14} y={band.y + 24} className="fill-muted-foreground text-[13px] font-medium">
                {name}
              </text>
            </g>
          ))}

          {reactLoopEdges.map((edge) => (
            <g key={edge.id}>
              <path
                d={linePath(edge.points)}
                className="fill-none stroke-sky-500/70"
                strokeDasharray="8 7"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                markerEnd="url(#react-loop-arrow)"
              />
              <rect
                x={edge.labelPoint.x - 52}
                y={edge.labelPoint.y - 12}
                width="104"
                height="24"
                rx="6"
                className="fill-sky-50 stroke-sky-200"
              />
              <text
                x={edge.labelPoint.x}
                y={edge.labelPoint.y + 4}
                textAnchor="middle"
                className="fill-sky-700 text-[11px]"
              >
                {edge.label}
              </text>
            </g>
          ))}

          {graph.edges.map((edge, index) => {
            const key = edgeKey(edge, index);
            const path = edgePath(edge);
            const label = edgeLabelPoint(edge);
            const customLabel = graphEdgeBusinessLabels[edgeRouteKey(edge)];
            const text = customLabel ?? conditionText(edge.condition);
            const showLabel = Boolean(customLabel || (edge.condition && edge.condition !== "always"));
            const labelWidth = Math.max(72, text.length * 13 + 22);
            const active = selection?.kind === "edge" && selection.id === key;
            return (
              <g key={key}>
                <path
                  d={path}
                  className={active ? "fill-none stroke-primary" : "fill-none stroke-muted-foreground/50"}
                  strokeWidth="2"
                  markerEnd="url(#agent-arrow)"
                />
                <path
                  d={path}
                  className="cursor-pointer fill-none stroke-transparent"
                  strokeWidth="16"
                  onClick={() => onSelect({ kind: "edge", id: key })}
                />
                {showLabel ? (
                  <g
                    className="cursor-pointer"
                    onClick={() => onSelect({ kind: "edge", id: key })}
                  >
                    <rect
                      x={label.x - labelWidth / 2}
                      y={label.y - 12}
                      width={labelWidth}
                      height="24"
                      rx="6"
                      className={active ? "fill-primary" : "fill-background stroke-border"}
                    />
                    <text
                      x={label.x}
                      y={label.y + 4}
                      textAnchor="middle"
                      className={active ? "fill-primary-foreground text-[11px]" : "fill-muted-foreground text-[11px]"}
                    >
                      {text}
                    </text>
                  </g>
                ) : null}
              </g>
            );
          })}

          <EndpointNode id="start" label="Start" />
          {(graph.nodes ?? []).map((node) => (
            <SvgAgentNode
              key={node.id}
              node={node}
              active={selection?.kind === "node" && selection.id === node.id}
              executed={executed.has(node.id)}
              failed={failed.has(node.id)}
              onClick={() => onSelect({ kind: "node", id: node.id })}
            />
          ))}
          <EndpointNode id="end" label="End" />
        </svg>
      </div>
    </div>
  );
}

function SvgAgentNode({
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
  const box = graphNodePositions[node.id];
  if (!box) {
    return null;
  }
  const fillClass = failed ? "fill-red-50" : executed ? "fill-emerald-50" : "fill-background";
  const strokeClass = active
    ? "stroke-primary"
    : failed
      ? "stroke-red-300"
      : executed
        ? "stroke-emerald-300"
        : "stroke-border";
  const displayName = agentDisplayNames[node.id] ?? node.label;

  return (
    <g className="cursor-pointer" onClick={onClick}>
      <rect
        x={box.x}
        y={box.y}
        width={box.width}
        height={box.height}
        rx="12"
        className={`${fillClass} ${strokeClass}`}
        strokeWidth={active ? 3 : 1.5}
      />
      <text
        x={box.x + box.width / 2}
        y={box.y + box.height / 2 - 5}
        textAnchor="middle"
        className="fill-foreground text-[15px] font-semibold"
      >
        {displayName}
      </text>
      <text
        x={box.x + box.width / 2}
        y={box.y + box.height / 2 + 17}
        textAnchor="middle"
        className="fill-muted-foreground text-[12px] font-medium"
      >
        {node.label}
      </text>
    </g>
  );
}

function EndpointNode({ id, label }: { id: "start" | "end"; label: string }) {
  const box = graphNodePositions[id];
  return (
    <g>
      <rect
        x={box.x}
        y={box.y}
        width={box.width}
        height={box.height}
        rx="21"
        className="fill-background stroke-border"
      />
      <text
        x={box.x + box.width / 2}
        y={box.y + box.height / 2 + 5}
        textAnchor="middle"
        className="fill-muted-foreground text-[13px] font-medium"
      >
        {label}
      </text>
    </g>
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
      <RuntimeSummaryLine label="输入" value={step.input_summary} />
      <RuntimeSummaryLine label="输出" value={step.output_summary} />
      {step.error_message ? <p className="mt-1 text-red-600">错误：{step.error_message}</p> : null}
    </div>
  );
}

function RuntimeSummaryLine({ label, value }: { label: string; value: string | null }) {
  const text = value ?? "无";
  const long = text.length > RUNTIME_SUMMARY_PREVIEW_LENGTH;
  if (!long) {
    return (
      <p className="mt-1 break-words">
        {label}：{text}
      </p>
    );
  }

  return (
    <details className="mt-1">
      <summary className="cursor-pointer text-foreground">
        <span>{label}：</span>
        <span className="text-muted-foreground">内容较长，点击展开</span>
      </summary>
      <div className="mt-2 max-h-32 overflow-auto rounded-md border border-border bg-background p-2">
        <p className="break-words">{text}</p>
      </div>
    </details>
  );
}

function RunObservabilityPanel({
  runs,
  detail,
  loading,
  onSelectRun,
}: {
  runs: AgentRun[];
  detail: AgentRunDetail | null;
  loading: boolean;
  onSelectRun: (runId: string) => void;
}) {
  const selectedRunId = detail?.run.run_id ?? null;
  const slowestStep = detail?.steps.reduce<AgentStepLog | null>((slowest, step) => {
    if (!slowest) {
      return step;
    }
    return (step.duration_ms ?? 0) > (slowest.duration_ms ?? 0) ? step : slowest;
  }, null);

  return (
    <div className="rounded-lg border border-border bg-background">
      <div className="border-b border-border px-4 py-3">
        <p className="text-sm font-medium text-foreground">运行观测中心</p>
        <p className="mt-1 text-xs text-muted-foreground">
          左侧选择一次真实咨询，右侧直接查看本轮多 Agent 执行链路。
        </p>
      </div>
      <div className="grid gap-0 lg:grid-cols-[0.38fr_0.62fr]">
        <div className="border-b border-border lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2">
            <p className="text-sm font-medium text-foreground">最近运行</p>
            <span className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">{runs.length} 条</span>
          </div>
          <div className="max-h-[620px] divide-y divide-border overflow-auto">
            {runs.map((run) => {
              const active = run.run_id === selectedRunId;
              return (
                <button
                  key={run.run_id}
                  type="button"
                  className={
                    active
                      ? "w-full border-l-4 border-primary bg-primary/5 px-4 py-3 text-left"
                      : "w-full border-l-4 border-transparent px-4 py-3 text-left hover:bg-muted/40"
                  }
                  disabled={loading}
                  onClick={() => onSelectRun(run.run_id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="line-clamp-2 text-sm font-medium leading-6 text-foreground">{run.question}</p>
                    <span className={statusPillClass(run.status)}>{run.status}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5 text-xs text-muted-foreground">
                    <span className="rounded-md bg-muted px-2 py-1">{run.intent ?? "unknown"}</span>
                    <span className="rounded-md bg-muted px-2 py-1">{run.case_type ?? "general"}</span>
                    <span className="rounded-md bg-muted px-2 py-1">{run.risk_level ?? "未评估"}</span>
                    <span className="rounded-md bg-muted px-2 py-1">{run.duration_ms ?? 0}ms</span>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">{formatDateTime(run.started_at)}</p>
                </button>
              );
            })}
            {runs.length === 0 ? (
              <p className="px-4 py-8 text-sm text-muted-foreground">暂无 Agent 运行记录</p>
            ) : null}
          </div>
        </div>

        <div>
          <div className="border-b border-border px-4 py-3">
            <p className="text-sm font-medium text-foreground">运行详情</p>
            {detail ? (
              <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{detail.run.question}</p>
            ) : (
              <p className="mt-1 text-xs text-muted-foreground">请选择左侧运行记录。</p>
            )}
          </div>
          {detail ? (
            <div className="space-y-4 p-4">
              <div className="grid gap-2 md:grid-cols-3">
                <MetricMini label="意图" value={detail.run.intent ?? "unknown"} />
                <MetricMini label="事项" value={detail.run.case_type ?? "general"} />
                <MetricMini label="风险" value={detail.run.risk_level ?? "未评估"} />
                <MetricMini label="总耗时" value={`${detail.run.duration_ms ?? 0}ms`} />
                <MetricMini label="执行节点" value={`${detail.steps.length}`} />
                <MetricMini
                  label="最慢节点"
                  value={slowestStep ? `${slowestStep.node_name} ${slowestStep.duration_ms ?? 0}ms` : "无"}
                />
              </div>

              <div className="max-h-[520px] space-y-3 overflow-auto pr-1">
                {detail.steps.map((step, index) => (
                  <div key={step.id} className="relative pl-7">
                    <div className="absolute left-2 top-2 h-full w-px bg-border" />
                    <div className={step.status === "failed" ? "absolute left-0 top-2 size-4 rounded-full border border-red-300 bg-red-50" : "absolute left-0 top-2 size-4 rounded-full border border-emerald-300 bg-emerald-50"} />
                    <div className="rounded-lg border border-border bg-muted/20 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="rounded-md bg-background px-2 py-1 text-xs text-muted-foreground">
                            {String(index + 1).padStart(2, "0")}
                          </span>
                          <p className="truncate text-sm font-medium text-foreground">{step.node_name}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                          <span className={statusPillClass(step.status)}>{step.status}</span>
                          <span>{step.duration_ms ?? 0}ms</span>
                        </div>
                      </div>
                      <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">
                        {compactStepSummary(step)}
                      </p>
                      <details className="mt-2 text-xs leading-5 text-muted-foreground">
                        <summary className="cursor-pointer text-foreground">查看输入/输出摘要</summary>
                        <div className="mt-2 grid gap-2 md:grid-cols-2">
                          <div className="max-h-36 overflow-auto rounded-md border border-border bg-background p-2">
                            <p className="mb-1 font-medium text-foreground">输入</p>
                            <p className="break-words">{step.input_summary ?? "无"}</p>
                          </div>
                          <div className="max-h-36 overflow-auto rounded-md border border-border bg-background p-2">
                            <p className="mb-1 font-medium text-foreground">输出</p>
                            <p className="break-words">{step.output_summary ?? "无"}</p>
                          </div>
                        </div>
                        {step.error_message ? <p className="mt-2 text-red-600">错误：{step.error_message}</p> : null}
                      </details>
                    </div>
                  </div>
                ))}
                {detail.steps.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
                    暂无执行步骤
                  </p>
                ) : null}
              </div>
            </div>
          ) : (
            <p className="p-6 text-sm text-muted-foreground">暂无运行详情</p>
          )}
        </div>
      </div>
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
  isEditing,
  onToggleEdit,
  onRetry,
  onSave,
  onDisable,
  onEnable,
}: {
  document: PolicyDocument;
  loading: boolean;
  isEditing: boolean;
  onToggleEdit: () => void;
  onRetry: () => void;
  onSave: (formData: FormData) => void;
  onDisable: () => void;
  onEnable: () => void;
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
            <Button type="button" variant={isEditing ? "secondary" : "outline"} size="sm" disabled={loading} onClick={onToggleEdit}>
              <Pencil className="size-3.5" />
              {isEditing ? "收起" : "编辑"}
            </Button>
            <Button type="button" variant="outline" size="sm" disabled={loading} onClick={onRetry}>
              <RotateCcw className="size-3.5" />
              解析
            </Button>
            {document.is_active ? (
              <Button type="button" variant="outline" size="sm" disabled={loading} onClick={onDisable}>
                <Trash2 className="size-3.5" />
                禁用
              </Button>
            ) : (
              <Button type="button" variant="outline" size="sm" disabled={loading} onClick={onEnable}>
                <RefreshCw className="size-3.5" />
                启用
              </Button>
            )}
          </div>
        </td>
      </tr>
      {isEditing ? (
        <tr className="border-t border-border bg-muted/20">
          <td colSpan={6} className="px-3 py-3">
            <div className="rounded-lg border-l-4 border-primary bg-background p-3 shadow-sm">
              <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">正在编辑：{document.title}</p>
                  <p className="mt-1 truncate text-xs text-muted-foreground">{document.file_name}</p>
                </div>
                <Button type="button" variant="ghost" size="sm" disabled={loading} onClick={onToggleEdit}>
                  收起
                </Button>
              </div>
            <form
              className="grid gap-3 md:grid-cols-4"
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
            </div>
          </td>
        </tr>
      ) : null}
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

function ResizableAgentSplit({ left, right }: { left: ReactNode; right: ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [ratio, setRatio] = useState(() => {
    if (typeof window === "undefined") {
      return AGENT_SPLIT_DEFAULT_RATIO;
    }
    const saved = Number(window.localStorage.getItem(AGENT_SPLIT_STORAGE_KEY));
    return clampAgentSplit(Number.isFinite(saved) ? saved : AGENT_SPLIT_DEFAULT_RATIO);
  });
  const ratioRef = useRef(ratio);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    function syncWidth(width: number) {
      setContainerWidth(width);
      setRatio((current) => {
        const nextRatio = clampAgentSplit(current, width);
        ratioRef.current = nextRatio;
        return nextRatio;
      });
    }

    syncWidth(container.getBoundingClientRect().width);
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (width) {
        syncWidth(width);
      }
    });
    observer.observe(container);

    return () => observer.disconnect();
  }, []);

  function updateRatio(clientX: number) {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0) {
      return;
    }
    const nextRatio = clampAgentSplit((clientX - rect.left) / rect.width, rect.width);
    ratioRef.current = nextRatio;
    setRatio(nextRatio);
  }

  function persistRatio(value: number) {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(AGENT_SPLIT_STORAGE_KEY, String(value));
    }
  }

  function handleMouseDown(event: ReactMouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    setDragging(true);
    updateRatio(event.clientX);

    function handleMouseMove(mouseEvent: MouseEvent) {
      mouseEvent.preventDefault();
      updateRatio(mouseEvent.clientX);
    }

    function handleMouseUp() {
      setDragging(false);
      persistRatio(ratioRef.current);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    }

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  }

  function resetRatio() {
    ratioRef.current = AGENT_SPLIT_DEFAULT_RATIO;
    setRatio(AGENT_SPLIT_DEFAULT_RATIO);
    persistRatio(AGENT_SPLIT_DEFAULT_RATIO);
  }

  const layoutRatio = clampAgentSplit(ratio, containerWidth);
  const leftPercent = layoutRatio * 100;
  const rightPercent = 100 - leftPercent;

  return (
    <div
      ref={containerRef}
      className={dragging ? "grid select-none gap-0" : "grid gap-0"}
      style={{
        gridTemplateColumns: `minmax(${AGENT_SPLIT_GRAPH_MIN_WIDTH}px, calc(${leftPercent}% - ${
          AGENT_SPLIT_HANDLE_WIDTH / 2
        }px)) ${AGENT_SPLIT_HANDLE_WIDTH}px minmax(${AGENT_SPLIT_DETAIL_MIN_WIDTH}px, calc(${rightPercent}% - ${
          AGENT_SPLIT_HANDLE_WIDTH / 2
        }px))`,
      }}
    >
      <div className="min-w-0 pr-2">{left}</div>
      <button
        type="button"
        aria-label="拖动调整编排图和详情宽度，双击恢复默认"
        title="拖动调整宽度，双击恢复默认"
        className="group flex cursor-col-resize items-stretch justify-center rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onDoubleClick={resetRatio}
        onMouseDown={handleMouseDown}
      >
        <span
          className={
            dragging
              ? "my-2 w-1 rounded-full bg-primary"
              : "my-2 w-px rounded-full bg-border transition-colors group-hover:bg-primary"
          }
        />
      </button>
      <div className="min-w-0 pl-2">{right}</div>
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

function edgeKey(edge: AgentGraphEdge, index: number) {
  return `${edge.source}-${edge.target}-${edge.condition ?? "always"}-${index}`;
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

function layerBands() {
  return {
    主链路: { x: 38, y: 190, width: 1050, height: 160 },
    证据中枢: { x: 1090, y: 190, width: 188, height: 160 },
    缺口追问: { x: 1090, y: 48, width: 188, height: 150 },
    判断行动治理: { x: 724, y: 402, width: 554, height: 166 },
    生成与记忆: { x: 178, y: 402, width: 534, height: 166 },
  };
}

function edgePath(edge: AgentGraphEdge) {
  const route = graphEdgeRoutes[edgeRouteKey(edge)];
  if (route) {
    return linePath(route);
  }
  const points = edgeAnchorPoints(edge);
  if (!points) {
    return "";
  }
  const { sx, sy, tx, ty, vertical, forward } = points;
  if (vertical) {
    const midY = sy + (ty - sy) / 2;
    return `M ${sx} ${sy} C ${sx} ${midY}, ${tx} ${midY}, ${tx} ${ty}`;
  }
  if (Math.abs(sy - ty) < 4) {
    return `M ${sx} ${sy} L ${tx} ${ty}`;
  }
  const midX = forward
    ? sx + Math.max(44, Math.abs(tx - sx) / 2)
    : sx - Math.max(44, Math.abs(tx - sx) / 2);
  return `M ${sx} ${sy} C ${midX} ${sy}, ${midX} ${ty}, ${tx} ${ty}`;
}

function linePath(points: [number, number][]) {
  return points.map(([x, y], index) => `${index === 0 ? "M" : "L"} ${x} ${y}`).join(" ");
}

function edgeLabelPoint(edge: AgentGraphEdge) {
  const override = graphEdgeLabelPoints[edgeRouteKey(edge)];
  if (override) {
    return override;
  }
  const points = edgeAnchorPoints(edge);
  if (!points) {
    return { x: 0, y: 0 };
  }
  const { sx, sy, tx, ty } = points;
  return {
    x: sx + (tx - sx) * 0.5,
    y: sy + (ty - sy) * 0.5 - 18,
  };
}

function edgeAnchorPoints(edge: AgentGraphEdge) {
  const source = graphNodePositions[edge.source];
  const target = graphNodePositions[edge.target];
  if (!source || !target) {
    return null;
  }
  const sourceCenterX = source.x + source.width / 2;
  const sourceCenterY = source.y + source.height / 2;
  const targetCenterX = target.x + target.width / 2;
  const targetCenterY = target.y + target.height / 2;
  if (Math.abs(source.x - target.x) < 8) {
    const targetBelow = targetCenterY > sourceCenterY;
    return {
      sx: sourceCenterX,
      sy: targetBelow ? source.y + source.height : source.y,
      tx: targetCenterX,
      ty: targetBelow ? target.y : target.y + target.height,
      vertical: true,
      forward: true,
    };
  }
  const forward = target.x > source.x;
  return {
    sx: forward ? source.x + source.width : source.x,
    sy: sourceCenterY,
    tx: forward ? target.x : target.x + target.width,
    ty: targetCenterY,
    vertical: false,
    forward,
  };
}

function edgeRouteKey(edge: AgentGraphEdge) {
  return `${edge.source}->${edge.target}`;
}

function clampGraphZoom(value: number) {
  return Math.min(graphZoom.max, Math.max(graphZoom.min, Number(value.toFixed(2))));
}

function clampAgentSplit(value: number, containerWidth = 0) {
  let minRatio = AGENT_SPLIT_MIN_RATIO;
  let maxRatio = AGENT_SPLIT_MAX_RATIO;

  if (containerWidth > AGENT_SPLIT_HANDLE_WIDTH + AGENT_SPLIT_GRAPH_MIN_WIDTH + AGENT_SPLIT_DETAIL_MIN_WIDTH) {
    minRatio = Math.max(
      minRatio,
      (AGENT_SPLIT_GRAPH_MIN_WIDTH + AGENT_SPLIT_HANDLE_WIDTH / 2) / containerWidth,
    );
    maxRatio = Math.min(
      maxRatio,
      1 - (AGENT_SPLIT_DETAIL_MIN_WIDTH + AGENT_SPLIT_HANDLE_WIDTH / 2) / containerWidth,
    );
  }

  if (minRatio > maxRatio) {
    return Number(((minRatio + maxRatio) / 2).toFixed(3));
  }

  return Math.min(maxRatio, Math.max(minRatio, Number(value.toFixed(3))));
}

function statusPillClass(status: string) {
  if (status === "success") {
    return "rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs text-emerald-700";
  }
  if (status === "failed") {
    return "rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-700";
  }
  return "rounded-md border border-border bg-muted px-2 py-1 text-xs text-muted-foreground";
}

function compactStepSummary(step: AgentStepLog) {
  const source = step.output_summary ?? step.error_message ?? step.input_summary ?? "无摘要";
  return truncateText(source, 150);
}

function truncateText(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength)}...` : value;
}

function secretStatusLabel(status?: string, masked?: string | null) {
  if (status === "configured") {
    return masked ? `已配置（${masked}）` : "已配置";
  }
  return "未配置";
}

function numberFromForm(value: FormDataEntryValue | null) {
  const normalized = String(value ?? "").trim();
  return normalized ? Number(normalized) : null;
}

async function readErrorMessage(response: Response, fallback: string) {
  try {
    const body = await response.json();
    return body.detail ?? fallback;
  } catch {
    return fallback;
  }
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
