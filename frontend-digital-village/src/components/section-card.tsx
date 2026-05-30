import type { ReactNode } from "react";

type SectionCardProps = {
  title: string;
  description?: string;
  eyebrow?: string;
  action?: ReactNode;
  children: ReactNode;
};

export function SectionCard({ title, description, eyebrow, action, children }: SectionCardProps) {
  return (
    <section className="surface p-5 md:p-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          {eyebrow ? (
            <p className="mb-2 text-xs font-semibold uppercase tracking-normal text-[var(--secondary)]">{eyebrow}</p>
          ) : null}
          <h2 className="text-xl font-semibold leading-tight text-[var(--foreground)]">{title}</h2>
          {description ? (
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted-foreground)]">{description}</p>
          ) : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
