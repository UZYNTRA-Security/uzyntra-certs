type PageIntroProps = { eyebrow: string; title: string; description: string };

export function PageIntro({ eyebrow, title, description }: PageIntroProps) {
  return <div className="max-w-3xl">
    <p className="mb-5 font-mono text-xs uppercase tracking-[0.2em] text-primary">{eyebrow}</p>
    <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">{title}</h1>
    <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">{description}</p>
  </div>;
}
