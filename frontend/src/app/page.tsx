import Link from "next/link";
import { ArrowRight, FileCheck2, FileSearch, GraduationCap, Route, ShieldCheck } from "lucide-react";

import { SectionCard } from "@/components/section-card";

const quickEntries = [
  {
    href: "/chat",
    icon: FileSearch,
    title: "我要问政策",
    description: "适合先确认规则、范围和政策依据。",
  },
  {
    href: "/eligibility",
    icon: ShieldCheck,
    title: "我要判断资格",
    description: "围绕奖学金、转专业、毕业要求补充条件并判断是否符合。",
  },
  {
    href: "/cases",
    icon: Route,
    title: "我要办理事项",
    description: "按事项查看材料、步骤、时间节点和办理部门。",
  },
];

const cases = ["奖学金", "助学金", "转专业", "保研", "毕业", "请假", "处分", "学籍"];

export default function Home() {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-6 py-6">
      <section className="grid gap-6 lg:grid-cols-[1.4fr_0.9fr]">
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <GraduationCap className="size-4" />
            西安电子科技大学高校政策服务样板
          </div>
          <div className="mt-4 max-w-2xl space-y-3">
            <h1 className="text-3xl font-semibold text-card-foreground">
              说出你的情况，系统帮你找到政策依据、判断条件并生成办理路径。
            </h1>
            <p className="text-sm leading-6 text-muted-foreground">
              当前聚焦奖学金、转专业、毕业要求三条主链路，后续扩展助学金、保研、
              请假、处分和学籍管理。
            </p>
          </div>
          <div className="mt-6 rounded-lg border border-dashed border-border bg-background p-4">
            <p className="text-sm font-medium text-foreground">演示输入示例</p>
            <div className="mt-3 grid gap-2">
              <div className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
                我挂过一门课，还能申请奖学金吗？
              </div>
              <div className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
                我大一绩点 3.4，想转计算机专业，可以吗？
              </div>
              <div className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
                我学分不够会影响毕业吗？
              </div>
            </div>
          </div>
        </div>

        <SectionCard
          title="可信输出"
          description="回答必须引用政策来源，并区分政策依据与 AI 推断。"
        >
          <div className="space-y-3 text-sm text-muted-foreground">
            <div className="flex items-start gap-3 rounded-md bg-muted p-3">
              <FileCheck2 className="mt-0.5 size-4 text-foreground" />
              <p>已上传政策文件、附件、通知页快照都将纳入统一知识库。</p>
            </div>
            <div className="flex items-start gap-3 rounded-md bg-muted p-3">
              <ShieldCheck className="mt-0.5 size-4 text-foreground" />
              <p>对条件缺失、版本冲突或过期政策，系统会保留风险提示。</p>
            </div>
          </div>
        </SectionCard>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
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

      <SectionCard
        title="快捷事项"
        description="按事项进入知识库和办理路径，避免首页只剩一个聊天框。"
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {cases.map((item) => (
            <div
              key={item}
              className="rounded-md border border-border bg-background px-4 py-3 text-sm font-medium text-foreground"
            >
              {item}
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

