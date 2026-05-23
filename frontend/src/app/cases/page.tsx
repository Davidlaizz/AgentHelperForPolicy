"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BookMarked,
  CalendarClock,
  FileText,
  Gavel,
  GraduationCap,
  HandCoins,
  Medal,
  MessageSquareText,
  Route,
  School,
  ShieldCheck,
} from "lucide-react";

import { SectionCard } from "@/components/section-card";

const cases = [
  {
    title: "奖学金评定",
    category: "奖学金",
    coverage: "已接入",
    description: "围绕挂科、排名、综合测评和纪律处分判断奖学金资格风险。",
    questions: ["我挂过一门课，还能申请奖学金吗？", "奖学金申请需要满足什么条件？"],
    materials: ["成绩排名", "综合测评结果", "获奖证明", "学院评审通知"],
    steps: ["确认评奖类别", "核对基础条件", "准备证明材料", "等待公示与复核"],
    risk: "处分、挂科、评审年度变化需复核学院通知。",
    icon: BookMarked,
  },
  {
    title: "助学金 / 学生资助",
    category: "助学金",
    coverage: "已接入",
    description: "覆盖国家助学金、困难认定、助学贷款、绿色通道和困难补助。",
    questions: ["家庭经济困难认定后怎么申请国家助学金？", "助学贷款和绿色通道有什么区别？"],
    materials: ["困难认定结果", "家庭经济情况说明", "资助系统申请记录", "学院补充证明"],
    steps: ["完成困难认定", "选择资助项目", "提交申请材料", "学院评审与公示"],
    risk: "资助金额和年度政策可能调整，以当年通知为准。",
    icon: HandCoins,
  },
  {
    title: "转专业 / 大类分流",
    category: "转专业",
    coverage: "已接入",
    description: "判断年级、绩点、挂科、处分、目标专业和申请时间是否满足要求。",
    questions: ["我能转专业吗？", "大类专业分流系统在哪里进入？"],
    materials: ["成绩或排名信息", "目标专业信息", "系统志愿填报记录", "学院补充要求"],
    steps: ["确认申请批次", "补齐资格条件", "提交志愿或申请", "等待学院/学校审核"],
    risk: "不同学院和年度批次可能有附加条件。",
    icon: ShieldCheck,
  },
  {
    title: "保研 / 推免",
    category: "保研",
    coverage: "已接入",
    description: "处理推免资格、排名、科研竞赛、外语成绩、挂科和处分风险。",
    questions: ["我有一次挂科还能保研吗？", "推免资格主要看哪些条件？"],
    materials: ["专业排名", "成绩单", "英语成绩", "科研竞赛证明", "无处分说明"],
    steps: ["确认推免范围", "核对成绩与排名", "准备加分材料", "学院推荐与学校审核"],
    risk: "保研属于高影响事项，学院实施细则和当年名额必须人工复核。",
    icon: Medal,
  },
  {
    title: "毕业 / 学位",
    category: "毕业要求",
    coverage: "已接入",
    description: "覆盖毕业审核、学分、四级/学位条件、结业换发和毕业论文。",
    questions: ["我学分不够会影响毕业吗？", "四级没过会不会影响学位？"],
    materials: ["培养方案学分核对", "成绩单", "毕业论文/答辩状态", "学位申请材料"],
    steps: ["核对毕业学分", "确认学位条件", "处理结业或延长学习", "学院初审与学校复核"],
    risk: "毕业、学位和结业换发有时间窗口，需按毕业审核截止日处理。",
    icon: GraduationCap,
  },
  {
    title: "请假 / 休复学",
    category: "请假",
    coverage: "已接入",
    description: "覆盖新生请假、暂缓注册、休学、保留学籍、复学和证明材料。",
    questions: ["因病休学需要什么证明？", "新生不能按时报到请假多久以内有效？"],
    materials: ["请假说明", "二级甲等及以上医院证明", "校医院复查意见", "学院审核意见"],
    steps: ["确认请假或异动类型", "准备证明材料", "学院审核", "报本科生院审批"],
    risk: "请假逾期、休学期满未复学可能影响入学资格或学籍。",
    icon: CalendarClock,
  },
  {
    title: "处分 / 申诉影响",
    category: "处分",
    coverage: "已接入",
    description: "查询违纪处分类型、处理程序、申诉权利及对评奖保研毕业的影响。",
    questions: ["受到处分会影响保研吗？", "处分决定出来后还能申诉吗？"],
    materials: ["处分或调查通知", "事实说明", "申辩材料", "学院/学校处理意见"],
    steps: ["确认违纪类型", "核对处理阶段", "准备陈述申辩", "按程序申诉或复核影响"],
    risk: "处分事项风险最高，系统只做政策辅助，必须由主管部门确认。",
    icon: Gavel,
  },
  {
    title: "学籍管理",
    category: "学籍管理",
    coverage: "已接入",
    description: "覆盖学籍信息变更、注册、降级退学、学籍档案和学籍异动材料。",
    questions: ["学籍信息变更需要哪些材料？", "累计未通过学分会导致降级吗？"],
    materials: ["学籍信息变更申请表", "身份证明", "学院审核意见", "教务处材料要求"],
    steps: ["核对办理类型", "准备证明材料", "学院审核", "本科生院或教务部门办理"],
    risk: "姓名、出生日期、身份证号等关键信息变更需严格证明链。",
    icon: School,
  },
];

