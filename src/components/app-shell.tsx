import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
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
      { to: "/command-center", label: "Command Center", icon: Command },
      { to: "/sales", label: "Pipeline", icon: Briefcase },
      { to: "/customers", label: "Customers", icon: Users },
      { to: "/vehicles", label: "Vehicles", icon: Car },
      { to: "/services", label: "Service Menu", icon: Layers },
    ],
  },
  {
    group: "Operations",
    items: [
      { to: "/schedule", label: "Bays", icon: CalendarRange },
      { to: "/jobs", label: "Production", icon: Wrench },
      { to: "/inspections", label: "Inspections", icon: ScanLine },
      { to: "/documents", label: "Documents", icon: FileText },
    ],
  },
  {
    group: "Shop",
    items: [
      { to: "/inventory", label: "Stock", icon: Package },
      { to: "/payments", label: "Payments", icon: CreditCard },
      { to: "/team", label: "Team", icon: Gauge },
      { to: "/analytics", label: "Reports", icon: BarChart3 },
    ],
  },
  {
    group: "Setup",
    items: [
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

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden w-[248px] flex-col border-r border-elevated bg-sidebar lg:flex">
        <div className="flex h-16 items-center px-5 hairline-b">
          <Link to="/command-center" className="display-title text-xl font-bold text-sidebar-foreground">
            System<span className="text-sidebar-primary">ize</span>
          </Link>
        </div>

        <div className="no-scrollbar flex-1 overflow-y-auto px-3 py-4">
          {NAV_GROUPS.map((group) => (
            <div key={group.group} className="mb-5">
              <p className="px-3 micro-label">{group.group}</p>
              <nav className="mt-2 space-y-0.5">
                {group.items.map((item) => (
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
          ))}
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
      <div className="flex flex-1 flex-col">
        {/* Top command bar */}
        <header className="glass sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-elevated px-4">
          <Link to="/command-center" className="display-title text-xl font-bold lg:hidden">
            System<span className="text-primary">ize</span>
          </Link>
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

        {/* Mobile nav */}
        <nav className="flex gap-1 overflow-x-auto border-b border-border bg-sidebar px-2 py-2 lg:hidden">
          {NAV.map((item) => (
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

        <main className="flex-1 overflow-auto p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
