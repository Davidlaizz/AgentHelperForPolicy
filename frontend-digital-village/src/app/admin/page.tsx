"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Activity, BarChart3, BookOpenCheck, Bot, ClipboardList, Cpu, Database,
  FileText, GitBranch, KeyRound, MessageSquareText, Pencil, RefreshCw,
  RotateCcw, Save, ShieldAlert, SlidersHorizontal, Trash2, Upload, Workflow,
} from "lucide-react";
import { PageHeading } from "@/components/page-heading";
import { SectionCard } from "@/components/section-card";
import { StatCard } from "@/components/stat-card";
import {
  getDashboard, getHotQuestions, getSystemConfig, getAgentGraph, getAgentNodes,
  getAgentRuns, getAgentRunDetail, listDocuments, uploadDocument, parseDocument,
  updateDocument, disableDocument, getStandardAnswers, createStandardAnswer,
  disableStandardAnswer, getPolicyChunks, updateModelService,
  getServiceCases, getAgricultureDiagnoses,
  type DashboardResponse, type HotQuestionItem, type SystemConfigResponse,
  type AgentGraphResponse, type AgentGraphNode, type AgentRunItem, type AgentRunDetail,
  type PolicyDocumentItem, type StandardAnswerItem, type PolicyChunkItem,
  type ServiceCaseItem, type AgricultureDiagnosisItem,
} from "@/lib/api";

type AdminTab = "overview" | "knowledge" | "operations" | "cases" | "agriculture" | "agents" | "settings";

const adminTabs: { id: AdminTab; label: string }[] = [
  { id: "overview", label: "总览看板" },
  { id: "knowledge", label: "政策知识库" },
  { id: "operations", label: "问答运营" },
  { id: "cases", label: "事项服务" },
  { id: "agriculture", label: "智慧农业" },
  { id: "agents", label: "Agent 治理" },
  { id: "settings", label: "系统配置" },
];

const statusLabel: Record<string, string> = {
  uploaded: "已上传", parsing: "解析中", parsed: "已解析", indexed: "已入库", failed: "失败",
};
const statusClass: Record<string, string> = {
  uploaded: "bg-slate-100 text-slate-700",
  parsing: "bg-blue-100 text-blue-700",
  parsed: "bg-emerald-100 text-emerald-700",
  indexed: "bg-indigo-100 text-indigo-700",
  failed: "bg-red-100 text-red-700",
};

