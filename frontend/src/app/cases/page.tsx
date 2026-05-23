import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowRight,
  BookMarked,
  CalendarClock,
  FileText,
  GraduationCap,
  MessageSquareText,
  Route,
  ShieldCheck,
} from "lucide-react";

import { SectionCard } from "@/components/section-card";

const cases = [
  {
    title: "转专业 / 大类分流",
    category: "转专业",
    description: "判断年级、绩点、挂科、处分、目标专业和申请时间是否满足要求。",
    questions: ["我能转专业吗？", "转专业需要准备哪些材料？", "大类专业分流系统在哪里进入？"],
    materials: ["成绩或排名信息", "目标专业信息", "系统志愿填报记录", "学院补充要求"],
    steps: ["确认申请批次", "补齐资格条件", "提交志愿或申请", "等待学院/学校审核"],
    icon: ShieldCheck,
  },
  {
    title: "奖学金评定",
    category: "奖学金",
    description: "围绕挂科、排名、综合测评和纪律处分判断奖学金资格风险。",
    questions: ["我挂过一门课，还能申请奖学金吗？", "奖学金申请需要满足什么条件？"],
    materials: ["成绩排名", "综合测评结果", "获奖证明", "学院评审通知"],
    steps: ["确认评奖类别", "核对基础条件", "准备证明材料", "等待公示与复核"],
    icon: BookMarked,
  },
  {
    title: "毕业设计 / 论文",
    category: "毕业要求",
    description: "处理校外做论文、盲审、答辩、申请表和附件定位问题。",
    questions: ["校外做毕业论文需要什么申请表？", "毕业论文盲审不通过怎么办？"],
    materials: ["校外做毕业设计（论文）申请表", "校外单位邀请函或接收函", "盲审意见书"],
    steps: ["确认适用条款", "填写申请表", "学院与教务处审批", "按要求完成答辩或修改"],
    icon: GraduationCap,
  },
  {
    title: "学籍信息变更",
    category: "学籍管理",
    description: "查询学籍变更表、材料要求、审核路径和办理部门。",
    questions: ["学籍信息变更需要哪些材料？", "信息变更申请表在哪里？"],
    materials: ["学籍信息变更申请表", "身份证明", "学院审核意见", "教务处材料要求"],
    steps: ["核对变更类型", "准备证明材料", "学院审核", "教务处办理"],
    icon: FileText,
  },
];

export default function CasesPage() {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-6 md:px-6">
      <SectionCard
        title="事项中心"
        description="按办事事项组织政策、常见问题、材料和流程，适合从“我要办什么”进入。"
      >
        <div className="grid gap-4 md:grid-cols-2">
          {cases.map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.title} className="rounded-lg border border-border bg-background p-5">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-md bg-muted">
                      <Icon className="size-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-semibold text-foreground">{item.title}</h2>
                      <p className="text-xs text-muted-foreground">{item.category}</p>
                    </div>
                  </div>
                </div>
                <p className="text-sm leading-6 text-muted-foreground">{item.description}</p>

                <div className="mt-4 grid gap-4 xl:grid-cols-2">
                  <MiniBlock title="常见问题" icon={<MessageSquareText className="size-4" />} items={item.questions} />
                  <MiniBlock title="材料线索" icon={<FileText className="size-4" />} items={item.materials} />
                  <MiniBlock title="办理步骤" icon={<Route className="size-4" />} items={item.steps} />
                  <MiniBlock title="时间提醒" icon={<CalendarClock className="size-4" />} items={["以当年通知时间为准", "过期政策需人工复核"]} />
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
                    href={`/eligibility?case=${encodeURIComponent(item.category)}`}
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
