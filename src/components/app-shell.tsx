import { Link, useNavigate, useRouteContext, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Bell,
  Bot,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  ChevronDown,
  ClipboardCheck,
  Command,
  CreditCard,
  FileInput,
  FileText,
  GalleryVerticalEnd,
  Layers3,
  LogOut,
  Package,
  Plug,
  Search,
  Settings,
  Users,
  Wrench,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AccentTheme } from "@/components/accent-theme";
import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

type NavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  searchTerms?: string;
};

type NavSection = {
  label: string;
  icon: LucideIcon;
  items: NavItem[];
};

const PRIMARY_ITEMS: NavItem[] = [
  { to: "/command-center", label: "Command Center", icon: Command },
];

const SALES: NavSection = {
  label: "Sales",
  icon: BriefcaseBusiness,
  items: [
    { to: "/sales", label: "Pipeline", icon: BriefcaseBusiness },
    { to: "/sales", label: "Inbox", icon: GalleryVerticalEnd, searchTerms: "messages conversations" },
    { to: "/estimates", label: "Quotes", icon: FileText, searchTerms: "estimates proposals" },
  ],
};

const OPERATIONS: NavSection = {
  label: "Operations",
  icon: Building2,
  items: [
    { to: "/command-center", label: "Owner", icon: Building2 },
    { to: "/payments", label: "Payments", icon: CreditCard },
    { to: "/team", label: "Team", icon: Users },
    { to: "/analytics", label: "Reports", icon: BarChart3 },
    { to: "/inventory", label: "Inventory", icon: Package, searchTerms: "stock film rolls" },
  ],
};

const SYSTEMIZE: NavSection = {
  label: "Systemize",
  icon: Layers3,
  items: [
    { to: "/documents", label: "SOPs", icon: ClipboardCheck, searchTerms: "documents library" },
    { to: "/inspections", label: "Forms", icon: FileInput, searchTerms: "check in inspections" },
    { to: "/automations", label: "Automations", icon: Bot, searchTerms: "workflows" },
    { to: "/services", label: "System Builder", icon: Wrench, searchTerms: "services catalog" },
  ],
};

const STANDALONE_ITEMS: NavItem[] = [
  { to: "/calendar", label: "Schedule", icon: CalendarDays, searchTerms: "appointments bays" },
  { to: "/jobs", label: "Production", icon: Wrench, searchTerms: "installation jobs qc" },
  { to: "/customers", label: "Customers", icon: Users, searchTerms: "vehicles history" },
];

const ADMIN_ITEMS: NavItem[] = [
  { to: "/integrations", label: "Integrations", icon: Plug },
  { to: "/settings", label: "Settings", icon: Settings },
];

const SEARCH_ITEMS = [
  ...PRIMARY_ITEMS,
  ...SALES.items,
  ...STANDALONE_ITEMS,
  ...OPERATIONS.items,
  ...SYSTEMIZE.items,
  ...ADMIN_ITEMS,
];

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider
      style={{
        "--sidebar-width": "14.5rem",
        "--sidebar-width-icon": "3.25rem",
      } as React.CSSProperties}
    >
      <AppShellContent>{children}</AppShellContent>
    </SidebarProvider>
  );
}