export default function CasesPage() {
  const [selectedCase, setSelectedCase] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const nextCase = params.get("case") ?? "";
    queueMicrotask(() => setSelectedCase(nextCase));
  }, []);

  const visibleCases = useMemo(() => {
    if (!selectedCase) return cases;
    return cases.filter((item) => item.category === selectedCase || item.title.includes(selectedCase));
  }, [selectedCase]);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-6 md:px-6">
      <SectionCard
        title="事项中心"
        description="V1.0 八类高校政策服务已统一接入政策库、常见问题、材料线索和 Agent 条件追问。"
      >
        <div className="mb-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSelectedCase("")}
            className={`h-8 rounded-md border px-3 text-sm ${
              selectedCase ? "border-border bg-background text-foreground" : "border-primary bg-primary text-primary-foreground"
            }`}
          >
            全部
          </button>
          {cases.map((item) => (
            <button
              key={item.category}
              type="button"
              onClick={() => setSelectedCase(item.category)}
              className={`h-8 rounded-md border px-3 text-sm ${
                selectedCase === item.category
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-foreground"
              }`}
            >
              {item.category}
            </button>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {visibleCases.map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.title} className="rounded-lg border border-border bg-background p-5">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted">
                      <Icon className="size-5" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-base font-semibold text-foreground">{item.title}</h2>
                      <p className="text-xs text-muted-foreground">{item.category}</p>
                    </div>
                  </div>
                  <span className="shrink-0 rounded-md bg-emerald-50 px-2 py-1 text-xs text-emerald-800">
                    {item.coverage}
                  </span>
                </div>
                <p className="text-sm leading-6 text-muted-foreground">{item.description}</p>

                <div className="mt-4 grid gap-4 xl:grid-cols-2">
                  <MiniBlock title="常见问题" icon={<MessageSquareText className="size-4" />} items={item.questions} />
                  <MiniBlock title="材料线索" icon={<FileText className="size-4" />} items={item.materials} />
                  <MiniBlock title="办理步骤" icon={<Route className="size-4" />} items={item.steps} />
                  <MiniBlock title="风险提醒" icon={<CalendarClock className="size-4" />} items={[item.risk]} />
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  <Link
                    href={`/chat?question=${encodeURIComponent(item.questions[0])}`}
                    className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-sm text-primary-foreground"
                  >
                    开始咨询
                    <ArrowRight className="size-4" />
                  </Link>
                  <Link
                    href={`/eligibility?case=${encodeURIComponent(item.category)}&question=${encodeURIComponent(item.questions[0])}`}
                    className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-background px-3 text-sm text-foreground"
                  >
                    进入资格判断
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </SectionCard>
    </div>
  );
}

function MiniBlock({
  title,
  icon,
  items,
}: {
  title: string;
  icon: ReactNode;
  items: string[];
}) {
  return (
    <div>
      <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
        {icon}
        {title}
      </h3>
      <ul className="space-y-1 text-xs leading-5 text-muted-foreground">
        {items.map((item) => (
          <li key={item}>- {item}</li>
        ))}
      </ul>
    </div>
  );
}
