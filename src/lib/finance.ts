export const EXPENSE_CATEGORIES = [
  { key: "rent", label: "Rent & building" },
  { key: "utilities", label: "Utilities" },
  { key: "insurance", label: "Insurance" },
  { key: "materials", label: "Film & materials" },
  { key: "tools", label: "Tools & equipment" },
  { key: "payroll", label: "Payroll & contractors" },
  { key: "software", label: "Software & subscriptions" },
  { key: "marketing", label: "Marketing & advertising" },
  { key: "vehicle", label: "Shop vehicles & fuel" },
  { key: "maintenance", label: "Repairs & maintenance" },
  { key: "fees", label: "Card & bank fees" },
  { key: "taxes", label: "Taxes & licensing" },
  { key: "loan", label: "Loans & leases" },
  { key: "other", label: "Other" },
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number]["key"];

export const expenseCategoryLabel = (key: string | null | undefined) =>
  EXPENSE_CATEGORIES.find((c) => c.key === key)?.label ?? "Other";

export const RECURRENCES = [
  { key: "one_off", label: "One-off" },
  { key: "weekly", label: "Weekly" },
  { key: "monthly", label: "Monthly" },
  { key: "yearly", label: "Yearly" },
] as const;

export const recurrenceLabel = (key: string | null | undefined) =>
  RECURRENCES.find((r) => r.key === key)?.label ?? "One-off";

export type ExpenseRow = {
  id: string;
  category: string;
  vendor: string | null;
  description: string | null;
  amount: number | string;
  expense_date: string;
  due_date: string | null;
  status: string;
  recurrence: string;
  method: string | null;
};

/** Overhead categories that run whether or not a car is in the building. */
export const FIXED_COST_CATEGORIES = [
  "rent",
  "utilities",
  "insurance",
  "software",
  "loan",
  "taxes",
];

export function monthKey(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function monthLabel(key: string) {
  const [year, month] = key.split("-");
  return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString("en-US", {
    month: "short",
  });
}