function AppShellContent({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const { user, organization, location } = useRouteContext({ from: "/_authenticated" });
  const { isMobile, setOpenMobile } = useSidebar();
  const [searchOpen, setSearchOpen] = useState(false);

  const isActive = (to: string) => pathname === to || pathname.startsWith(`${to}/`);
  const sectionActive = (section: NavSection) => section.items.some((item) => isActive(item.to));

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setSearchOpen((open) => !open);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  function goTo(to: string) {
    setSearchOpen(false);
    if (isMobile) setOpenMobile(false);
    navigate({ to: to as never });
  }

  const shopName = organization?.name ?? "Systemize Shop";
  const locationName = location?.name ?? "Primary location";
  const email = user.email ?? "Account";
  const initials = email.slice(0, 2).toUpperCase();

  return (
    <div className="flex min-h-svh w-full bg-background">
      <AccentTheme />
      <Sidebar collapsible="icon" className="border-sidebar-border">
        <SidebarHeader className="h-16 justify-center border-b border-sidebar-border px-3 py-0">
          <Link
            to="/command-center"
            className="flex h-9 items-center gap-2 overflow-hidden px-1 text-sidebar-foreground"
            onClick={() => isMobile && setOpenMobile(false)}
          >
            <span className="flex size-7 shrink-0 items-center justify-center rounded-md border border-sidebar-border bg-sidebar-accent font-semibold">
              S
            </span>
            <span className="display-title truncate text-lg font-bold group-data-[collapsible=icon]:hidden">
              Systemize
            </span>
          </Link>
        </SidebarHeader>

        <SidebarContent className="gap-0 px-2 py-3">
          <SidebarGroup className="p-0">
            <SidebarGroupContent>
              <SidebarMenu>
                {PRIMARY_ITEMS.map((item) => (
                  <PrimaryNavItem key={item.label} item={item} active={isActive(item.to)} />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarSeparator className="my-3" />

          <NavigationSection section={SALES} active={sectionActive(SALES)} isActive={isActive} />

          <SidebarGroup className="p-0 pt-1">
            <SidebarGroupContent>
              <SidebarMenu>
                {STANDALONE_ITEMS.map((item) => (
                  <PrimaryNavItem key={item.label} item={item} active={isActive(item.to)} />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <NavigationSection
            section={OPERATIONS}
            active={sectionActive(OPERATIONS)}
            isActive={isActive}
          />
          <NavigationSection
            section={SYSTEMIZE}
            active={sectionActive(SYSTEMIZE)}
            isActive={isActive}
          />

          <SidebarSeparator className="my-3" />

          <SidebarGroup className="p-0">
            <SidebarGroupContent>
              <SidebarMenu>
                {ADMIN_ITEMS.map((item) => (
                  <PrimaryNavItem key={item.label} item={item} active={isActive(item.to)} />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="border-t border-sidebar-border p-2">
          <div className="flex min-w-0 items-center gap-2 rounded-md px-2 py-1.5 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
            <Building2 className="size-4 shrink-0 text-sidebar-foreground/60" />
            <div className="min-w-0 group-data-[collapsible=icon]:hidden">
              <p className="truncate text-xs font-medium text-sidebar-foreground">{shopName}</p>
              <p className="truncate text-[11px] text-sidebar-foreground/55">{locationName}</p>
            </div>
          </div>
          <p className="px-2 text-[10px] text-sidebar-foreground/35 group-data-[collapsible=icon]:hidden">
            SYSTEMIZE.OS
          </p>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <SidebarInset className="min-w-0">
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-elevated bg-background/95 px-3 backdrop-blur md:px-4">
          <SidebarTrigger className="size-8" />

          <Button
            variant="outline"
            className="h-9 min-w-0 flex-1 justify-start gap-2 border-border/70 bg-secondary/35 px-3 text-muted-foreground sm:max-w-md"
            onClick={() => setSearchOpen(true)}
          >
            <Search className="size-4 shrink-0" />
            <span className="hidden truncate sm:inline">Search Systemize</span>
            <span className="sm:hidden">Search</span>
            <kbd className="ml-auto hidden rounded border border-border bg-background px-1.5 py-0.5 text-[10px] md:inline-flex">
              ⌘K
            </kbd>
          </Button>

          <div className="ml-auto flex items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="hidden h-9 gap-2 px-2.5 sm:flex">
                  <Building2 className="size-4 text-muted-foreground" />
                  <span className="max-w-36 truncate text-sm">{locationName}</span>
                  <ChevronDown className="size-3.5 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel>Current shop</DropdownMenuLabel>
                <div className="px-2 pb-2">
                  <p className="truncate text-sm font-medium">{shopName}</p>
                  <p className="truncate text-xs text-muted-foreground">{locationName}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => goTo("/settings")}>
                  <Settings /> Manage shop settings
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button variant="ghost" size="icon" asChild title="Notifications">
              <Link to="/sales" aria-label="Notifications">
                <Bell className="size-4" />
              </Link>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full" aria-label="User profile">
                  <Avatar className="size-8 border border-border">
                    <AvatarFallback className="bg-secondary text-xs font-semibold">{initials}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel className="font-normal">
                  <span className="block truncate text-sm font-medium">{email}</span>
                  <span className="block truncate text-xs text-muted-foreground">{shopName}</span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => goTo("/settings")}>
                  <Settings /> Account settings
                </DropdownMenuItem>
                <div className="flex items-center justify-between px-2 py-1.5 text-sm">
                  <span>Appearance</span>
                  <ThemeToggle />
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={signOut} className="text-destructive focus:text-destructive">
                  <LogOut /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="min-w-0 flex-1 overflow-auto p-4 lg:p-8">{children}</main>
      </SidebarInset>

      <CommandDialog open={searchOpen} onOpenChange={setSearchOpen}>
        <CommandInput placeholder="Search pages and tools…" />
        <CommandList>
          <CommandEmpty>No matching page found.</CommandEmpty>
          <CommandGroup heading="Navigate">
            {SEARCH_ITEMS.map((item, index) => (
              <CommandItem
                key={`${item.label}-${index}`}
                value={`${item.label} ${item.searchTerms ?? ""}`}
                onSelect={() => goTo(item.to)}
              >
                <item.icon />
                <span>{item.label}</span>
                {isActive(item.to) && <CommandShortcut>Current</CommandShortcut>}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </div>
  );
}

function PrimaryNavItem({ item, active }: { item: NavItem; active: boolean }) {
  const { isMobile, setOpenMobile } = useSidebar();
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={active}
        tooltip={item.label}
        className={cn(
          "h-9 gap-3 px-2.5 text-sidebar-foreground/72 hover:bg-sidebar-accent/55 hover:text-sidebar-foreground",
          active && "bg-sidebar-accent font-semibold text-bronze hover:text-bronze",
        )}
      >
        <Link to={item.to as never} onClick={() => isMobile && setOpenMobile(false)}>
          <item.icon className={cn("size-4", active && "text-bronze")} />
          <span>{item.label}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

function NavigationSection({
  section,
  active,
  isActive,
}: {
  section: NavSection;
  active: boolean;
  isActive: (to: string) => boolean;
}) {
  const [open, setOpen] = useState(active);
  const { isMobile, setOpenMobile } = useSidebar();

  useEffect(() => {
    if (active) setOpen(true);
  }, [active]);

  return (
    <SidebarGroup className="p-0 pt-1">
      <Collapsible open={open} onOpenChange={setOpen}>
        <SidebarMenu>
          <SidebarMenuItem>
            <CollapsibleTrigger asChild>
              <SidebarMenuButton
                tooltip={section.label}
                className={cn(
                  "h-9 gap-3 px-2.5 text-sidebar-foreground/72 hover:bg-sidebar-accent/55 hover:text-sidebar-foreground",
                  active && "font-semibold text-bronze hover:text-bronze",
                )}
              >
                <section.icon className={cn("size-4", active && "text-bronze")} />
                <span>{section.label}</span>
                <ChevronDown
                  className={cn("ml-auto size-3.5 transition-transform", open && "rotate-180")}
                />
              </SidebarMenuButton>
            </CollapsibleTrigger>
          </SidebarMenuItem>
        </SidebarMenu>
        <CollapsibleContent>
          <SidebarMenuSub className="mb-1 mt-0.5">
            {section.items.map((item, index) => {
              const itemActive = isActive(item.to) && section.items.findIndex((candidate) => candidate.to === item.to) === index;
              return (
                <SidebarMenuSubItem key={item.label}>
                  <SidebarMenuSubButton
                    asChild
                    isActive={itemActive}
                    className={cn(
                      "text-sidebar-foreground/58 hover:bg-sidebar-accent/45 hover:text-sidebar-foreground",
                      itemActive && "bg-transparent font-medium text-bronze hover:text-bronze",
                    )}
                  >
                    <Link to={item.to as never} onClick={() => isMobile && setOpenMobile(false)}>
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              );
            })}
          </SidebarMenuSub>
        </CollapsibleContent>
      </Collapsible>
    </SidebarGroup>
  );
}