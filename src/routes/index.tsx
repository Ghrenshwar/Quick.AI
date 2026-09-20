import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight, Images, PenLine, Share2, Sparkles, Wand2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Panel } from "@/components/studio";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Quick.AI — One workspace for AI content" },
      {
        name: "description",
        content:
          "Generate images, edit visuals, write blog posts, and spin them into social snippets — all in one AI workspace.",
      },
      { property: "og:title", content: "Quick.AI — One workspace for AI content" },
      {
        property: "og:description",
        content:
          "Generate images, edit visuals, write blog posts, and spin them into social snippets — all in one AI workspace.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Landing,
});

const TOOLS = [
  {
    icon: Sparkles,
    name: "Generate",
    blurb: "Describe any visual and watch it render in real time — square, portrait, or landscape.",
  },
  {
    icon: Wand2,
    name: "Edit",
    blurb: "Upload a photo or pick one from your library, then restyle it with a single instruction.",
  },
  {
    icon: PenLine,
    name: "Write",
    blurb: "Turn a one-line brief into a structured, on-tone blog draft you can refine and publish.",
  },
  {
    icon: Share2,
    name: "Snippets",
    blurb: "Spin any post into ready-to-paste social copy for X, LinkedIn, Instagram, and email.",
  },
];

const STEPS = [
  { n: "01", title: "Create your account", body: "One sign-in unlocks every tool and your private media library." },
  { n: "02", title: "Make the asset", body: "Generate or edit an image, or draft a post from a short brief." },
  { n: "03", title: "Ship it everywhere", body: "Save to your library, export, and turn posts into social snippets." },
];

function Landing() {
  return (
    <div className="studio-bg min-h-screen bg-background text-foreground">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <span className="font-mono text-sm font-medium tracking-widest">
          QUICK<span className="text-primary">.</span>AI
        </span>
        <nav className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/auth">Sign in</Link>
          </Button>
          <Button size="sm" asChild>
            <Link to="/auth">Start creating</Link>
          </Button>
        </nav>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-6 pb-24 pt-16 md:pt-24">
          <p className="label-mono text-primary">AI content workspace</p>
          <h1 className="mt-5 max-w-3xl font-display text-5xl font-semibold leading-[1.05] tracking-tight md:text-7xl">
            One studio.
            <br />
            Every <span className="text-primary">content task.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground">
            Generate images, retouch visuals, draft blog posts, and spin them into social snippets —
            without juggling four subscriptions or leaving this tab.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Button size="lg" asChild>
              <Link to="/auth">
                Start creating <ArrowRight />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <a href="#tools">Explore the tools</a>
            </Button>
          </div>
          <div className="mt-14 flex flex-wrap gap-x-8 gap-y-2 font-mono text-xs uppercase tracking-widest text-muted-foreground">
            <span>Image generation + editing</span>
            <span className="text-primary">/</span>
            <span>Long-form blog drafts</span>
            <span className="text-primary">/</span>
            <span>Social snippets in one click</span>
          </div>
        </section>

        <section id="tools" className="border-t border-border bg-card/30">
          <div className="mx-auto max-w-6xl px-6 py-20">
            <p className="label-mono text-muted-foreground">The toolbox</p>
            <h2 className="mt-3 font-display text-3xl font-semibold md:text-4xl">
              Four tools, zero context-switching
            </h2>
            <div className="mt-10 grid gap-4 md:grid-cols-2">
              {TOOLS.map((tool) => (
                <Panel key={tool.name} className="group p-6 transition-colors hover:border-primary/40">
                  <div className="flex items-start justify-between">
                    <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <tool.icon className="h-5 w-5" />
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                  </div>
                  <h3 className="mt-5 font-display text-xl font-semibold">{tool.name}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{tool.blurb}</p>
                </Panel>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-border">
          <div className="mx-auto max-w-6xl px-6 py-20">
            <p className="label-mono text-muted-foreground">How it works</p>
            <div className="mt-10 grid gap-10 md:grid-cols-3">
              {STEPS.map((step) => (
                <div key={step.n}>
                  <p className="font-mono text-sm text-primary">{step.n}</p>
                  <h3 className="mt-3 font-display text-lg font-semibold">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
                </div>
              ))}
            </div>
            <div className="mt-16 flex flex-col items-start gap-4 rounded-xl border border-border bg-card p-8 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="font-display text-2xl font-semibold">Your next post is one brief away.</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Free to start — your library stays private to your account.
                </p>
              </div>
              <Button size="lg" asChild>
                <Link to="/auth">
                  Open the studio <ArrowRight />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-6">
          <span className="font-mono text-xs tracking-widest text-muted-foreground">
            QUICK<span className="text-primary">.</span>AI
          </span>
          <span className="flex items-center gap-2 text-xs text-muted-foreground">
            <Images className="h-3.5 w-3.5" /> AI-powered content studio
          </span>
        </div>
      </footer>
    </div>
  );
}
