import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const IMPORT_TARGETS = {
  customers: {
    label: "Customers",
    fields: ["name", "email", "phone", "company", "notes"],
  },
  vehicles: {
    label: "Vehicles",
    fields: ["customer_name", "year", "make", "model", "color", "plate", "vin", "notes"],
  },
  deals: {
    label: "Leads & quotes",
    fields: ["customer_name", "title", "value", "stage", "notes"],
  },
} as const;

export type ImportTarget = keyof typeof IMPORT_TARGETS;

const Input = z.object({
  target: z.enum(["customers", "vehicles", "deals"]),
  headers: z.array(z.string()).min(1).max(120),
  sampleRows: z.array(z.array(z.string())).max(5),
});

export type MappingSuggestion = {
  source_system: string;
  summary: string;
  mappings: { column: string; field: string; confidence: number; note: string }[];
};

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    source_system: { type: "string" },
    summary: { type: "string" },
    mappings: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          column: { type: "string" },
          field: { type: "string" },
          confidence: { type: "number" },
          note: { type: "string" },
        },
        required: ["column", "field", "confidence", "note"],
      },
    },
  },
  required: ["source_system", "summary", "mappings"],
};

export const suggestCsvMapping = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data }): Promise<MappingSuggestion> => {
    const key = process.env['LOVABLE_API_KEY'];
    if (!key) throw new Error("AI is not configured for this workspace.");

    const fields = IMPORT_TARGETS[data.target].fields;
    const prompt = [
      `A vehicle restyling shop is importing a CSV into the "${data.target}" records of a new shop system.`,
      `Valid destination fields: ${fields.join(", ")}. Use the exact field name, or "skip" for a column that has no home.`,
      `CSV columns: ${data.headers.join(" | ")}`,
      `Sample rows:`,
      ...data.sampleRows.map((r) => r.join(" | ")),
      `Guess which old system this export came from (Tint Wiz, Urable, WrapRight, HubSpot, GoHighLevel, QuickBooks, a spreadsheet, or unknown).`,
      `Return one mapping entry per CSV column, confidence 0-1, and a short plain-language note for the shop owner.`,
    ].join("\n");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": key,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        input: prompt,
        stream: true,
        reasoning: { effort: "low", summary: "auto" },
        text: {
          format: { type: "json_schema", name: "csv_mapping", strict: true, schema: SCHEMA },
        },
      }),
    });

    if (!res.ok || !res.body) {
      const detail = await res.text().catch(() => "");
      if (res.status === 402) throw new Error("The workspace is out of AI credits.");
      if (res.status === 429) throw new Error("AI is busy right now — try again in a moment.");
      throw new Error(`AI mapping failed (${res.status}). ${detail.slice(0, 200)}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let text = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split("\n\n");
      buffer = parts.pop() ?? "";
      for (const part of parts) {
        for (const line of part.split("\n")) {
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (!payload || payload === "[DONE]") continue;
          try {
            const evt = JSON.parse(payload) as {
              type?: string;
              delta?: string;
              response?: { output_text?: string };
            };
            if (evt.type === "response.output_text.delta" && evt.delta) text += evt.delta;
            if (evt.type === "response.completed" && evt.response?.output_text) {
              text = evt.response.output_text;
            }
          } catch {
            /* ignore keep-alive frames */
          }
        }
      }
    }

    if (!text.trim()) throw new Error("The AI didn't return a mapping — map the columns by hand.");
    const parsed = JSON.parse(text) as MappingSuggestion;
    return {
      source_system: parsed.source_system || "unknown",
      summary: parsed.summary || "",
      mappings: (parsed.mappings ?? []).filter((m) => m && m.column),
    };
  });
