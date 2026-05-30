"use client";

import { useState } from "react";
import {
  Activity,
  BarChart3,
  BookOpenCheck,
  Bot,
  ClipboardList,
  FileText,
  MessageSquareText,
  Settings,
  Users,
} from "lucide-react";

import { PageHeading } from "@/components/page-heading";
import { SectionCard } from "@/components/section-card";
import { StatCard } from "@/components/stat-card";
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

      {activeTab === "总览看板" ? <Overview /> : null}
      {activeTab === "高频问题" ? <HotQuestions /> : null}
      {activeTab === "政策知识库" ? <Knowledge /> : null}
      {activeTab === "事项服务" ? <ServiceCases /> : null}
      {activeTab === "智慧农业诊断" ? <AgricultureRecords /> : null}
      {activeTab === "Agent 运行轨迹" ? <AgentTrace /> : null}
      {activeTab === "系统配置" ? <SystemConfig /> : null}
    </div>
  );
}

function Overview() {
  return (
    <div className="grid gap-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {dashboardMetrics.map((metric, index) => (
          <StatCard
            key={metric.label}
            label={metric.label}
            value={metric.value}
            note={metric.note}
            tone={metric.tone}
            icon={[MessageSquareText, ClipboardList, FileText, Users][index]}
          />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="主体类型分布" description="用于判断平台主要服务对象和资料补齐方向。">
          <div className="space-y-3">
            {subjectDistribution.map((item) => (
              <div key={item.label}>
                <div className="mb-1 flex justify-between text-sm">
                  <span>{item.label}</span>
                  <span>{item.value}%</span>
                </div>
                <div className="h-3 rounded-full bg-[var(--muted)]">
                  <div className="h-3 rounded-full bg-[var(--primary)]" style={{ width: `${item.value}%` }} />
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="材料缺口排行" description="高频缺口可以反向优化办事引导和资料提醒。">
          <div className="space-y-3">
            {materialGaps.map((item) => (
              <div key={item.name} className="flex min-h-12 items-center justify-between rounded-md bg-[var(--muted)] px-3 text-sm">
                <span>{item.name}</span>
                <span className="font-semibold text-[var(--primary)]">{item.count} 次</span>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

function HotQuestions() {
  return (
    <SectionCard title="热门问题看板" description="按用户咨询次数排序，辅助发现高频政策和服务需求。">
      <div className="table-scroll">
        <table className="w-full min-w-[680px] border-separate border-spacing-y-2 text-left text-sm">
          <thead>
            <tr className="text-[var(--muted-foreground)]">
              <th className="px-3 py-2">问题</th>
              <th className="px-3 py-2">分类</th>
              <th className="px-3 py-2">次数</th>
              <th className="px-3 py-2">最近出现</th>
            </tr>
          </thead>
          <tbody>
            {hotQuestions.map((item) => (
              <tr key={item.question} className="bg-white">
                <td className="rounded-l-md border-y border-l border-[var(--border)] px-3 py-3 font-medium">{item.question}</td>
                <td className="border-y border-[var(--border)] px-3 py-3">{item.category}</td>
                <td className="border-y border-[var(--border)] px-3 py-3">{item.count}</td>
                <td className="rounded-r-md border-y border-r border-[var(--border)] px-3 py-3 text-[var(--muted-foreground)]">{item.time}</td>
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

function AgentTrace() {
  return (
    <SectionCard title="Agent 运行轨迹" description="展示一次咨询从识别到沉淀的处理链路。">
      <div className="grid gap-3">
        {agentTrace.map((step, index) => (
          <div key={step} className="grid grid-cols-[42px_1fr] gap-3 rounded-md border border-[var(--border)] bg-white p-4">
            <span className="flex size-9 items-center justify-center rounded-md bg-[var(--muted)] font-semibold text-[var(--primary)]">
              {index + 1}
            </span>
            <div>
              <p className="font-semibold text-[var(--foreground)]">{step}</p>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">耗时 {180 + index * 65}ms · 已完成</p>
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

function SystemConfig() {
  const configs = [
    ["前端模式", "服务工作台"],
    ["前端地址", "http://127.0.0.1:3001"],
    ["后端目标", "/api/digital-village/*"],
    ["数据来源", "数字乡村知识库"],
    ["隔离策略", "不调用高校 /api/* 接口"],
  ];
  const icons = [Settings, Activity, Bot, DatabaseIcon, BarChart3];

  return (
    <SectionCard title="系统配置" description="展示数字乡村服务的运行配置边界。">
      <div className="grid gap-3 md:grid-cols-2">
        {configs.map(([label, value], index) => {
          const ConfigIcon = icons[index];
          return (
            <div key={label} className="rounded-md border border-[var(--border)] bg-white p-4">
              <div className="flex items-center gap-2">
                <ConfigIcon className="size-5 text-[var(--primary)]" aria-hidden="true" />
                <p className="text-sm font-semibold text-[var(--foreground)]">{label}</p>
              </div>
              <p className="mt-3 text-sm leading-6 text-[var(--muted-foreground)]">{value}</p>
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}

function DatabaseIcon(props: React.ComponentProps<typeof Settings>) {
  return <FileText {...props} />;
}
