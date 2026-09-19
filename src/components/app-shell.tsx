import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { AccentTheme } from "@/components/accent-theme";
import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Bot,
  Briefcase,
  CalendarRange,
  Car,
  ClipboardList,
  Command,
  CreditCard,
  FileText,
  Gauge,
  Layers,
  Package,
  Plug,
  Search,
  Sparkles,
  Settings,
  Users,
  ScanLine,
  Wrench,
} from "lucide-react";

type NavItem = { to: string; label: string; icon: LucideIcon };

const NAV_GROUPS: { group: string; items: NavItem[] }[] = [
  {
    group: "Sales",
    items: [
      { to: "/sales", label: "Pipeline", icon: Briefcase },
      { to: "/customers", label: "Customers", icon: Users },
      { to: "/vehicles", label: "Vehicles", icon: Car },
      { to: "/packages", label: "Packages", icon: Sparkles },
      { to: "/services", label: "Service Menu", icon: Layers },
      { to: "/payments", label: "Payments", icon: CreditCard },
    ],
  },
  {
    group: "Installation",
    items: [
      { to: "/schedule", label: "Bays", icon: CalendarRange },
      { to: "/jobs", label: "Production", icon: Wrench },
      { to: "/inspections", label: "Inspections", icon: ScanLine },
      { to: "/team", label: "Team", icon: Gauge },
    ],
  },
  {
    group: "Operations",
    items: [
      { to: "/command-center", label: "Command Center", icon: Command },
      { to: "/documents", label: "Documents", icon: FileText },
      { to: "/inventory", label: "Stock", icon: Package },
      { to: "/analytics", label: "Reports", icon: BarChart3 },
      { to: "/automations", label: "Automations", icon: Bot },
      { to: "/integrations", label: "Integrations", icon: Plug },
      { to: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

const NAV: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);

export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const isActive = (to: string) => pathname === to || pathname.startsWith(`${to}/`);

  const activeGroup = NAV_GROUPS.find((g) => g.items.some((i) => isActive(i.to)));
  const activeItem = activeGroup?.items.find((i) => isActive(i.to));

  return (
    <div className="flex min-h-screen bg-background">
      <AccentTheme />
      {/* Desktop sidebar */}
      <aside className="hidden w-[248px] flex-col border-r border-elevated bg-sidebar lg:flex">
        <div className="flex h-16 items-center px-5 hairline-b">
          <Link to="/command-center" className="display-title text-xl font-bold text-sidebar-foreground">
            System<span className="text-sidebar-primary">ize</span>
          </Link>
        </div>

        <div className="no-scrollbar flex-1 overflow-y-auto px-3 py-4">
          <p className="px-3 micro-label">{(activeGroup ?? NAV_GROUPS[0]!).group}</p>
          <nav className="mt-2 space-y-0.5">
            {(activeGroup ?? NAV_GROUPS[0]!).items.map((item) => (
              <Link
                key={item.to}
                to={item.to as never}
                className={cn(
                  "group flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors",
                  isActive(item.to)
                    ? "bg-surface-2 font-semibold text-foreground"
                    : "text-muted-foreground hover:bg-surface/70 hover:text-foreground",
                )}
              >
                <span
                  className={cn(
                    "h-4 w-px rounded-full transition-colors",
                    isActive(item.to) ? "bg-bronze" : "bg-transparent",
                  )}
                />
                <item.icon className={cn("size-4", isActive(item.to) && "text-bronze")} />
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="mt-auto border-t border-sidebar-border p-4">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            onClick={signOut}
          >
            Sign out
          </Button>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top command bar */}
        <header className="glass sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-elevated px-4">
          <Link to="/command-center" className="display-title text-xl font-bold lg:hidden">
            System<span className="text-primary">ize</span>
          </Link>
          {/* Section switcher */}
          <div className="hidden items-center gap-1 rounded-full border border-border/60 bg-secondary/40 p-1 md:flex">
            {NAV_GROUPS.map((g) => {
              const active = g.group === activeGroup?.group;
              const first = g.items[0]!;
              return (
                <Link
                  key={g.group}
                  to={first.to as never}
                  className={cn(
                    "rounded-full px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors",
                    active
                      ? "bg-surface-2 text-bronze shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {g.group}
                </Link>
              );
            })}
          </div>
          {activeItem && (
            <div className="hidden items-center gap-2 text-sm text-muted-foreground xl:flex">
              <span className="text-border">/</span>
              <span className="font-medium text-foreground">{activeItem.label}</span>
            </div>
          )}
          <div className="relative hidden max-w-md flex-1 md:block">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              readOnly
              placeholder="Search customers, vehicles, jobs…"
              className="h-9 w-full rounded-full border-border/60 bg-secondary/50 pl-9 text-sm"
            />
            <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-border bg-card px-1.5 py-0.5 text-[10px] text-muted-foreground md:block">
              ⌘K
            </kbd>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="ghost" size="icon" className="md:hidden" aria-label="Search">
              <Search className="size-4" />
            </Button>
            <Button variant="ghost" size="icon" aria-label="Notifications">
              <ClipboardList className="size-4" />
            </Button>
          </div>
        </header>

        {/* Mobile lower toolbar */}
        <nav className="flex gap-1 overflow-x-auto border-b border-border bg-sidebar px-2 py-2 lg:hidden">
          {(activeGroup ?? NAV_GROUPS[0]!).items.map((item) => (
            <Link
              key={item.to}
              to={item.to as never}
              className={cn(
                "flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium",
                isActive(item.to)
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/80",
              )}
            >
              <item.icon className="size-3.5" />
              {item.label}
            </Link>
          ))}
        </nav>

        <main className="min-w-0 flex-1 overflow-auto p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
