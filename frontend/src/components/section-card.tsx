import type { ReactNode } from "react";

type SectionCardProps = {
  title: string;
  description: string;
  action?: ReactNode;
  children?: ReactNode;
};

export function SectionCard({
  title,
  description,
  action,
  children,
}: SectionCardProps) {
  return (
    <section className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-card-foreground">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        {action}
      </div>
      {children ? <div className="mt-4">{children}</div> : null}
    </section>
  );
}

