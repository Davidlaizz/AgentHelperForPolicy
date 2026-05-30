import type { LucideIcon } from "lucide-react";

type StatCardProps = {
  label: string;
  value: string;
  note: string;
  icon: LucideIcon;
  tone?: "green" | "blue" | "amber" | "red";
};

const toneClass = {
  green: "bg-emerald-50 text-emerald-800",
  blue: "bg-sky-50 text-sky-800",
  amber: "bg-amber-50 text-amber-800",
  red: "bg-rose-50 text-rose-800",
};

export function StatCard({ label, value, note, icon: Icon, tone = "green" }: StatCardProps) {
  return (
    <div className="surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-[var(--muted-foreground)]">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-[var(--foreground)]">{value}</p>
        </div>
        <div className={`flex size-10 items-center justify-center rounded-md ${toneClass[tone]}`}>
          <Icon className="size-5" aria-hidden="true" />
        </div>
      </div>
      <p className="mt-3 text-sm leading-6 text-[var(--muted-foreground)]">{note}</p>
    </div>
  );
}
