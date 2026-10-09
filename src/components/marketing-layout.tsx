import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { useState } from "react";

const NAV = [
  { to: "/for-sales", label: "Sales" },
  { to: "/for-technicians", label: "Technicians" },
  { to: "/for-operations", label: "Operations" },
  { to: "/marketing-admin", label: "Marketing & Admin" },
] as const;

export function MarketingLayout({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div className="marketing-site min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-4 px-5 sm:px-8">
          <Link to="/" className="text-xl font-bold" aria-label="Systemize home">
            SYSTEM<span className="text-primary">IZE</span><span className="ml-1 text-primary">.</span>
          </Link>
          <nav aria-label="Main navigation" className="hidden items-center gap-7 lg:flex">
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
          <div className="flex items-center gap-2">
            <Button asChild size="sm" className="h-10"><Link to="/demo">Explore demo <ArrowUpRight className="size-4" /></Link></Button>
            <Button variant="ghost" size="icon" className="lg:hidden" aria-label={menuOpen ? "Close menu" : "Open menu"} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X /> : <Menu />}</Button>
          </div>
        </div>
        {menuOpen && <nav aria-label="Mobile navigation" className="grid border-t border-border px-5 py-4 lg:hidden">{NAV.map(n => <Link key={n.to} to={n.to} onClick={() => setMenuOpen(false)} className="py-3 text-sm text-muted-foreground" activeProps={{ className: "text-primary" }}>{n.label}</Link>)}</nav>}
      </header>

      <main>{children}</main>

      <footer className="border-t border-border">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-12 sm:px-8 md:grid-cols-[2fr_1fr_1fr]">
          <div>
            <span className="display-title text-xl font-bold">
              System<span className="text-primary">ize</span>
            </span>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              From the first enquiry to the final handoff. One connected workspace for automotive restyling shops.
            </p>
            <p className="mt-5 text-xs text-muted-foreground">Interactive prototype · Screens show sample shop data.</p>
          </div>
          <nav aria-label="Product pages" className="flex flex-col gap-3 text-sm text-muted-foreground">
            {NAV.map((n) => (
              <Link key={n.to} to={n.to} className="hover:text-foreground">
                {n.label}
              </Link>
            ))}
          </nav>
          <nav aria-label="More about Systemize" className="flex flex-col gap-3 text-sm text-muted-foreground">
            <Link to="/platform" className="hover:text-foreground">Platform overview</Link>
            <Link to="/workflow" className="hover:text-foreground">The vehicle journey</Link>
            <Link to="/connect" className="hover:text-foreground">Integrations</Link>
            <Link to="/faq" className="hover:text-foreground">FAQ</Link>
            <Link to="/demo" className="hover:text-foreground">Open the demo <ArrowUpRight className="inline size-3" /></Link>
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
