import Link from "next/link";
import {
  ArrowRight,
  BookOpenCheck,
  FileCheck2,
  FileSearch,
  GraduationCap,
  Library,
  Route,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { SectionCard } from "@/components/section-card";

const quickEntries = [
  {
    href: "/chat",
    icon: FileSearch,
    title: "我要问政策",
    description: "直接提问，系统返回政策依据、AI 推断和出处引用。",
  },
  {
    href: "/eligibility",
    icon: ShieldCheck,
    title: "我要判断资格",
    description: "围绕转专业、奖学金等事项补全条件并形成初判。",
  },
  {
    href: "/cases",
    icon: Route,
    title: "我要办理事项",
    description: "按事项查看常见问题、材料线索、流程和办理入口。",
  },
  {
    href: "/admin",
    icon: Library,
    title: "管理知识库",
    description: "上传政策、检查条款、维护标准答案和运营看板。",
  },
];

const caseCards = [
  { title: "奖学金", desc: "挂科、排名、综合测评与评奖资格", tone: "bg-blue-50 text-blue-800" },
  { title: "转专业", desc: "年级、绩点、挂科、目标专业与申请批次", tone: "bg-emerald-50 text-emerald-800" },
  { title: "毕业论文", desc: "校外做论文、盲审、答辩与申请表", tone: "bg-amber-50 text-amber-800" },
  { title: "学籍管理", desc: "信息变更、休复学、材料要求", tone: "bg-slate-100 text-slate-800" },
  { title: "保研", desc: "推免规则、排名要求和材料核查", tone: "bg-violet-50 text-violet-800" },
  { title: "请假", desc: "请假流程、审批层级和证明材料", tone: "bg-cyan-50 text-cyan-800" },
  { title: "处分", desc: "纪律处分、解除条件和影响提示", tone: "bg-rose-50 text-rose-800" },
  { title: "助学金", desc: "困难认定、申请材料和评审流程", tone: "bg-lime-50 text-lime-800" },
];

const demoFlow = [
  "管理员上传政策和附件",
  "系统解析并构建知识库",
  "学生自然语言提问",
  "Agent 追问缺失条件",
  "输出资格判断和办理路径",
];

export default function Home() {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-6 md:px-6">
      <section className="grid gap-6 lg:grid-cols-[1.45fr_0.85fr]">
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <GraduationCap className="size-4" />
            西安电子科技大学高校政策服务样板
          </div>
          <div className="mt-4 max-w-3xl space-y-3">
            <h1 className="text-3xl font-semibold leading-tight text-card-foreground md:text-4xl">
              从“问一句政策”到“办成一件事”的智能工作台
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
              智策通把政策文件、RAG 检索、Agent 追问、资格判断、材料清单和后台治理串成一条演示闭环。
            </p>
          </div>

          <div className="mt-6 rounded-lg border border-border bg-background p-4">
            <p className="text-sm font-medium text-foreground">稳定演示问题</p>
            <div className="mt-3 grid gap-2">
              {[
                "我挂过一门课，还能申请奖学金吗？",
                "我大一绩点 3.4，想转计算机专业，可以吗？",
                "校外做毕业论文需要什么申请表？",
              ].map((item) => (
                <Link
                  key={item}
                  href={`/chat?question=${encodeURIComponent(item)}`}
                  className="flex items-center justify-between rounded-md bg-muted px-3 py-2 text-sm text-foreground transition-colors hover:bg-accent"
                >
                  <span>{item}</span>
                  <ArrowRight className="size-4 text-muted-foreground" />
                </Link>
              ))}
            </div>
          </div>
        </div>

        <SectionCard
          title="可信输出"
          description="每次回答都要能解释、能追溯、能复核。"
        >
          <div className="space-y-3 text-sm text-muted-foreground">
            <div className="flex items-start gap-3 rounded-md bg-muted p-3">
              <FileCheck2 className="mt-0.5 size-4 text-foreground" />
              <p>政策依据、附件、页码、条款和原文片段统一展示。</p>
            </div>
            <div className="flex items-start gap-3 rounded-md bg-muted p-3">
              <ShieldCheck className="mt-0.5 size-4 text-foreground" />
              <p>条件不足或政策不确定时，系统保留风险提示，不下绝对结论。</p>
            </div>
            <div className="flex items-start gap-3 rounded-md bg-muted p-3">
              <Sparkles className="mt-0.5 size-4 text-foreground" />
              <p>Agent 会记录事项条件，避免多轮咨询里反复追问同一信息。</p>
            </div>
          </div>
        </SectionCard>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {quickEntries.map(({ href, icon: Icon, title, description }) => (
          <Link
            key={href}
            href={href}
            className="rounded-lg border border-border bg-card p-5 transition-colors hover:bg-muted/40"
          >
            <div className="flex items-center justify-between">
              <div className="flex size-10 items-center justify-center rounded-md bg-muted">
                <Icon className="size-5" />
              </div>
              <ArrowRight className="size-4 text-muted-foreground" />
            </div>
            <h2 className="mt-4 text-base font-semibold text-card-foreground">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
          </Link>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
        <SectionCard
          title="快捷事项"
          description="按事项进入知识库和办理路径，避免只靠聊天入口。"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            {caseCards.map((item) => (
              <Link
                key={item.title}
                href={`/cases?case=${encodeURIComponent(item.title)}`}
                className="rounded-md border border-border bg-background p-4 transition-colors hover:bg-muted/50"
              >
                <span className={`inline-flex rounded-md px-2 py-1 text-xs ${item.tone}`}>
                  {item.title}
                </span>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.desc}</p>
              </Link>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title="Demo 闭环"
          description="路演时按这个顺序展示，系统价值最清晰。"
        >
          <div className="space-y-3">
            {demoFlow.map((item, index) => (
              <div key={item} className="flex gap-3">
                <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary text-xs text-primary-foreground">
                  {index + 1}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{item}</p>
                  {index < demoFlow.length - 1 ? (
                    <div className="mt-3 h-5 w-px bg-border" />
                  ) : null}
                </div>
              </div>
            ))}
          </div>
          <Link
            href="/admin"
            className="mt-5 inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-sm text-primary-foreground"
          >
            <BookOpenCheck className="size-4" />
            进入后台演示
          </Link>
        </SectionCard>
      </section>
    </div>
  );
}
