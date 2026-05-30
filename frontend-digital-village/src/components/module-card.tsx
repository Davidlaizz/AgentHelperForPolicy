import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight } from "lucide-react";

type ModuleCardProps = {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
  tone: "green" | "blue" | "amber";
  points: string[];
};

const toneClass = {
  green: "bg-emerald-50 text-emerald-800 border-emerald-100",
  blue: "bg-sky-50 text-sky-800 border-sky-100",
  amber: "bg-amber-50 text-amber-900 border-amber-100",
};

export function ModuleCard({ href, title, description, icon: Icon, tone, points }: ModuleCardProps) {
  return (
    <Link href={href} className="focus-ring surface group block p-5 transition-colors hover:bg-white/70">
      <div className="flex items-start justify-between gap-4">
        <div className={`flex size-11 items-center justify-center rounded-md border ${toneClass[tone]}`}>
          <Icon className="size-5" aria-hidden="true" />
        </div>
        <ArrowRight className="mt-2 size-5 text-[var(--muted-foreground)] transition-transform group-hover:translate-x-1" />
      </div>
      <h2 className="mt-5 text-xl font-semibold text-[var(--foreground)]">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">{description}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {points.map((point) => (
          <span key={point} className="rounded-md bg-[var(--muted)] px-2.5 py-1 text-xs text-[var(--foreground)]">
            {point}
          </span>
        ))}
      </div>
    </Link>
  );
}
