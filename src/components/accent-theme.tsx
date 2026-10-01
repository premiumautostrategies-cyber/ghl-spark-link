import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/lib/use-org";

export const ACCENT_PRESETS: { name: string; hex: string }[] = [
  { name: "Glass Blue", hex: "#4a8fd8" },
  { name: "Bronze", hex: "#d6a866" },
  { name: "Amber", hex: "#f0a13c" },
  { name: "Crimson", hex: "#e2564d" },
  { name: "Emerald", hex: "#3fc98a" },
  { name: "Ocean", hex: "#4aa8f0" },
  { name: "Violet", hex: "#9b7bf0" },
  { name: "Magenta", hex: "#e263a8" },
  { name: "Steel", hex: "#a9b4c2" },
];

export const DEFAULT_ACCENT = ACCENT_PRESETS[0]!.hex;
const LEGACY_DEFAULT = "#d6a866";

function readable(hex: string) {
  const h = hex.replace("#", "");
  if (h.length !== 6) return "#111111";
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255) as [
    number,
    number,
    number,
  ];
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return lum > 0.55 ? "#12100c" : "#ffffff";
}

/** Applies a hex accent to the live theme tokens. */
export function applyAccent(hex: string | null | undefined) {
  if (typeof document === "undefined") return;
  const picked = hex && /^#[0-9a-fA-F]{6}$/.test(hex) ? hex : DEFAULT_ACCENT;
  const value = picked.toLowerCase() === LEGACY_DEFAULT ? DEFAULT_ACCENT : picked;
  const root = document.documentElement;
  root.style.setProperty("--bronze", value);
  root.style.setProperty("--bronze-hover", `color-mix(in oklab, ${value} 82%, black)`);
  root.style.setProperty("--primary-foreground", readable(value));
  root.style.setProperty("--sidebar-primary-foreground", readable(value));
}

export function AccentTheme() {
  const { orgId } = useOrg();

  const { data } = useQuery({
    queryKey: ["organization-accent", orgId],
    enabled: Boolean(orgId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizations")
        .select("accent_color")
        .eq("id", orgId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    applyAccent(data?.accent_color ?? DEFAULT_ACCENT);
  }, [data?.accent_color]);

  return null;
}
