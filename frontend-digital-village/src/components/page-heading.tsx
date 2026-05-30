type PageHeadingProps = {
  eyebrow: string;
  title: string;
  description: string;
};

export function PageHeading({ eyebrow, title, description }: PageHeadingProps) {
  return (
    <div className="mb-6">
      <p className="text-sm font-semibold text-[var(--secondary)]">{eyebrow}</p>
      <h1 className="mt-2 max-w-4xl text-3xl font-semibold leading-tight text-[var(--foreground)] md:text-4xl">
        {title}
      </h1>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--muted-foreground)] md:text-base">
        {description}
      </p>
    </div>
  );
}
