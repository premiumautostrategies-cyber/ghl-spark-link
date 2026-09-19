import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

const NAV = [
  { to: "/platform", label: "Platform" },
  { to: "/workflow", label: "Workflow" },
  { to: "/connect", label: "Integrations" },
  { to: "/faq", label: "FAQ" },
] as const;

export function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
          <Link to="/" className="display-title text-2xl font-bold">
            System<span className="text-primary">ize</span>
          </Link>
          <nav className="hidden items-center gap-6 md:flex">
            {NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                activeProps={{ className: "text-foreground font-medium" }}
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <Button asChild size="sm">
            <Link to="/demo">Log in to demo</Link>
          </Button>
        </div>
      </header>

      <main>{children}</main>

      <footer className="border-t border-border">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 md:grid-cols-[2fr_1fr]">
          <div>
            <span className="display-title text-xl font-bold">
              System<span className="text-primary">ize</span>
            </span>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              Shop software for vehicle wrap, tint, PPF, ceramic and detailing studios. One record
              carries a vehicle from first enquiry through warranty.
            </p>
          </div>
          <nav className="flex flex-col gap-2 text-sm text-muted-foreground md:items-end">
            {NAV.map((n) => (
              <Link key={n.to} to={n.to} className="hover:text-foreground">
                {n.label}
              </Link>
            ))}
            <Link to="/demo" className="hover:text-foreground">
              Open the demo
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}

export function MarketingHero({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body: string;
}) {
  return (
    <section className="surface-grid border-b border-border/70">
      <div className="mx-auto max-w-6xl px-4 py-20">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">{eyebrow}</p>
        <h1 className="mt-5 max-w-3xl text-4xl font-bold uppercase leading-[1] tracking-tight md:text-6xl">
          {title}
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-muted-foreground">{body}</p>
      </div>
    </section>
  );
}
