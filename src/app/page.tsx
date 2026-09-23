import Link from "next/link";
import { ArrowRight, Award, BookOpen, BriefcaseBusiness, Bug, CodeXml, GraduationCap, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata("Digital credentials", "A dedicated home for UZYNTRA Security achievements and professional recognition. Explore the platform and upcoming credential verification.", "/");

const categories = [
  { title: "Course certificates", description: "Learning milestones and completed training.", icon: GraduationCap },
  { title: "Internships", description: "Practical experience and internship completion.", icon: BookOpen },
  { title: "Employment", description: "Professional experience with UZYNTRA.", icon: BriefcaseBusiness },
  { title: "Contributions", description: "Meaningful contributions to our community.", icon: CodeXml },
  { title: "Bug bounty recognition", description: "Responsible research and security discoveries.", icon: Bug },
  { title: "Appreciation awards", description: "Exceptional effort and lasting impact.", icon: Award },
];

export default function HomePage() {
  return <div className="mx-auto max-w-6xl px-6 py-16 sm:py-24">
    <section aria-labelledby="hero-heading" className="grid items-center gap-12 lg:grid-cols-[1.35fr_1fr]">
      <div>
        <p className="mb-7 flex items-center gap-3 font-mono text-xs uppercase tracking-[0.18em] text-primary"><span className="size-1.5 rounded-full bg-primary" /> UZYNTRA Security / Certs</p>
        <h1 id="hero-heading" className="text-5xl font-semibold leading-[1.08] tracking-tight sm:text-7xl">Recognition.<br /><span className="text-muted-foreground">Built on trust.</span></h1>
        <p className="mt-7 max-w-xl text-lg leading-relaxed text-muted-foreground">Every achievement has a story. We’re building a dedicated place to connect UZYNTRA credentials with the people who earned them.</p>
        <div className="mt-8 flex flex-wrap gap-3"><Button asChild size="lg"><Link href="/verify">Explore verification <ArrowRight aria-hidden="true" /></Link></Button><Button asChild size="lg" variant="outline"><Link href="/about">About the platform</Link></Button></div>
        <p className="mt-5 text-xs text-muted-foreground">Platform preview. Credential verification is not available yet.</p>
      </div>
      <div className="relative overflow-hidden rounded-2xl border bg-card p-8 sm:p-10">
        <div aria-hidden="true" className="absolute -right-12 -top-12 size-56 rounded-full bg-primary/10 blur-3xl" />
        <p className="relative font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">The UZYNTRA standard</p>
        <ShieldCheck aria-hidden="true" strokeWidth={1} className="relative my-9 size-20 text-primary" />
        <h2 className="relative text-2xl font-semibold tracking-tight">A clearer picture<br />of every achievement.</h2>
        <p className="relative mt-4 text-sm leading-relaxed text-muted-foreground">Designed for learners, professionals, contributors, and the organizations that recognize their work.</p>
        <div className="relative mt-8 border-t pt-5 text-xs text-muted-foreground">One platform. Six forms of recognition.</div>
      </div>
    </section>
    <section aria-labelledby="recognition-heading" className="mt-24">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4"><div><p className="mb-3 font-mono text-xs uppercase tracking-[0.18em] text-primary">Planned credential categories</p><h2 id="recognition-heading" className="text-3xl font-semibold tracking-tight">Recognition in every form.</h2></div><span className="rounded-full border px-3 py-1 text-xs text-muted-foreground">Coming in future phases</span></div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{categories.map(({ title, description, icon: Icon }) => <Card key={title}><CardHeader><Icon aria-hidden="true" className="mb-4 size-6 text-primary" /><CardTitle>{title}</CardTitle><CardDescription>{description}</CardDescription></CardHeader></Card>)}</div>
    </section>
  </div>;
}
