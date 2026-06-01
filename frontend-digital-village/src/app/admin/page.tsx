"use client";

import { useEffect, useState } from "react";
import { Activity, BarChart3, BookOpenCheck, Bot, ClipboardList, FileText, MessageSquareText, Settings, Users } from "lucide-react";
import { PageHeading } from "@/components/page-heading";
import { SectionCard } from "@/components/section-card";
import { StatCard } from "@/components/stat-card";
import { getDashboard, getHotQuestions, getSystemConfig, getAgentGraph } from "@/lib/api";
import { agentTrace, dashboardMetrics, hotQuestions, policyDocuments } from "@/data/platform-data";

const tabs = [
  "总览看板",
  "高频问题",
  "政策知识库",
  "事项服务",
  "智慧农业诊断",
  "Agent 运行轨迹",
  "系统配置",
];

const subjectDistribution = [
  { label: "农户", value: 38 },
  { label: "村干部", value: 24 },
  { label: "合作社", value: 18 },
  { label: "返乡创业者", value: 12 },
  { label: "基层服务人员", value: 8 },
];

const materialGaps = [
  { name: "购机发票", count: 18 },
  { name: "主体登记材料", count: 15 },
  { name: "项目建设方案", count: 13 },
  { name: "经营场所证明", count: 9 },
];

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState(tabs[0]);
  const [apiDash, setApiDash] = useState<any>(null);
  const [apiHots, setApiHots] = useState<any[] | null>(null);
  const [apiCfg, setApiCfg] = useState<any>(null);
  const [apiAgent, setApiAgent] = useState<any>(null);

  useEffect(() => {
    getDashboard().then(setApiDash).catch(() => {});
    getHotQuestions(10).then(setApiHots).catch(() => {});
    getSystemConfig().then(setApiCfg).catch(() => {});
    getAgentGraph().then(setApiAgent).catch(() => {});
  }, []);

  const hasApi = apiDash !== null;

  return (
    <div className="page-shell">
      <PageHeading
        eyebrow="Operation Dashboard"
        title="管理后台"
        description="汇总平台运营沉淀能力：高频问题、材料缺口、政策库、事项服务和 Agent 运行轨迹。"
      />

      <div className="mb-6 flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`focus-ring min-h-11 rounded-md px-3 text-sm font-medium transition-colors ${
              activeTab === tab
                ? "bg-[var(--primary)] text-white"
                : "bg-white text-[var(--foreground)] hover:bg-[var(--muted)]"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "总览看板" ? <Overview hasApi={hasApi} dash={apiDash} /> : null}
      {activeTab === "高频问题" ? <HotQuestions hots={apiHots} /> : null}
      {activeTab === "政策知识库" ? <Knowledge /> : null}
      {activeTab === "事项服务" ? <ServiceCases /> : null}
      {activeTab === "智慧农业诊断" ? <AgricultureRecords /> : null}
      {activeTab === "Agent 运行轨迹" ? <AgentTrace agent={apiAgent} /> : null}
      {activeTab === "系统配置" ? <SystemConfig config={apiCfg} /> : null}
    </div>
  );
}

