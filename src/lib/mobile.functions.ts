import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Unit = z.object({
  id: z.string(),
  name: z.string(),
  kind: z.string(),
  base_address: z.string(),
  capacity_hours: z.number(),
  skills: z.array(z.string()),
});

const Stop = z.object({
  id: z.string(),
  label: z.string(),
  service: z.string(),
  address: z.string(),
  hours: z.number(),
  notes: z.string(),
});

const Input = z.object({
  route_date: z.string(),
  start_time: z.string(),
  units: z.array(Unit).min(1).max(12),
  jobs: z.array(Stop).min(1).max(40),
});

export type RoutePlan = {
  routes: {
    unit_id: string;
    summary: string;
    drive_minutes: number;
    work_hours: number;
    stops: {
      job_id: string;
      order: number;
      arrive: string;
      depart: string;
      drive_minutes: number;
      note: string;
    }[];
  }[];
  unassigned: { job_id: string; reason: string }[];
  warnings: string[];
};

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    routes: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          unit_id: { type: "string" },
          summary: { type: "string" },
          drive_minutes: { type: "number" },
          work_hours: { type: "number" },
          stops: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                job_id: { type: "string" },
                order: { type: "number" },
                arrive: { type: "string" },
                depart: { type: "string" },
                drive_minutes: { type: "number" },
                note: { type: "string" },
              },
              required: ["job_id", "order", "arrive", "depart", "drive_minutes", "note"],
            },
          },
        },
        required: ["unit_id", "summary", "drive_minutes", "work_hours", "stops"],
      },
    },
    unassigned: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: { job_id: { type: "string" }, reason: { type: "string" } },
        required: ["job_id", "reason"],
      },
    },
    warnings: { type: "array", items: { type: "string" } },
  },
  required: ["routes", "unassigned", "warnings"],
};

async function readStream(res: Response) {
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";
  for (;;) {
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
          /* keep-alive */
        }
      }
    }
  }
  return text;
}

export const planMobileDay = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data }): Promise<RoutePlan> => {
    const key = process.env['LOVABLE_API_KEY'];
    if (!key) throw new Error("AI is not configured for this workspace.");

    const prompt = [
      `You are the dispatcher for a mobile vehicle restyling crew (tint, PPF, wraps, ceramic, paint correction).`,
      `Plan ${data.route_date}. Crews leave their base at ${data.start_time} and should be back by early evening.`,
      ``,
      `Crews / vans:`,
      ...data.units.map(
        (u) =>
          `- ${u.id} · ${u.name} (${u.kind}) · base: ${u.base_address || "shop"} · up to ${u.capacity_hours}h of work · skilled in: ${u.skills.join(", ") || "general"}`,
      ),
      ``,
      `Jobs waiting for a mobile visit:`,
      ...data.jobs.map(
        (j) =>
          `- ${j.id} · ${j.label} · ${j.service} · ${j.hours}h on site · at: ${j.address || "address missing"}${j.notes ? ` · ${j.notes}` : ""}`,
      ),
      ``,
      `Rules:`,
      `1. Group jobs that are geographically close into the same crew's day so nobody criss-crosses the metro area. Use your knowledge of the cities, suburbs and ZIP codes given.`,
      `2. Order each crew's stops into a sensible driving loop out from base and back, and estimate realistic drive minutes between consecutive stops in traffic.`,
      `3. Give every stop an arrive and depart clock time in 24h HH:MM, chaining on-site hours plus drive time, with a 30 minute lunch somewhere sensible.`,
      `4. Respect each crew's work-hour capacity and skills. Anything that does not fit, or is too far, goes in "unassigned" with a plain-language reason.`,
      `5. Put overbooking, long drives, missing addresses or skill gaps into "warnings", written for a shop owner, not an engineer.`,
      `Use only the ids given. Every job id appears exactly once, either on a route or in unassigned.`,
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
        reasoning: { effort: "medium", summary: "auto" },
        text: { format: { type: "json_schema", name: "route_plan", strict: true, schema: SCHEMA } },
      }),
    });

    if (!res.ok || !res.body) {
      const detail = await res.text().catch(() => "");
      if (res.status === 402) throw new Error("The workspace is out of AI credits.");
      if (res.status === 429) throw new Error("AI is busy right now — try again in a moment.");
      throw new Error(`Route planning failed (${res.status}). ${detail.slice(0, 200)}`);
    }

    const text = await readStream(res);
    if (!text.trim()) throw new Error("The planner didn't return a day plan — try again.");
    const parsed = JSON.parse(text) as RoutePlan;
    return {
      routes: (parsed.routes ?? []).filter((r) => r && r.unit_id),
      unassigned: parsed.unassigned ?? [],
      warnings: parsed.warnings ?? [],
    };
  });
