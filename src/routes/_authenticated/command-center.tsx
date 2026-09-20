import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DndContext, PointerSensor, useDraggable, useDroppable, useSensor, useSensors } from "@dnd-kit/core";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CalendarPlus,
  Check,
  ChevronDown,
  CircleDollarSign,
  Clock3,
  GripVertical,
  LayoutDashboard,
  Maximize2,
  Minimize2,
  MoreHorizontal,
  Plus,
  Receipt,
  Banknote,
  Settings2,
  Sparkles,
  UserPlus,
  Wrench,
  X,
} from "lucide-react";
import {
  Area,
  Bar,
  BarChart,
  Legend,
  AreaChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Panel, Tag } from "@/components/os-ui";
import { useOrg } from "@/lib/use-org";
import { label, money } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  DASHBOARD_WIDGETS,
  isDashboardLayout,
  layoutForPreset,
  withNewWidgets,
  type DashboardPreset,
  type DashboardWidgetId,
  type DashboardWidgetLayout,
  type WidgetSize,
} from "@/lib/dashboard";
import {
  EXPENSE_CATEGORIES,
  RECURRENCES,
  expenseCategoryLabel,
  monthKey,
  monthLabel,
  type ExpenseRow,
} from "@/lib/finance";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/command-center")({
  head: () => ({
    meta: [
      { title: "Command Center — Systemize" },
      { name: "description", content: "Live revenue, sales, bays, production, and shop priorities." },
      { property: "og:title", content: "Command Center — Systemize" },
      { property: "og:description", content: "Live revenue, sales, bays, production, and shop priorities." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CommandCenter,
});

type QuickAction = "lead" | "job" | "appointment" | "payment" | "expense" | null;

function startOfMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function startOfQuarter(date = new Date()) {
  return new Date(date.getFullYear(), Math.floor(date.getMonth() / 3) * 3, 1);
}

function sameDay(value: string | null, date: Date) {
  if (!value) return false;
  const candidate = new Date(value);
  return candidate.getFullYear() === date.getFullYear() && candidate.getMonth() === date.getMonth() && candidate.getDate() === date.getDate();
}

function dayKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function vehicleName(vehicle: { year: number | null; make: string | null; model: string | null } | null) {
  return vehicle ? [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(" ") : "Vehicle not assigned";
}

function CommandCenter() {
  const qc = useQueryClient();
  const { orgId, locId, user, organization } = useOrg();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 7 } }));
  const [customizing, setCustomizing] = useState(false);
  const [layout, setLayout] = useState<DashboardWidgetLayout[]>(layoutForPreset("executive"));
  const [preset, setPreset] = useState<DashboardPreset>("executive");
  const [quickAction, setQuickAction] = useState<QuickAction>(null);
  const [revenueRange, setRevenueRange] = useState<"month" | "quarter">("month");
  const now = useMemo(() => new Date(), []);
  const monthStart = startOfMonth(now);
  const quarterStart = startOfQuarter(now);
  const historyStart = new Date(now);
  historyStart.setDate(historyStart.getDate() - 60);
  const financeStart = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const { data: preference } = useQuery({
    queryKey: ["dashboard-preference", orgId, user.id],
    enabled: Boolean(orgId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dashboard_preferences")
        .select("*")
        .eq("organization_id", orgId as string)
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (!preference) return;
    const nextPreset = preference.preset === "compact" ? "compact" : "executive";
    setPreset(nextPreset);
    setLayout(
      isDashboardLayout(preference.widget_layout)
        ? withNewWidgets(preference.widget_layout, nextPreset)
        : layoutForPreset(nextPreset),
    );
  }, [preference]);

  const { data, isLoading } = useQuery({
    queryKey: ["command-center", orgId],
    enabled: Boolean(orgId),
    queryFn: async () => {
      const [jobs, deals, payments, estimates, members, inventory, customers, expenses] = await Promise.all([
        supabase.from("jobs").select("*, customers(name), vehicles(year,make,model)").gte("created_at", historyStart.toISOString()).order("scheduled_start", { ascending: true, nullsFirst: false }),
        supabase.from("deals").select("*").gte("created_at", historyStart.toISOString()).order("created_at", { ascending: false }),
        supabase.from("payments").select("*").gte("created_at", financeStart.toISOString()).order("created_at"),
        supabase.from("estimates").select("id,status,title,created_at"),
        supabase.from("team_members").select("*").eq("is_active", true).order("full_name"),
        supabase.from("inventory_items").select("id,name,quantity_on_hand,reorder_point"),
        supabase.from("customers").select("id,name").order("name"),
        supabase.from("expenses").select("*").gte("expense_date", financeStart.toISOString().slice(0, 10)).order("expense_date", { ascending: false }),
      ]);
      const error = [jobs, deals, payments, estimates, members, inventory, customers, expenses].find((result) => result.error)?.error;
      if (error) throw error;
      return {
        jobs: jobs.data,
        deals: deals.data,
        payments: payments.data,
        estimates: estimates.data,
        members: members.data,
        inventory: inventory.data,
        customers: customers.data,
        expenses: expenses.data,
      };
    },
  });

  const savePreference = useMutation({
    mutationFn: async (next: { layout: DashboardWidgetLayout[]; preset: DashboardPreset }) => {
      if (!orgId) throw new Error("No workspace selected");
      const { error } = await supabase.from("dashboard_preferences").upsert(
        {
          organization_id: orgId,
          user_id: user.id,
          preset: next.preset,
          widget_layout: next.layout,
        },
        { onConflict: "organization_id,user_id" },
      );
      if (error) throw error;
    },
    onError: (error: Error) => toast.error(error.message),
  });

  function commitLayout(next: DashboardWidgetLayout[], nextPreset = preset) {
    setLayout(next);
    setPreset(nextPreset);
    savePreference.mutate({ layout: next, preset: nextPreset });
  }

  function choosePreset(nextPreset: DashboardPreset) {
    commitLayout(layoutForPreset(nextPreset), nextPreset);
    toast.success(`${nextPreset === "compact" ? "Compact" : "Executive"} dashboard applied`);
  }

  const jobs = data?.jobs ?? [];
  const deals = data?.deals ?? [];
  const payments = data?.payments ?? [];
  const members = data?.members ?? [];
  const customers = data?.customers ?? [];
  const paid = payments.filter((payment) => payment.status === "paid" && payment.paid_at);
  const paidThisMonth = paid.filter((payment) => new Date(payment.paid_at as string) >= monthStart);
  const todayRevenue = paid.filter((payment) => sameDay(payment.paid_at, now)).reduce((sum, payment) => sum + Number(payment.amount), 0);
  const mtdRevenue = paidThisMonth.reduce((sum, payment) => sum + Number(payment.amount), 0);
  const daysElapsed = Math.max(now.getDate(), 1);
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const projectedRevenue = (mtdRevenue / daysElapsed) * daysInMonth;
  const dailyTarget = Number(preference?.daily_revenue_target ?? 5000);
  const monthlyTarget = Number(preference?.monthly_revenue_target ?? 100000);
  const avgTarget = Number(preference?.average_ticket_target ?? 2500);
  const activeDeals = deals.filter((deal) => !["won", "lost"].includes(deal.stage));
  const pipelineValue = activeDeals.reduce((sum, deal) => sum + Number(deal.value), 0);
  const weightedPipeline = activeDeals.reduce((sum, deal) => sum + Number(deal.value) * Number(deal.probability) / 100, 0);
  const activeJobs = jobs.filter((job) => !["completed", "invoiced"].includes(job.status));
  const todayJobs = jobs.filter((job) => sameDay(job.scheduled_start, now));
  const bays = Array.from(new Set([...todayJobs.map((job) => job.bay).filter(Boolean), "Bay 1", "Bay 2", "Bay 3"])) as string[];
  const bookedHours = todayJobs.reduce((sum, job) => {
    if (!job.scheduled_start) return sum;
    const start = new Date(job.scheduled_start).getTime();
    const end = job.scheduled_end ? new Date(job.scheduled_end).getTime() : start + 2 * 3600000;
    return sum + Math.max(0, end - start) / 3600000;
  }, 0);
  const capacity = Math.min(100, Math.round(bookedHours / Math.max(bays.length * 9, 1) * 100));
  const won = deals.filter((deal) => deal.stage === "won");
  const closed = deals.filter((deal) => ["won", "lost"].includes(deal.stage));
  const conversion = closed.length ? Math.round(won.length / closed.length * 100) : 0;
  const priorCutoff = new Date(now);
  priorCutoff.setDate(priorCutoff.getDate() - 30);
  const currentClosed = closed.filter((deal) => new Date(deal.created_at) >= priorCutoff);
  const currentConversion = currentClosed.length ? Math.round(currentClosed.filter((deal) => deal.stage === "won").length / currentClosed.length * 100) : conversion;
  const previousClosed = closed.filter((deal) => new Date(deal.created_at) < priorCutoff);
  const previousConversion = previousClosed.length ? Math.round(previousClosed.filter((deal) => deal.stage === "won").length / previousClosed.length * 100) : currentConversion;
  const conversionTrend = currentConversion - previousConversion;
  const completedJobs = jobs.filter((job) => ["completed", "invoiced"].includes(job.status));
  const averageTicket = completedJobs.length ? completedJobs.reduce((sum, job) => sum + Number(job.price), 0) / completedJobs.length : 0;

  // --- Money out ----------------------------------------------------------
  const expenses = (data?.expenses ?? []) as ExpenseRow[];
  const spent = expenses.filter((expense) => expense.status !== "due");
  const billsDue = expenses.filter((expense) => expense.status === "due").sort((a, b) => String(a.due_date ?? a.expense_date).localeCompare(String(b.due_date ?? b.expense_date)));
  const monthExpenses = spent.filter((expense) => new Date(`${expense.expense_date}T12:00:00`) >= monthStart);
  const moneyOutMTD = monthExpenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
  const billsDueTotal = billsDue.reduce((sum, expense) => sum + Number(expense.amount), 0);
  const netProfit = mtdRevenue - moneyOutMTD;
  const margin = mtdRevenue > 0 ? Math.round((netProfit / mtdRevenue) * 100) : 0;

  const pnlSeries = useMemo(() => {
    const months: { key: string; label: string; in: number; out: number; profit: number }[] = [];
    for (let index = 5; index >= 0; index -= 1) {
      const date = new Date(now.getFullYear(), now.getMonth() - index, 1);
      const key = monthKey(date);
      const income = paid.filter((payment) => monthKey(new Date(payment.paid_at as string)) === key).reduce((sum, payment) => sum + Number(payment.amount), 0);
      const outgoing = spent.filter((expense) => expense.expense_date.slice(0, 7) === key).reduce((sum, expense) => sum + Number(expense.amount), 0);
      months.push({ key, label: monthLabel(key), in: Math.round(income), out: Math.round(outgoing), profit: Math.round(income - outgoing) });
    }
    return months;
  }, [paid, spent, now.getTime()]);

  const expenseBreakdown = Object.entries(
    monthExpenses.reduce<Record<string, number>>((acc, expense) => {
      acc[expense.category] = (acc[expense.category] ?? 0) + Number(expense.amount);
      return acc;
    }, {}),
  )
    .map(([key, value]) => ({ name: expenseCategoryLabel(key), value }))
    .sort((a, b) => b.value - a.value);

  const revenueSeries = useMemo(() => {
    const start = revenueRange === "month" ? monthStart : quarterStart;
    const points: { label: string; actual: number; target: number }[] = [];
    let actual = 0;
    const cursor = new Date(start);
    while (cursor <= now) {
      actual += paid.filter((payment) => sameDay(payment.paid_at, cursor)).reduce((sum, payment) => sum + Number(payment.amount), 0);
      const elapsed = Math.floor((cursor.getTime() - start.getTime()) / 86400000) + 1;
      points.push({
        label: cursor.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        actual,
        target: revenueRange === "month" ? monthlyTarget / daysInMonth * elapsed : monthlyTarget / daysInMonth * elapsed,
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    return points;
  }, [paid, revenueRange, monthStart.getTime(), quarterStart.getTime(), now.getTime(), monthlyTarget, daysInMonth]);

  const kpis = [
    { label: "Money in (MTD)", value: money(mtdRevenue), note: `${money(projectedRevenue)} projected month end`, progress: mtdRevenue / Math.max(monthlyTarget, 1) * 100, to: "/payments", values: pnlSeries.map((point) => point.in), tone: "revenue" },
    { label: "Money out (MTD)", value: money(moneyOutMTD), note: `${money(billsDueTotal)} in bills still due`, progress: moneyOutMTD / Math.max(mtdRevenue, 1) * 100, to: "/analytics", values: pnlSeries.map((point) => point.out), tone: "critical" },
    { label: "Net profit (MTD)", value: money(netProfit), note: `${margin}% margin after costs`, progress: Math.max(margin, 0), to: "/analytics", values: pnlSeries.map((point) => Math.max(point.profit, 0)), tone: netProfit >= 0 ? "revenue" : "critical" },
    { label: "Today / goal", value: money(todayRevenue), note: `${Math.round(todayRevenue / Math.max(dailyTarget, 1) * 100)}% of ${money(dailyTarget)}`, progress: todayRevenue / Math.max(dailyTarget, 1) * 100, to: "/payments", values: revenueSeries.slice(-7).map((point) => point.actual), tone: "bronze" },
    { label: "MTD revenue", value: money(mtdRevenue), note: `${money(projectedRevenue)} projected`, progress: mtdRevenue / Math.max(monthlyTarget, 1) * 100, to: "/analytics", values: revenueSeries.slice(-7).map((point) => point.actual), tone: "revenue" },
    { label: "Active pipeline", value: money(pipelineValue), note: `${money(weightedPipeline)} weighted`, progress: weightedPipeline / Math.max(pipelineValue, 1) * 100, to: "/sales", values: activeDeals.slice(0, 7).reverse().map((deal) => Number(deal.value)), tone: "rig" },
    { label: "Shop capacity", value: `${capacity}%`, note: `${bookedHours.toFixed(1)}h booked · ${Math.max(bays.length * 9 - bookedHours, 0).toFixed(1)}h open`, progress: capacity, to: "/schedule", values: bays.map((bay) => todayJobs.filter((job) => job.bay === bay).length), tone: capacity > 90 ? "critical" : "urgent" },
    { label: "Lead → booked", value: `${conversion}%`, note: `${conversionTrend >= 0 ? "+" : ""}${conversionTrend}% over 30 days`, progress: conversion, to: "/sales", values: deals.slice(0, 7).reverse().map((deal) => Number(deal.probability)), tone: conversionTrend >= 0 ? "revenue" : "critical" },
    { label: "Average ticket", value: money(averageTicket), note: `${money(avgTarget)} target`, progress: averageTicket / Math.max(avgTarget, 1) * 100, to: "/analytics", values: completedJobs.slice(-7).map((job) => Number(job.price)), tone: averageTicket >= avgTarget ? "revenue" : "bronze" },
  ];

  const quickMutation = useMutation({
    mutationFn: async (form: FormData) => {
      if (!orgId || !quickAction) throw new Error("No workspace selected");
      if (quickAction === "lead") {
        const { error } = await supabase.from("deals").insert({ title: String(form.get("title")), value: Number(form.get("value") || 0), probability: 25, stage: "new_lead", source: String(form.get("source") || "Dashboard"), owner_name: String(form.get("owner_name") || "") || null, customer_id: String(form.get("customer_id") || "") || null, organization_id: orgId, location_id: locId });
        if (error) throw error;
      } else if (quickAction === "payment") {
        const status = String(form.get("status") || "paid");
        const { error } = await supabase.from("payments").insert({ amount: Number(form.get("amount") || 0), kind: String(form.get("kind") || "payment"), method: String(form.get("method") || "card"), status, paid_at: status === "paid" ? new Date().toISOString() : null, customer_id: String(form.get("customer_id") || "") || null, organization_id: orgId, location_id: locId });
        if (error) throw error;
      } else {
        const start = String(form.get("scheduled_start") || "");
        const { error } = await supabase.from("jobs").insert({ title: String(form.get("title")), service_type: String(form.get("service_type") || "other"), status: "scheduled", price: Number(form.get("price") || 0), bay: String(form.get("bay") || "") || null, installer: String(form.get("installer") || "") || null, scheduled_start: start ? new Date(start).toISOString() : null, customer_id: String(form.get("customer_id") || "") || null, organization_id: orgId, location_id: locId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Added to the shop");
      setQuickAction(null);
      qc.invalidateQueries({ queryKey: ["command-center"] });
      qc.invalidateQueries({ queryKey: ["deals"] });
      qc.invalidateQueries({ queryKey: ["jobs"] });
      qc.invalidateQueries({ queryKey: ["payments"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const markComplete = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("jobs").update({ status: "completed" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Job marked complete");
      qc.invalidateQueries({ queryKey: ["command-center"] });
      qc.invalidateQueries({ queryKey: ["jobs-board"] });
    },
  });

  const markPaymentPaid = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("payments").update({ status: "paid", paid_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Deposit confirmed");
      qc.invalidateQueries({ queryKey: ["command-center"] });
    },
  });

  const outstandingPayments = payments.filter((payment) => payment.status === "pending");
  const staleDeals = activeDeals.filter((deal) => !deal.last_activity_at || Date.now() - new Date(deal.last_activity_at).getTime() > 2 * 3600000);
  const lowStock = (data?.inventory ?? []).filter((item) => Number(item.quantity_on_hand) <= Number(item.reorder_point));
  const alerts = [
    ...staleDeals.slice(0, 2).map((deal) => ({ id: `deal-${deal.id}`, tone: "critical" as const, title: `${deal.title} needs a response`, detail: `${money(deal.value)} opportunity has been quiet for more than two hours.`, action: "Respond now", to: `/sales/${deal.id}` })),
    ...outstandingPayments.slice(0, 2).map((payment) => ({ id: `payment-${payment.id}`, tone: "urgent" as const, title: `${money(payment.amount)} payment outstanding`, detail: "Confirm collection or follow up before production begins.", action: "Confirm paid", paymentId: payment.id })),
    ...(capacity > 95 ? [{ id: "capacity", tone: "critical" as const, title: "Bay capacity is over target", detail: `${capacity}% of today's available bay hours are committed.`, action: "View bays", to: "/schedule" }] : []),
    ...lowStock.slice(0, 1).map((item) => ({ id: `stock-${item.id}`, tone: "urgent" as const, title: `${item.name} is low`, detail: `${item.quantity_on_hand} remaining against a reorder point of ${item.reorder_point}.`, action: "Review stock", to: "/inventory" })),
  ];

  const funnel = [
    { label: "Leads", count: deals.length, value: deals.reduce((sum, deal) => sum + Number(deal.value), 0) },
    { label: "Quoted", count: deals.filter((deal) => ["quoted", "negotiating", "won"].includes(deal.stage)).length, value: deals.filter((deal) => ["quoted", "negotiating", "won"].includes(deal.stage)).reduce((sum, deal) => sum + Number(deal.value), 0) },
    { label: "Booked", count: jobs.filter((job) => ["scheduled", "in_progress", "completed", "invoiced"].includes(job.status)).length, value: jobs.filter((job) => ["scheduled", "in_progress", "completed", "invoiced"].includes(job.status)).reduce((sum, job) => sum + Number(job.price), 0) },
    { label: "Completed", count: completedJobs.length, value: completedJobs.reduce((sum, job) => sum + Number(job.price), 0) },
  ];

  const lostData = Object.entries(deals.filter((deal) => deal.stage === "lost").reduce<Record<string, number>>((acc, deal) => {
    const reason = deal.loss_reason || "Uncategorized";
    acc[reason] = (acc[reason] ?? 0) + Number(deal.value);
    return acc;
  }, {})).map(([name, value]) => ({ name, value }));

  const teamRows = members.map((member) => {
    const owned = deals.filter((deal) => deal.owner_name === member.full_name);
    const ownedClosed = owned.filter((deal) => ["won", "lost"].includes(deal.stage));
    const memberJobs = completedJobs.filter((job) => job.installer === member.full_name);
    const value = memberJobs.reduce((sum, job) => sum + Number(job.price), 0);
    const closeRate = ownedClosed.length ? Math.round(owned.filter((deal) => deal.stage === "won").length / ownedClosed.length * 100) : 0;
    const efficiency = Math.min(100, Math.round((memberJobs.length * 20 + closeRate) / 2));
    return { ...member, assigned: owned.filter((deal) => !["won", "lost"].includes(deal.stage)).length, closeRate, value, efficiency };
  }).sort((a, b) => b.value - a.value);

  const widgetContent: Record<DashboardWidgetId, ReactNode> = {
    revenue: <RevenueWidget data={revenueSeries} range={revenueRange} onRange={setRevenueRange} projected={projectedRevenue} target={monthlyTarget} />,
    funnel: <FunnelWidget data={funnel} />,
    bays: <BaysWidget bays={bays} jobs={todayJobs} now={now} />,
    schedule: <ScheduleWidget jobs={todayJobs} payments={outstandingPayments} onComplete={(id) => markComplete.mutate(id)} onPaid={(id) => markPaymentPaid.mutate(id)} />,
    team: <TeamWidget rows={teamRows} />,
    alerts: <AlertsWidget alerts={alerts} onPayment={(id) => markPaymentPaid.mutate(id)} />,
    lost: <LostWidget data={lostData} />,
  };

  return (
    <div className={cn("min-w-0 space-y-5", preset === "compact" && "space-y-4")}>
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-elevated pb-4">
        <div>
          <p className="micro-label">{organization?.name ?? "Systemize"} · Live operations</p>
          <h1 className="display-title mt-1 text-3xl font-semibold">Command Center</h1>
          <p className="mt-1 text-sm text-muted-foreground">Revenue, capacity, pipeline, and today's priorities in one view.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-elevated bg-surface p-1">
            <Button size="sm" variant={preset === "compact" ? "secondary" : "ghost"} onClick={() => choosePreset("compact")}>Compact</Button>
            <Button size="sm" variant={preset === "executive" ? "secondary" : "ghost"} onClick={() => choosePreset("executive")}>Executive</Button>
          </div>
          <Button variant={customizing ? "default" : "outline"} onClick={() => setCustomizing((value) => !value)}>
            {customizing ? <Check /> : <Settings2 />}
            {customizing ? "Done" : "Customize dashboard"}
          </Button>
          <QuickAddMenu onChoose={setQuickAction} />
        </div>
      </div>

      {customizing && (
        <Panel className="flex flex-wrap items-center justify-between gap-3 border-bronze/35 bg-bronze/5 p-3">
          <div>
            <p className="text-sm font-semibold">Dashboard editing is on</p>
            <p className="text-xs text-muted-foreground">Drag widgets to reorder. Resize or hide them from each widget header.</p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="outline" size="sm"><Plus /> Add widgets</Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel>Visible widgets</DropdownMenuLabel>
              {layout.map((widget) => (
                <DropdownMenuCheckboxItem
                  key={widget.id}
                  checked={widget.visible}
                  onCheckedChange={(checked) => commitLayout(layout.map((item) => item.id === widget.id ? { ...item, visible: Boolean(checked) } : item))}
                >
                  {DASHBOARD_WIDGETS[widget.id].name}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </Panel>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {kpis.map((kpi) => <MetricCard key={kpi.label} {...kpi} compact={preset === "compact"} />)}
      </div>

      {isLoading ? (
        <Panel className="p-12 text-center text-sm text-muted-foreground">Loading the shop floor…</Panel>
      ) : (
        <DndContext
          sensors={sensors}
          onDragEnd={({ active, over }) => {
            if (!over || active.id === over.id) return;
            const from = layout.findIndex((item) => item.id === active.id);
            const to = layout.findIndex((item) => item.id === over.id);
            if (from < 0 || to < 0) return;
            const next = [...layout];
            const [moved] = next.splice(from, 1);
            if (!moved) return;
            next.splice(to, 0, moved);
            commitLayout(next);
          }}
        >
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-6">
            {layout.filter((widget) => widget.visible).map((widget) => (
              <DashboardWidget
                key={widget.id}
                widget={widget}
                customizing={customizing}
                compact={preset === "compact"}
                onHide={() => commitLayout(layout.map((item) => item.id === widget.id ? { ...item, visible: false } : item))}
                onSize={(size) => commitLayout(layout.map((item) => item.id === widget.id ? { ...item, size } : item))}
              >
                {widgetContent[widget.id]}
              </DashboardWidget>
            ))}
          </div>
        </DndContext>
      )}

      <QuickAddDialog action={quickAction} onOpenChange={(open) => !open && setQuickAction(null)} customers={customers} pending={quickMutation.isPending} onSubmit={(form) => quickMutation.mutate(form)} />
    </div>
  );
}

function QuickAddMenu({ onChoose }: { onChoose: (action: Exclude<QuickAction, null>) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild><Button><Plus /> Quick add <ChevronDown /></Button></DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onSelect={() => onChoose("lead")}><UserPlus /> New lead</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onChoose("job")}><Wrench /> New work order</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onChoose("appointment")}><CalendarPlus /> Schedule appointment</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onChoose("payment")}><CircleDollarSign /> Log payment</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function QuickAddDialog({ action, onOpenChange, customers, pending, onSubmit }: { action: QuickAction; onOpenChange: (open: boolean) => void; customers: { id: string; name: string }[]; pending: boolean; onSubmit: (form: FormData) => void }) {
  const titles = { lead: "New lead", job: "New work order", appointment: "Schedule appointment", payment: "Log payment" };
  return (
    <Dialog open={Boolean(action)} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{action ? titles[action] : "Quick add"}</DialogTitle></DialogHeader>
        {action && <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); onSubmit(new FormData(event.currentTarget)); }}>
          {action !== "payment" && <div className="space-y-2"><Label htmlFor="quick-title">{action === "lead" ? "Opportunity" : "Work"}</Label><Input id="quick-title" name="title" placeholder={action === "lead" ? "Full front PPF — Porsche 911" : "Full vehicle tint"} required /></div>}
          <div className="space-y-2"><Label>Customer</Label><Select name="customer_id"><SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger><SelectContent>{customers.map((customer) => <SelectItem key={customer.id} value={customer.id}>{customer.name}</SelectItem>)}</SelectContent></Select></div>
          {action === "lead" && <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="quick-value">Potential value</Label><Input id="quick-value" name="value" type="number" min="0" step="0.01" /></div><div className="space-y-2"><Label htmlFor="quick-source">Source</Label><Input id="quick-source" name="source" placeholder="Walk-in" /></div><div className="space-y-2 sm:col-span-2"><Label htmlFor="quick-owner">Salesperson</Label><Input id="quick-owner" name="owner_name" /></div></div>}
          {(action === "job" || action === "appointment") && <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="quick-date">Start</Label><Input id="quick-date" name="scheduled_start" type="datetime-local" required={action === "appointment"} /></div><div className="space-y-2"><Label htmlFor="quick-price">Value</Label><Input id="quick-price" name="price" type="number" min="0" step="0.01" /></div><div className="space-y-2"><Label htmlFor="quick-bay">Bay</Label><Input id="quick-bay" name="bay" placeholder="Bay 2" /></div><div className="space-y-2"><Label htmlFor="quick-installer">Installer</Label><Input id="quick-installer" name="installer" /></div><input type="hidden" name="service_type" value="other" /></div>}
          {action === "payment" && <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="quick-amount">Amount</Label><Input id="quick-amount" name="amount" type="number" min="0" step="0.01" required /></div><div className="space-y-2"><Label>Type</Label><Select name="kind" defaultValue="deposit"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="deposit">Deposit</SelectItem><SelectItem value="payment">Payment</SelectItem></SelectContent></Select></div><input type="hidden" name="status" value="paid" /><input type="hidden" name="method" value="card" /></div>}
          <Button type="submit" className="w-full" disabled={pending}>{pending ? "Saving…" : "Save"}</Button>
        </form>}
      </DialogContent>
    </Dialog>
  );
}

function MetricCard({ label: title, value, note, progress, to, values, tone, compact }: { label: string; value: string; note: string; progress: number; to: string; values: number[]; tone: string; compact: boolean }) {
  const color = tone === "critical" ? "text-critical" : tone === "revenue" ? "text-revenue" : tone === "rig" ? "text-rig" : tone === "urgent" ? "text-urgent" : "text-bronze";
  return (
    <Link to={to as never} className="group relative overflow-hidden rounded-xl border border-elevated bg-surface p-4 transition-colors hover:border-bronze/40 hover:bg-surface-2">
      <div className="flex items-start justify-between gap-2"><p className="micro-label">{title}</p><ArrowUpRight className="size-3.5 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /></div>
      <div className="mt-2 flex items-end justify-between gap-3"><div className="min-w-0"><p className={cn("font-display text-2xl font-semibold tabular-nums", color)}>{value}</p><p className="mt-0.5 truncate text-[11px] text-muted-foreground">{note}</p></div><Sparkline values={values} className={color} /></div>
      {!compact && <Progress value={Math.min(progress, 100)} className="mt-3 h-1" />}
    </Link>
  );
}

function Sparkline({ values, className }: { values: number[]; className?: string }) {
  const points = values.length > 1 ? values : [0, values[0] ?? 0];
  const max = Math.max(...points, 1);
  return <svg viewBox="0 0 72 28" className={cn("h-7 w-[72px] shrink-0", className)} aria-hidden="true"><polyline fill="none" stroke="currentColor" strokeWidth="2" points={points.map((value, index) => `${index / Math.max(points.length - 1, 1) * 70 + 1},${26 - value / max * 22}`).join(" ")} /></svg>;
}

function DashboardWidget({ widget, customizing, compact, onHide, onSize, children }: { widget: DashboardWidgetLayout; customizing: boolean; compact: boolean; onHide: () => void; onSize: (size: WidgetSize) => void; children: ReactNode }) {
  const { attributes, listeners, setNodeRef: setDragRef, transform } = useDraggable({ id: widget.id, disabled: !customizing });
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: widget.id, disabled: !customizing });
  const span = widget.size === "full" ? "xl:col-span-6" : widget.size === "wide" ? "xl:col-span-4" : "xl:col-span-2";
  return (
    <section ref={setDropRef} className={cn("min-w-0", span, isOver && "rounded-xl ring-2 ring-bronze/60")}>
      <div ref={setDragRef} className="h-full" style={transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 40 } : undefined}>
        <Panel className={cn("h-full overflow-hidden", compact ? "min-h-[270px]" : "min-h-[320px]", customizing && "border-bronze/25")}>
          <div className="flex items-center gap-2 border-b border-elevated px-4 py-3">
            {customizing && <button type="button" className="cursor-grab text-muted-foreground active:cursor-grabbing" aria-label={`Move ${DASHBOARD_WIDGETS[widget.id].name}`} {...listeners} {...attributes}><GripVertical className="size-4" /></button>}
            <div className="min-w-0 flex-1"><h2 className="font-display text-sm font-semibold uppercase">{DASHBOARD_WIDGETS[widget.id].name}</h2><p className="truncate text-[11px] text-muted-foreground">{DASHBOARD_WIDGETS[widget.id].description}</p></div>
            {customizing && <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label="Widget options"><MoreHorizontal /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuLabel>Widget size</DropdownMenuLabel><DropdownMenuItem onSelect={() => onSize("half")}><Minimize2 /> Half width</DropdownMenuItem><DropdownMenuItem onSelect={() => onSize("wide")}><LayoutDashboard /> Wide</DropdownMenuItem><DropdownMenuItem onSelect={() => onSize("full")}><Maximize2 /> Full width</DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem onSelect={onHide} className="text-critical"><X /> Hide widget</DropdownMenuItem></DropdownMenuContent></DropdownMenu>}
          </div>
          {children}
        </Panel>
      </div>
    </section>
  );
}

function RevenueWidget({ data, range, onRange, projected, target }: { data: { label: string; actual: number; target: number }[]; range: "month" | "quarter"; onRange: (value: "month" | "quarter") => void; projected: number; target: number }) {
  return <div className="p-4"><div className="mb-3 flex flex-wrap items-center justify-between gap-2"><p className="text-sm"><span className="font-semibold text-revenue">{money(projected)}</span> projected · {money(target)} goal</p><div className="flex rounded-md bg-surface-2 p-0.5"><Button size="sm" variant={range === "month" ? "secondary" : "ghost"} onClick={() => onRange("month")}>This month</Button><Button size="sm" variant={range === "quarter" ? "secondary" : "ghost"} onClick={() => onRange("quarter")}>Quarter</Button></div></div><div className="h-[220px]"><ResponsiveContainer width="100%" height="100%"><LineChart data={data}><CartesianGrid stroke="var(--elevated)" vertical={false} /><XAxis dataKey="label" tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} interval="preserveStartEnd" /><YAxis tickFormatter={(value) => `$${Math.round(Number(value) / 1000)}k`} tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} width={40} /><Tooltip contentStyle={{ background: "var(--surface-2)", border: "1px solid var(--elevated)", borderRadius: 8 }} formatter={(value) => money(Number(value))} /><Line type="monotone" dataKey="target" stroke="var(--muted-foreground)" strokeDasharray="5 5" dot={false} /><Line type="monotone" dataKey="actual" stroke="var(--bronze)" strokeWidth={2.5} dot={false} /></LineChart></ResponsiveContainer></div></div>;
}

function FunnelWidget({ data }: { data: { label: string; count: number; value: number }[] }) {
  const max = Math.max(data[0]?.count ?? 0, 1);
  return <div className="space-y-3 p-4">{data.map((stage, index) => { const previous = data[index - 1]?.count ?? stage.count; const drop = previous ? Math.max(0, Math.round((1 - stage.count / previous) * 100)) : 0; return <Link key={stage.label} to={stage.label === "Completed" ? "/jobs" : "/sales"} className="group block"><div className="mb-1 flex items-end justify-between gap-2"><div><span className="text-sm font-semibold">{stage.label}</span>{index > 0 && <span className="ml-2 text-[10px] text-critical">-{drop}%</span>}</div><span className="text-xs text-muted-foreground">{stage.count} · {money(stage.value)}</span></div><div className="h-6 overflow-hidden rounded-sm bg-surface-2"><div className="flex h-full items-center bg-bronze/25 px-2 text-[10px] font-semibold text-bronze transition-all group-hover:bg-bronze/35" style={{ width: `${Math.max(18, stage.count / max * 100)}%` }}>{Math.round(stage.count / max * 100)}%</div></div></Link>; })}</div>;
}

type DashboardJob = { id: string; title: string; status: string; price: number | string; bay: string | null; installer: string | null; service_type: string; scheduled_start: string | null; scheduled_end: string | null; customers: { name: string } | null; vehicles: { year: number | null; make: string | null; model: string | null } | null };

function BaysWidget({ bays, jobs, now }: { bays: string[]; jobs: DashboardJob[]; now: Date }) {
  return <div className="grid gap-3 p-4 sm:grid-cols-2">{bays.map((bay) => { const job = jobs.find((item) => item.bay === bay && item.status === "in_progress") ?? jobs.find((item) => item.bay === bay); let progress = 0; if (job?.scheduled_start) { const start = new Date(job.scheduled_start).getTime(); const end = job.scheduled_end ? new Date(job.scheduled_end).getTime() : start + 2 * 3600000; progress = Math.max(0, Math.min(100, Math.round((now.getTime() - start) / Math.max(end - start, 1) * 100))); } return <Link key={bay} to="/schedule" className="rounded-lg border border-elevated bg-surface-2/50 p-3 transition-colors hover:border-bronze/40"><div className="flex items-center justify-between"><p className="micro-label">{bay}</p><span className={cn("size-2 rounded-full", job ? "bg-revenue" : "bg-muted-foreground/40")} /></div>{job ? <><p className="mt-2 truncate text-sm font-semibold">{vehicleName(job.vehicles)}</p><p className="truncate text-xs text-muted-foreground">{job.customers?.name ?? "No customer"} · {label(job.service_type)}</p><div className="mt-3 flex items-center gap-2"><Progress value={progress} className="h-1.5" /><span className="text-[10px] tabular-nums text-muted-foreground">{progress}%</span></div><p className="mt-2 text-[11px] text-muted-foreground">{job.installer || "Unassigned"}</p></> : <div className="py-5 text-center"><p className="text-sm text-muted-foreground">Available</p><p className="text-[11px] text-muted-foreground/70">Ready for booking</p></div>}</Link>; })}</div>;
}

function ScheduleWidget({ jobs, payments, onComplete, onPaid }: { jobs: DashboardJob[]; payments: { id: string; job_id: string | null; kind: string; amount: number | string }[]; onComplete: (id: string) => void; onPaid: (id: string) => void }) {
  return <div className="divide-y divide-elevated">{jobs.length === 0 && <p className="p-8 text-center text-sm text-muted-foreground">No work scheduled today.</p>}{jobs.map((job) => { const payment = payments.find((item) => item.job_id === job.id && item.kind === "deposit"); return <div key={job.id} className="flex gap-3 px-4 py-3"><div className="w-12 shrink-0 text-xs font-semibold tabular-nums text-bronze">{job.scheduled_start ? new Date(job.scheduled_start).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "TBD"}</div><div className="min-w-0 flex-1"><Link to="/jobs" className="truncate text-sm font-semibold hover:text-bronze">{job.title}</Link><p className="truncate text-[11px] text-muted-foreground">{job.customers?.name ?? "No customer"} · {job.bay || "No bay"} · {job.installer || "Unassigned"}</p><div className="mt-2 flex flex-wrap gap-1.5">{payment && <Button size="sm" variant="outline" onClick={() => onPaid(payment.id)}>Confirm deposit</Button>}<Button size="sm" variant="ghost" onClick={() => toast.success("Mockup follow-up queued")}>Send mockup</Button>{job.status === "in_progress" && <Button size="sm" variant="outline" onClick={() => onComplete(job.id)}>Mark complete</Button>}</div></div></div>; })}</div>;
}

function TeamWidget({ rows }: { rows: { id: string; full_name: string; title: string; assigned: number; closeRate: number; value: number; efficiency: number }[] }) {
  return <div className="overflow-x-auto"><table className="w-full min-w-[660px] text-left text-sm"><thead className="border-b border-elevated text-[10px] uppercase text-muted-foreground"><tr><th className="px-4 py-3">Team member</th><th className="px-4 py-3 text-right">Assigned leads</th><th className="px-4 py-3 text-right">Close rate</th><th className="px-4 py-3 text-right">Completed value</th><th className="px-4 py-3 text-right">Efficiency</th></tr></thead><tbody className="divide-y divide-elevated">{rows.map((row, index) => <tr key={row.id} className="transition-colors hover:bg-surface-2"><td className="px-4 py-3"><Link to="/team" className="flex items-center gap-3"><span className="flex size-7 items-center justify-center rounded-full bg-bronze/10 text-xs font-bold text-bronze">{index + 1}</span><span><span className="block font-semibold">{row.full_name}</span><span className="text-[11px] text-muted-foreground">{row.title}</span></span></Link></td><td className="px-4 py-3 text-right tabular-nums">{row.assigned}</td><td className="px-4 py-3 text-right tabular-nums">{row.closeRate}%</td><td className="px-4 py-3 text-right font-semibold tabular-nums">{money(row.value)}</td><td className="px-4 py-3"><div className="ml-auto flex w-28 items-center gap-2"><Progress value={row.efficiency} className="h-1.5" /><span className="w-8 text-right text-xs tabular-nums text-revenue">{row.efficiency}</span></div></td></tr>)}{rows.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Add team members to compare performance.</td></tr>}</tbody></table></div>;
}

type AlertItem = { id: string; tone: "critical" | "urgent"; title: string; detail: string; action: string; to?: string; paymentId?: string };
function AlertsWidget({ alerts, onPayment }: { alerts: AlertItem[]; onPayment: (id: string) => void }) {
  return <div className="divide-y divide-elevated">{alerts.length === 0 && <div className="p-8 text-center"><Check className="mx-auto size-6 text-revenue" /><p className="mt-2 text-sm font-semibold">Shop is clear</p><p className="text-xs text-muted-foreground">Nothing needs immediate attention.</p></div>}{alerts.map((alert) => <div key={alert.id} className="flex items-start gap-3 px-4 py-3"><span className={cn("mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full", alert.tone === "critical" ? "bg-critical/10 text-critical" : "bg-urgent/10 text-urgent")}><AlertTriangle className="size-3.5" /></span><div className="min-w-0 flex-1"><p className="text-sm font-semibold">{alert.title}</p><p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{alert.detail}</p></div>{alert.paymentId ? <Button size="sm" variant="outline" onClick={() => onPayment(alert.paymentId as string)}>{alert.action}</Button> : <Button size="sm" variant="outline" asChild><Link to={alert.to as never}>{alert.action}</Link></Button>}</div>)}</div>;
}

function LostWidget({ data }: { data: { name: string; value: number }[] }) {
  const colors = ["var(--critical)", "var(--urgent)", "var(--comms)", "var(--muted-foreground)"];
  const total = data.reduce((sum, item) => sum + item.value, 0);
  return <div className="grid min-w-0 items-center gap-2 p-4 sm:grid-cols-[140px_minmax(0,1fr)]"><div className="relative h-[150px]"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={data.length ? data : [{ name: "No losses", value: 1 }]} dataKey="value" innerRadius={46} outerRadius={64} paddingAngle={3} stroke="none">{(data.length ? data : [{ name: "No losses", value: 1 }]).map((item, index) => <Cell key={item.name} fill={data.length ? colors[index % colors.length] : "var(--elevated)"} />)}</Pie></PieChart></ResponsiveContainer><div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"><span className="text-base font-semibold">{money(total)}</span><span className="micro-label">lost</span></div></div><div className="min-w-0 space-y-2">{data.map((item, index) => <Link key={item.name} to="/sales" className="flex min-w-0 items-center justify-between gap-2 text-xs"><span className="flex min-w-0 items-center gap-2"><span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: colors[index % colors.length] }} /><span className="truncate">{item.name}</span></span><span className="shrink-0 font-semibold tabular-nums">{money(item.value)}</span></Link>)}{data.length === 0 && <p className="text-xs text-muted-foreground">No lost opportunities in this period.</p>}</div></div>;
}