function Overview({ hasApi, dash }: { hasApi: boolean; dash: any }) {
  const metrics = hasApi && dash ? [
    { label: "今日问答", value: String(dash.today_question_count), note: "数字乡村实时咨询", tone: "green" as const },
    { label: "政策文档", value: String(dash.document_count), note: "已入库政策文件", tone: "blue" as const },
    { label: "文档切片", value: String(dash.chunk_count), note: "可检索知识片段", tone: "amber" as const },
    { label: "活跃文档", value: String(dash.active_document_count), note: "已启用生效文档", tone: "green" as const },
  ] : dashboardMetrics;

  return (
    <div className="grid gap-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric, index) => (
          <StatCard key={metric.label} label={metric.label} value={metric.value} note={metric.note}
            tone={metric.tone} icon={[MessageSquareText, ClipboardList, FileText, Users][index]} />
        ))}
      </div>

      {hasApi && dash && dash.top_policy_categories && dash.top_policy_categories.length > 0 && (
        <SectionCard title="政策分类分布" description="已入库文档按政策分类统计。">
          <div className="space-y-3">
            {dash.top_policy_categories.map((c: any) => {
              const pct = dash.document_count ? Math.round((c.count / dash.document_count) * 100) : 0;
              return (
                <div key={c.name}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span>{c.name}</span><span>{c.count} 份 ({pct}%)</span>
                  </div>
                  <div className="h-3 rounded-full bg-[var(--muted)]">
                    <div className="h-3 rounded-full bg-[var(--primary)]" style={{ width: String(pct) + "%" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>
      )}
    </div>
  );
}

function HotQuestions({ hots }: { hots: any[] | null }) {
  const items = hots && hots.length > 0 ? hots : null;
  return (
    <SectionCard title="热门问题看板" description={items ? "来自后端实时数据" : "本地示例数据"}>
      <div className="table-scroll">
        <table className="w-full min-w-[680px] border-separate border-spacing-y-2 text-left text-sm">
          <thead>
            <tr className="text-[var(--muted-foreground)]">
              <th className="px-3 py-2">问题</th><th className="px-3 py-2">分类</th><th className="px-3 py-2">次数</th><th className="px-3 py-2">最近出现</th>
            </tr>
          </thead>
          <tbody>
            {items
              ? items.map((item) => (
                  <tr key={item.id} className="bg-white">
                    <td className="rounded-l-md border-y border-l px-3 py-3 font-medium">{item.question_text}</td>
                    <td className="border-y px-3 py-3">{item.policy_category || "-"}</td>
                    <td className="border-y px-3 py-3">{item.hit_count}</td>
                    <td className="rounded-r-md border-y border-r px-3 py-3 text-muted-foreground">
                      {item.last_asked_at ? new Date(item.last_asked_at).toLocaleString() : "-"}
                    </td>
                  </tr>
                ))
              : hotQuestions.map((item) => (
                  <tr key={item.question} className="bg-white">
                    <td className="rounded-l-md border-y border-l px-3 py-3 font-medium">{item.question}</td>
                    <td className="border-y px-3 py-3">{item.category}</td>
                    <td className="border-y px-3 py-3">{item.count}</td>
                    <td className="rounded-r-md border-y border-r px-3 py-3 text-muted-foreground">{item.time}</td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}

function Knowledge() {
  return (
    <SectionCard title="政策知识库" description="集中管理数字乡村政策资料和服务依据。">
      <div className="grid gap-3">
        {policyDocuments.map((doc) => (
          <div key={doc.title} className="rounded-md border border-[var(--border)] bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <BookOpenCheck className="size-5 text-[var(--primary)]" aria-hidden="true" />
                <p className="font-semibold text-[var(--foreground)]">{doc.title}</p>
              </div>
              <span className="rounded-md bg-emerald-50 px-2.5 py-1 text-xs text-emerald-800">{doc.category}</span>
            </div>
            <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">{doc.summary}</p>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

function ServiceCases() {
  const rows = [
    ["农机购置补贴", "办事引导", "材料缺口检查", "运行中"],
    ["合作社办理", "办事引导", "流程步骤", "运行中"],
    ["返乡创业贷款", "政策问答", "条件初判", "运行中"],
    ["医保养老代办", "办事引导", "代办风险提醒", "运行中"],
  ];

  return (
    <SectionCard title="事项服务" description="展示事项、推荐模块、核心能力和当前状态。">
      <div className="grid gap-3 md:grid-cols-2">
        {rows.map(([name, module, ability, status]) => (
          <div key={name} className="rounded-md border border-[var(--border)] bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="font-semibold text-[var(--foreground)]">{name}</p>
              <span className="rounded-md bg-sky-50 px-2.5 py-1 text-xs text-sky-800">{status}</span>
            </div>
            <p className="mt-3 text-sm text-[var(--muted-foreground)]">推荐模块：{module}</p>
            <p className="mt-2 text-sm text-[var(--muted-foreground)]">核心能力：{ability}</p>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

function AgricultureRecords() {
  const records = [
    ["苹果卖不出去", "农产品销售与品牌建设", "直播助农 + 品牌包装", "高"],
    ["建设智慧农业示范点", "农业生产数字化", "小场景传感试点", "中"],
    ["农民不会直播", "数字能力培训", "分层培训 + 试播复盘", "中"],
  ];

  return (
    <SectionCard title="智慧农业诊断记录" description="用于展示农业问题如何被结构化成方案和线索。">
      <div className="grid gap-3">
        {records.map(([problem, type, solution, value]) => (
          <div key={problem} className="grid gap-3 rounded-md border border-[var(--border)] bg-white p-4 md:grid-cols-[1fr_1fr_1fr_auto]">
            <p className="font-semibold text-[var(--foreground)]">{problem}</p>
            <p className="text-sm text-[var(--muted-foreground)]">{type}</p>
            <p className="text-sm text-[var(--muted-foreground)]">{solution}</p>
            <span className="rounded-md bg-amber-50 px-2.5 py-1 text-center text-xs text-amber-900">项目价值：{value}</span>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

function AgentTrace({ agent }: { agent: any }) {
  const traceSteps = agent && agent.nodes
    ? agent.nodes.map((n: any, i: number) => String(i + 1) + ". " + n.label + "  ·  " + n.description)
    : agentTrace;
  return (
    <div className="grid gap-6">
      {agent && (
        <SectionCard title="Agent 编排图" description={agent.description}>
          <p className="mb-4 text-sm font-medium">版本: {agent.version} | 节点: {agent.nodes.length} | 边: {agent.edges.length}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {agent.nodes.map((node: any) => (
              <div key={node.id}>
                <p className="font-semibold">{node.label} <span className="text-xs text-sky-800">({node.type})</span></p>
                <p className="text-sm text-muted-foreground">{node.description}</p>
              </div>
            ))}
          </div>
        </SectionCard>
      )}
      <SectionCard title="Agent 运行轨迹" description={agent ? "实时编排节点" : "示例处理链路"}>
        <div className="grid gap-3">
          {traceSteps.map((step: string, index: number) => (
            <div key={index} className="grid grid-cols-[42px_1fr] gap-3 rounded-md border bg-white p-4">
              <span className="flex size-9 items-center justify-center rounded-md bg-[var(--muted)] font-semibold text-[var(--primary)]">
                {index + 1}
              </span>
              <div>
                <p className="font-semibold">{step}</p>
                <p className="mt-1 text-sm text-muted-foreground">耗时 {180 + index * 65}ms · {agent ? "已注册" : "已完成"}</p>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

function SystemConfig({ config }: { config: any }) {
  const hasCfg = config && config.model_service;
  return (
    <SectionCard title="系统配置" description={hasCfg ? "数字乡村运行时配置" : "静态配置参考"}>
      <div className="grid gap-3 md:grid-cols-2">
        <CfgItem icon={Settings} label="模型" value={hasCfg ? config.model_service.model : "sensenova-6.7-flash-lite"} />
        <CfgItem icon={Activity} label="Provider" value={hasCfg ? config.model_service.provider : "http"} />
        <CfgItem icon={Bot} label="API 密钥" value={hasCfg ? (config.model_service.api_key_status === "configured" ? "已配置" : "未配置") : "已配置"} />
        <CfgItem icon={FileText} label="协议" value={hasCfg ? config.model_service.compatible_protocol : "OpenAI-compatible"} />
        <CfgItem icon={Settings} label="热更新" value={hasCfg ? config.edit_mode : "runtime_hot_update"} />
        <CfgItem icon={BarChart3} label="超时" value={hasCfg ? config.model_service.timeout_seconds + "s" : "180s"} />
      </div>
    </SectionCard>
  );
}

function CfgItem({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="rounded-md border bg-white p-4">
      <div className="flex items-center gap-2">
        <Icon className="size-5 text-[var(--primary)]" />
        <p className="text-sm font-semibold">{label}</p>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{value}</p>
    </div>
  );
}