export default function AdminPage() {
  const [tab, setTab] = useState<AdminTab>("overview");
  const [dash, setDash] = useState<DashboardResponse | null>(null);
  const [hots, setHots] = useState<HotQuestionItem[]>([]);
  const [cfg, setCfg] = useState<SystemConfigResponse | null>(null);
  const [graph, setGraph] = useState<AgentGraphResponse | null>(null);
  const [runs, setRuns] = useState<AgentRunItem[]>([]);
  const [docs, setDocs] = useState<PolicyDocumentItem[]>([]);
  const [answers, setAnswers] = useState<StandardAnswerItem[]>([]);
  const [chunks, setChunks] = useState<{ total: number; results: PolicyChunkItem[] }>({ total: 0, results: [] });
  const [cases, setCases] = useState<ServiceCaseItem[]>([]);
  const [agris, setAgris] = useState<AgricultureDiagnosisItem[]>([]);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const loadAll = () => {
    getDashboard().then(setDash).catch(() => {});
    getHotQuestions(20).then(setHots).catch(() => {});
    getSystemConfig().then(setCfg).catch(() => {});
    getAgentGraph().then(setGraph).catch(() => {});
    getAgentRuns(20).then(setRuns).catch(() => {});
    listDocuments().then(setDocs).catch(() => {});
    getStandardAnswers().then(setAnswers).catch(() => {});
    getPolicyChunks({ limit: 50 }).then(setChunks).catch(() => {});
    getServiceCases().then(setCases).catch(() => {});
    getAgricultureDiagnoses().then(setAgris).catch(() => {});
  };

  useEffect(() => { loadAll(); }, []);

  return (
    <div className="page-shell">
      <PageHeading eyebrow="Operation Dashboard" title="管理后台" description="数字乡村平台运营管理：政策库、问答、Agent 治理和系统配置。" />

      <div className="mb-6 flex flex-wrap gap-2">
        {adminTabs.map((t) => (
          <button key={t.id} type="button" onClick={() => setTab(t.id)}
            className={`focus-ring min-h-11 rounded-md px-3 text-sm font-medium transition-colors ${tab === t.id ? "bg-[var(--primary)] text-white" : "bg-white text-[var(--foreground)] hover:bg-[var(--muted)]"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {msg && <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800">{msg}</div>}

      {tab === "overview" && <Overview dash={dash} />}
      {tab === "knowledge" && <Knowledge docs={docs} chunks={chunks} setChunks={setChunks} onReload={loadAll} setMsg={setMsg} loading={loading} setLoading={setLoading} />}
      {tab === "operations" && <Operations hots={hots} answers={answers} onReload={loadAll} setMsg={setMsg} />}
      {tab === "cases" && <ServiceCasesTab cases={cases} onReload={loadAll} />}
      {tab === "agriculture" && <AgricultureTab agris={agris} onReload={loadAll} />}
      {tab === "agents" && <Agents graph={graph} runs={runs} />}
      {tab === "settings" && <Settings config={cfg} onReload={loadAll} setMsg={setMsg} />}
    </div>
  );
}

/* ─── Overview ─── */
function Overview({ dash }: { dash: DashboardResponse | null }) {
  if (!dash) return <SectionCard title="总览看板"><p className="text-muted-foreground">加载中…</p></SectionCard>;
  const metrics = [
    { label: "今日问答", value: String(dash.today_question_count), note: "数字乡村实时咨询", tone: "green" as const, icon: MessageSquareText },
    { label: "政策文档", value: String(dash.document_count), note: `${dash.parsed_document_count} 已解析`, tone: "blue" as const, icon: FileText },
    { label: "知识切片", value: String(dash.chunk_count), note: "可检索片段", tone: "amber" as const, icon: Database },
    { label: "服务事项", value: String(dash.service_case_count), note: "活跃事项", tone: "green" as const, icon: ClipboardList },
    { label: "标准答案", value: String(dash.standard_answer_count), note: "已配置", tone: "blue" as const, icon: BookOpenCheck },
    { label: "高风险回答", value: String(dash.high_risk_answer_count), note: "需人工复核", tone: "red" as const, icon: ShieldAlert },
  ];
  return (
    <div className="grid gap-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {metrics.map((m) => <StatCard key={m.label} label={m.label} value={m.value} note={m.note} tone={m.tone} icon={m.icon} />)}
      </div>
      {dash.top_policy_categories.length > 0 && (
        <SectionCard title="政策分类分布">
          <div className="space-y-3">
            {dash.top_policy_categories.map((c) => {
              const pct = dash.document_count ? Math.round((c.count / dash.document_count) * 100) : 0;
              return (
                <div key={c.name}>
                  <div className="mb-1 flex justify-between text-sm"><span>{c.name}</span><span>{c.count} 份 ({pct}%)</span></div>
                  <div className="h-3 rounded-full bg-[var(--muted)]"><div className="h-3 rounded-full bg-[var(--primary)]" style={{ width: pct + "%" }} /></div>
                </div>
              );
            })}
          </div>
        </SectionCard>
      )}
    </div>
  );
}

/* ─── Knowledge: Documents + Chunks ─── */
function Knowledge({ docs, chunks, setChunks, onReload, setMsg, loading, setLoading }: {
  docs: PolicyDocumentItem[]; chunks: { total: number; results: PolicyChunkItem[] };
  setChunks: (c: { total: number; results: PolicyChunkItem[] }) => void;
  onReload: () => void; setMsg: (s: string) => void; loading: boolean; setLoading: (b: boolean) => void;
}) {
  const [subTab, setSubTab] = useState<"docs" | "chunks">("docs");
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("未分类");
  const [chunkQuery, setChunkQuery] = useState("");

  const handleUpload = async (e: FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      if (title) fd.append("title", title);
      fd.append("policy_category", category);
      fd.append("auto_parse", "true");
      await uploadDocument(fd);
      setMsg("上传成功");
      setFile(null); setTitle("");
      onReload();
    } catch (err: any) { setMsg("上传失败: " + err.message); }
    finally { setLoading(false); }
  };

  const handleParse = async (id: string) => {
    setLoading(true);
    try { await parseDocument(id); setMsg("解析完成"); onReload(); }
    catch (err: any) { setMsg("解析失败: " + err.message); }
    finally { setLoading(false); }
  };

  const handleDisable = async (id: string) => {
    if (!confirm("确认禁用此文档？")) return;
    setLoading(true);
    try { await disableDocument(id); setMsg("已禁用"); onReload(); }
    catch (err: any) { setMsg("操作失败: " + err.message); }
    finally { setLoading(false); }
  };

  const handleChunkSearch = () => {
    getPolicyChunks({ query: chunkQuery, limit: 50 }).then(setChunks).catch(() => {});
  };

  return (
    <div className="grid gap-6">
      <div className="flex gap-2">
        <button onClick={() => setSubTab("docs")} className={`rounded-md px-3 py-1.5 text-sm ${subTab === "docs" ? "bg-[var(--primary)] text-white" : "bg-white"}`}>政策文件</button>
        <button onClick={() => setSubTab("chunks")} className={`rounded-md px-3 py-1.5 text-sm ${subTab === "chunks" ? "bg-[var(--primary)] text-white" : "bg-white"}`}>知识切片</button>
      </div>

      {subTab === "docs" && <>
        <SectionCard title="上传政策文件">
          <form onSubmit={handleUpload} className="flex flex-wrap items-end gap-3">
            <label className="grid gap-1 text-sm">
              <span className="font-medium">文件</span>
              <input type="file" accept=".pdf,.docx,.doc,.html" onChange={(e) => setFile(e.target.files?.[0] || null)} className="rounded border px-2 py-1" />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-medium">标题</span>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="可选" className="rounded border px-2 py-1" />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-medium">分类</span>
              <input value={category} onChange={(e) => setCategory(e.target.value)} className="rounded border px-2 py-1" />
            </label>
            <button type="submit" disabled={!file || loading} className="rounded-md bg-[var(--primary)] px-4 py-2 text-sm text-white disabled:opacity-50">
              <Upload className="mr-1 inline size-4" /> {loading ? "上传中…" : "上传"}
            </button>
          </form>
        </SectionCard>

        <SectionCard title={`政策文件列表 (${docs.length})`}>
          <div className="table-scroll">
            <table className="w-full min-w-[800px] border-separate border-spacing-y-2 text-left text-sm">
              <thead>
                <tr className="text-[var(--muted-foreground)]">
                  <th className="px-3 py-2">标题</th><th className="px-3 py-2">分类</th><th className="px-3 py-2">状态</th>
                  <th className="px-3 py-2">切片</th><th className="px-3 py-2">操作</th>
                </tr>
              </thead>
              <tbody>
                {docs.map((doc) => (
                  <tr key={doc.id} className="bg-white">
                    <td className="rounded-l-md border-y border-l px-3 py-3 font-medium">{doc.title}</td>
                    <td className="border-y px-3 py-3">{doc.policy_category}</td>
                    <td className="border-y px-3 py-3">
                      <span className={`rounded-md px-2 py-0.5 text-xs ${statusClass[doc.parse_status] || "bg-gray-100"}`}>
                        {statusLabel[doc.parse_status] || doc.parse_status}
                      </span>
                    </td>
                    <td className="border-y px-3 py-3">{doc.chunk_count}</td>
                    <td className="rounded-r-md border-y border-r px-3 py-3">
                      <div className="flex gap-1">
                        {doc.parse_status === "failed" && (
                          <button onClick={() => handleParse(doc.id)} className="rounded px-2 py-1 text-xs hover:bg-blue-50 text-blue-600" title="重试解析">
                            <RefreshCw className="inline size-3" />
                          </button>
                        )}
                        <button onClick={() => handleDisable(doc.id)} className="rounded px-2 py-1 text-xs hover:bg-red-50 text-red-600" title="禁用">
                          <Trash2 className="inline size-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      </>}

      {subTab === "chunks" && <>
        <SectionCard title={`知识切片 (共 ${chunks.total} 条)`}>
          <div className="mb-4 flex gap-2">
            <input value={chunkQuery} onChange={(e) => setChunkQuery(e.target.value)} placeholder="搜索切片内容…" className="flex-1 rounded border px-3 py-2 text-sm" />
            <button onClick={handleChunkSearch} className="rounded-md bg-[var(--primary)] px-4 py-2 text-sm text-white">搜索</button>
          </div>
          <div className="grid gap-3">
            {chunks.results.map((c) => (
              <div key={c.chunk_id} className="rounded-md border bg-white p-4">
                <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{c.document_title}</span>
                  {c.section_title && <span>· {c.section_title}</span>}
                  {c.article_no && <span>· {c.article_no}</span>}
                  {c.page_no && <span>· 第{c.page_no}页</span>}
                  <span className="ml-auto rounded bg-gray-100 px-1.5 py-0.5">#{c.chunk_index}</span>
                </div>
                <p className="text-sm leading-6 text-[var(--foreground)]">{c.chunk_text}</p>
              </div>
            ))}
          </div>
        </SectionCard>
      </>}
    </div>
  );
}

/* ─── Operations: Hot Questions + Standard Answers ─── */
function Operations({ hots, answers, onReload, setMsg }: {
  hots: HotQuestionItem[]; answers: StandardAnswerItem[]; onReload: () => void; setMsg: (s: string) => void;
}) {
  const [subTab, setSubTab] = useState<"hots" | "answers">("hots");
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newCategory, setNewCategory] = useState("");

  const handleCreateAnswer = async () => {
    if (!newTitle || !newContent) return;
    try {
      await createStandardAnswer({ title: newTitle, answer_content: newContent, policy_category: newCategory || undefined });
      setMsg("标准答案已创建"); setNewTitle(""); setNewContent(""); setNewCategory("");
      onReload();
    } catch (err: any) { setMsg("创建失败: " + err.message); }
  };

  const handleDisableAnswer = async (id: string) => {
    if (!confirm("确认禁用？")) return;
    try { await disableStandardAnswer(id); setMsg("已禁用"); onReload(); }
    catch (err: any) { setMsg("操作失败: " + err.message); }
  };

  return (
    <div className="grid gap-6">
      <div className="flex gap-2">
        <button onClick={() => setSubTab("hots")} className={`rounded-md px-3 py-1.5 text-sm ${subTab === "hots" ? "bg-[var(--primary)] text-white" : "bg-white"}`}>热门问题</button>
        <button onClick={() => setSubTab("answers")} className={`rounded-md px-3 py-1.5 text-sm ${subTab === "answers" ? "bg-[var(--primary)] text-white" : "bg-white"}`}>标准答案</button>
      </div>

      {subTab === "hots" && (
        <SectionCard title="热门问题看板" description="按提问频次排序">
          <div className="table-scroll">
            <table className="w-full min-w-[680px] border-separate border-spacing-y-2 text-left text-sm">
              <thead><tr className="text-[var(--muted-foreground)]"><th className="px-3 py-2">问题</th><th className="px-3 py-2">分类</th><th className="px-3 py-2">次数</th><th className="px-3 py-2">最近</th></tr></thead>
              <tbody>
                {hots.map((q) => (
                  <tr key={q.id} className="bg-white">
                    <td className="rounded-l-md border-y border-l px-3 py-3 font-medium">{q.question_text}</td>
                    <td className="border-y px-3 py-3">{q.policy_category || "-"}</td>
                    <td className="border-y px-3 py-3">{q.hit_count}</td>
                    <td className="rounded-r-md border-y border-r px-3 py-3 text-muted-foreground">{q.last_asked_at ? new Date(q.last_asked_at).toLocaleString() : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      {subTab === "answers" && <>
        <SectionCard title="新增标准答案">
          <div className="grid gap-3 md:grid-cols-[1fr_1fr_2fr_auto]">
            <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="标题" className="rounded border px-3 py-2 text-sm" />
            <input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="分类（可选）" className="rounded border px-3 py-2 text-sm" />
            <input value={newContent} onChange={(e) => setNewContent(e.target.value)} placeholder="答案内容" className="rounded border px-3 py-2 text-sm" />
            <button onClick={handleCreateAnswer} className="rounded-md bg-[var(--primary)] px-4 py-2 text-sm text-white">创建</button>
          </div>
        </SectionCard>
        <SectionCard title={`标准答案 (${answers.length})`}>
          <div className="grid gap-3">
            {answers.map((a) => (
              <div key={a.id} className="rounded-md border bg-white p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{a.title}</p>
                    {a.policy_category && <span className="text-xs text-muted-foreground">{a.policy_category}</span>}
                  </div>
                  <div className="flex gap-1">
                    <span className={`rounded px-2 py-0.5 text-xs ${a.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>{a.status}</span>
                    {a.status === "active" && (
                      <button onClick={() => handleDisableAnswer(a.id)} className="rounded px-2 py-1 text-xs hover:bg-red-50 text-red-600"><Trash2 className="inline size-3" /></button>
                    )}
                  </div>
                </div>
                <p className="mt-2 text-sm text-[var(--muted-foreground)]">{a.answer_content}</p>
              </div>
            ))}
          </div>
        </SectionCard>
      </>}
    </div>
  );
}

/* ─── Service Cases ─── */
function ServiceCasesTab({ cases, onReload }: { cases: ServiceCaseItem[]; onReload: () => void }) {
  return (
    <SectionCard title="事项服务" description="数字乡村服务事项管理">
      <div className="grid gap-3 md:grid-cols-2">
        {cases.map((c) => (
          <div key={c.id} className="rounded-md border border-[var(--border)] bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="font-semibold text-[var(--foreground)]">{c.title}</p>
              <span className="rounded-md bg-sky-50 px-2.5 py-1 text-xs text-sky-800">{c.case_type}</span>
            </div>
            {c.subject && <p className="mt-2 text-sm text-[var(--muted-foreground)]">适用主体：{c.subject}</p>}
            {c.department && <p className="mt-1 text-sm text-[var(--muted-foreground)]">对接部门：{c.department}</p>}
            {c.stage && <p className="mt-1 text-sm text-[var(--muted-foreground)]">阶段：{c.stage}</p>}
          </div>
        ))}
        {cases.length === 0 && <p className="col-span-2 text-sm text-muted-foreground">暂无事项数据</p>}
      </div>
    </SectionCard>
  );
}

/* ─── Agriculture Diagnosis ─── */
function AgricultureTab({ agris, onReload }: { agris: AgricultureDiagnosisItem[]; onReload: () => void }) {
  return (
    <SectionCard title="智慧农业诊断" description="农业问题诊断与数字化方案">
      <div className="grid gap-3">
        {agris.map((a) => (
          <div key={a.id} className="grid gap-3 rounded-md border border-[var(--border)] bg-white p-4 md:grid-cols-[1fr_1fr_1fr_auto]">
            <p className="font-semibold text-[var(--foreground)]">{a.problem}</p>
            <p className="text-sm text-[var(--muted-foreground)]">{a.category}</p>
            <p className="text-sm text-[var(--muted-foreground)]">{a.solution || a.digital_direction || "-"}</p>
            <span className="rounded-md bg-amber-50 px-2.5 py-1 text-center text-xs text-amber-900">价值：{a.project_value || "-"}</span>
          </div>
        ))}
        {agris.length === 0 && <p className="text-sm text-muted-foreground">暂无诊断数据</p>}
      </div>
    </SectionCard>
  );
}

/* ─── Agent Governance ─── */
function Agents({ graph, runs }: { graph: AgentGraphResponse | null; runs: AgentRunItem[] }) {
  const [subTab, setSubTab] = useState<"graph" | "runs">("graph");
  const [selectedRun, setSelectedRun] = useState<AgentRunDetail | null>(null);

  const loadRunDetail = async (runId: string) => {
    try { setSelectedRun(await getAgentRunDetail(runId)); } catch {}
  };

  return (
    <div className="grid gap-6">
      <div className="flex gap-2">
        <button onClick={() => setSubTab("graph")} className={`rounded-md px-3 py-1.5 text-sm ${subTab === "graph" ? "bg-[var(--primary)] text-white" : "bg-white"}`}>编排图</button>
        <button onClick={() => setSubTab("runs")} className={`rounded-md px-3 py-1.5 text-sm ${subTab === "runs" ? "bg-[var(--primary)] text-white" : "bg-white"}`}>运行轨迹</button>
      </div>

      {subTab === "graph" && graph && <>
        <SectionCard title="Agent 编排图" description={graph.description}>
          <p className="mb-4 text-sm font-medium">版本: {graph.version} | 节点: {graph.nodes.length} | 边: {graph.edges.length}</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {graph.nodes.map((n) => (
              <div key={n.id} className="rounded-md border bg-white p-4">
                <div className="flex items-center justify-between">
                  <p className="font-semibold">{n.label} <span className="text-xs text-sky-800">({n.type})</span></p>
                  <span className={`rounded px-1.5 py-0.5 text-xs ${n.enabled ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                    {n.enabled ? "启用" : "禁用"}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{n.description}</p>
                <div className="mt-2 flex gap-3 text-xs text-muted-foreground">
                  <span>调用 {n.call_count}</span>
                  {n.average_duration_ms != null && <span>平均 {n.average_duration_ms}ms</span>}
                  {n.failure_count > 0 && <span className="text-red-600">失败 {n.failure_count}</span>}
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
        <SectionCard title="边定义">
          <div className="table-scroll">
            <table className="w-full min-w-[500px] border-separate border-spacing-y-1 text-left text-sm">
              <thead><tr className="text-muted-foreground"><th className="px-3 py-1">源</th><th className="px-3 py-1">目标</th><th className="px-3 py-1">条件</th></tr></thead>
              <tbody>
                {graph.edges.map((e, i) => (
                  <tr key={i} className="bg-white">
                    <td className="rounded-l-md border-y border-l px-3 py-2 font-mono text-xs">{e.source}</td>
                    <td className="border-y px-3 py-2 font-mono text-xs">{e.target}</td>
                    <td className="rounded-r-md border-y border-r px-3 py-2">{e.condition || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      </>}

      {subTab === "runs" && <>
        <SectionCard title={`Agent 运行记录 (${runs.length})`}>
          <div className="table-scroll">
            <table className="w-full min-w-[700px] border-separate border-spacing-y-2 text-left text-sm">
              <thead><tr className="text-muted-foreground"><th className="px-3 py-2">问题</th><th className="px-3 py-2">意图</th><th className="px-3 py-2">状态</th><th className="px-3 py-2">耗时</th><th className="px-3 py-2">时间</th><th className="px-3 py-2">操作</th></tr></thead>
              <tbody>
                {runs.map((r) => (
                  <tr key={r.run_id} className="bg-white">
                    <td className="rounded-l-md border-y border-l px-3 py-3 font-medium max-w-[200px] truncate">{r.question}</td>
                    <td className="border-y px-3 py-3">{r.intent || "-"}</td>
                    <td className="border-y px-3 py-3">
                      <span className={`rounded px-2 py-0.5 text-xs ${r.status === "success" ? "bg-emerald-100 text-emerald-700" : r.status === "failed" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"}`}>{r.status}</span>
                    </td>
                    <td className="border-y px-3 py-3">{r.duration_ms ? `${r.duration_ms}ms` : "-"}</td>
                    <td className="border-y px-3 py-3 text-xs text-muted-foreground">{new Date(r.started_at).toLocaleString()}</td>
                    <td className="rounded-r-md border-y border-r px-3 py-3">
                      <button onClick={() => loadRunDetail(r.run_id)} className="rounded px-2 py-1 text-xs hover:bg-blue-50 text-blue-600">详情</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
        {selectedRun && (
          <SectionCard title="运行详情">
            <p className="mb-3 text-sm"><strong>问题：</strong>{selectedRun.run.question}</p>
            <div className="grid gap-2">
              {selectedRun.steps.map((s, i) => (
                <div key={s.id} className="grid grid-cols-[42px_1fr] gap-3 rounded-md border bg-white p-3">
                  <span className="flex size-9 items-center justify-center rounded-md bg-[var(--muted)] font-semibold text-[var(--primary)]">{i + 1}</span>
                  <div>
                    <p className="font-semibold">{s.node_name} <span className="text-xs text-muted-foreground">({s.node_key})</span></p>
                    <p className="text-xs text-muted-foreground">状态: {s.status} {s.duration_ms ? `· ${s.duration_ms}ms` : ""}</p>
                    {s.output_summary && <p className="mt-1 text-sm">{s.output_summary}</p>}
                    {s.error_message && <p className="mt-1 text-sm text-red-600">{s.error_message}</p>}
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        )}
      </>}
    </div>
  );
}

/* ─── System Config ─── */
function Settings({ config, onReload, setMsg }: { config: SystemConfigResponse | null; onReload: () => void; setMsg: (s: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [provider, setProvider] = useState("");
  const [model, setModel] = useState("");
  const [apiUrl, setApiUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [maxTokens, setMaxTokens] = useState("");
  const [timeout, setTimeout] = useState("");

  useEffect(() => {
    if (config) {
      setProvider(config.model_service.provider);
      setModel(config.model_service.model);
      setApiUrl(config.model_service.api_url || "");
      setMaxTokens(String(config.model_service.max_tokens || ""));
      setTimeout(String(config.model_service.timeout_seconds));
    }
  }, [config]);

  const handleSave = async () => {
    try {
      await updateModelService({
        provider: provider || undefined,
        model: model || undefined,
        api_url: apiUrl || undefined,
        api_key: apiKey || undefined,
        max_tokens: maxTokens ? parseInt(maxTokens) : undefined,
        timeout_seconds: timeout ? parseInt(timeout) : undefined,
      });
      setMsg("配置已更新");
      setEditing(false);
      setApiKey("");
      onReload();
    } catch (err: any) { setMsg("更新失败: " + err.message); }
  };

  if (!config) return <SectionCard title="系统配置"><p className="text-muted-foreground">加载中…</p></SectionCard>;

  return (
    <div className="grid gap-6">
      <SectionCard title="模型服务配置" description={config.edit_note}>
        {!editing ? (
          <div className="grid gap-3 md:grid-cols-2">
            <CfgItem icon={Cpu} label="Provider" value={config.model_service.provider} />
            <CfgItem icon={Bot} label="模型" value={config.model_service.model} />
            <CfgItem icon={KeyRound} label="API 密钥" value={config.model_service.api_key_status === "configured" ? `已配置 (${config.model_service.api_key_masked})` : "未配置"} />
            <CfgItem icon={SlidersHorizontal} label="Max Tokens" value={String(config.model_service.max_tokens || "默认")} />
            <CfgItem icon={Activity} label="超时" value={`${config.model_service.timeout_seconds}s`} />
            <CfgItem icon={FileText} label="协议" value={config.model_service.compatible_protocol} />
            <div className="col-span-2">
              <button onClick={() => setEditing(true)} className="rounded-md bg-[var(--primary)] px-4 py-2 text-sm text-white"><Pencil className="mr-1 inline size-4" />编辑配置</button>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-1 text-sm"><span className="font-medium">Provider</span>
              <select value={provider} onChange={(e) => setProvider(e.target.value)} className="rounded border px-2 py-1.5">
                <option value="mock">Mock</option><option value="http">HTTP</option>
              </select>
            </label>
            <label className="grid gap-1 text-sm"><span className="font-medium">模型</span>
              <input value={model} onChange={(e) => setModel(e.target.value)} className="rounded border px-2 py-1.5" />
            </label>
            <label className="grid gap-1 text-sm"><span className="font-medium">API URL</span>
              <input value={apiUrl} onChange={(e) => setApiUrl(e.target.value)} className="rounded border px-2 py-1.5" />
            </label>
            <label className="grid gap-1 text-sm"><span className="font-medium">API Key（留空不修改）</span>
              <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} className="rounded border px-2 py-1.5" />
            </label>
            <label className="grid gap-1 text-sm"><span className="font-medium">Max Tokens</span>
              <input type="number" value={maxTokens} onChange={(e) => setMaxTokens(e.target.value)} className="rounded border px-2 py-1.5" />
            </label>
            <label className="grid gap-1 text-sm"><span className="font-medium">超时 (秒)</span>
              <input type="number" value={timeout} onChange={(e) => setTimeout(e.target.value)} className="rounded border px-2 py-1.5" />
            </label>
            {config.model_service.available_presets.length > 0 && (
              <div className="col-span-2">
                <p className="mb-2 text-sm font-medium">快捷预设</p>
                <div className="flex flex-wrap gap-2">
                  {config.model_service.available_presets.map((p) => (
                    <button key={p.id} onClick={() => { setProvider(p.provider); setModel(p.model); if (p.api_url) setApiUrl(p.api_url); }}
                      className="rounded-md border px-3 py-1.5 text-sm hover:bg-[var(--muted)]">{p.label}</button>
                  ))}
                </div>
              </div>
            )}
            <div className="col-span-2 flex gap-2">
              <button onClick={handleSave} className="rounded-md bg-[var(--primary)] px-4 py-2 text-sm text-white"><Save className="mr-1 inline size-4" />保存</button>
              <button onClick={() => setEditing(false)} className="rounded-md border px-4 py-2 text-sm">取消</button>
            </div>
          </div>
        )}
      </SectionCard>

      <SectionCard title="RAG 服务配置">
        <div className="grid gap-3 md:grid-cols-2">
          <CfgItem icon={Database} label="Embedding Provider" value={config.rag_service.embedding_provider as string} />
          <CfgItem icon={Database} label="Embedding 模型" value={config.rag_service.embedding_model as string} />
          <CfgItem icon={Database} label="向量维度" value={String(config.rag_service.embedding_dimensions)} />
          <CfgItem icon={Database} label="向量表" value={`${config.rag_service.vector_schema}.${config.rag_service.vector_table}`} />
        </div>
      </SectionCard>

      <SectionCard title="Agent 治理配置">
        <div className="grid gap-3 md:grid-cols-2">
          <CfgItem icon={GitBranch} label="图版本" value={config.agent_governance.graph_version as string} />
          <CfgItem icon={Workflow} label="编排框架" value={config.agent_governance.orchestration_framework as string} />
          <CfgItem icon={BarChart3} label="节点数" value={String(config.agent_governance.node_count)} />
          <CfgItem icon={BarChart3} label="边数" value={String(config.agent_governance.edge_count)} />
        </div>
      </SectionCard>
    </div>
  );
}

function CfgItem({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="rounded-md border bg-white p-4">
      <div className="flex items-center gap-2"><Icon className="size-5 text-[var(--primary)]" /><p className="text-sm font-semibold">{label}</p></div>
      <p className="mt-3 text-sm text-muted-foreground">{value}</p>
    </div>
  );
}
