import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Turn = z.object({
  speaker: z.string().max(80),
  channel: z.string().max(40),
  at: z.string().max(60),
  text: z.string().max(4000),
});

const Input = z.object({
  customer: z.string().max(120),
  vehicle: z.string().max(160),
  opportunity: z.string().max(200),
  stage: z.string().max(60),
  value: z.string().max(40),
  turns: z.array(Turn).min(1).max(80),
});

export type ConversationSummary = {
  summary: string;
  needs: string[];
  objections: string[];
  next_steps: string[];
  sentiment: string;
};

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    summary: { type: "string" },
    needs: { type: "array", items: { type: "string" } },
    objections: { type: "array", items: { type: "string" } },
    next_steps: { type: "array", items: { type: "string" } },
    sentiment: { type: "string", enum: ["hot", "warm", "cooling", "unclear"] },
  },
  required: ["summary", "needs", "objections", "next_steps", "sentiment"],
} as const;

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

export const summarizeConversation = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data }): Promise<ConversationSummary> => {
    const key = process.env['LOVABLE_API_KEY'];
    if (!key) throw new Error("AI is not configured for this workspace.");

    const prompt = [
      `You are a sales assistant for an automotive restyling shop (window tint, paint protection film, vinyl wraps, ceramic coating, detailing).`,
      `Read the conversation below and brief the sales rep so they can act in under a minute.`,
      ``,
      `Customer: ${data.customer}`,
      `Vehicle: ${data.vehicle}`,
      `Opportunity: ${data.opportunity} · stage ${data.stage} · value ${data.value}`,
      ``,
      `Conversation, oldest first:`,
      ...data.turns.map((t) => `- [${t.at}] ${t.speaker} (${t.channel}): ${t.text}`),
      ``,
      `Rules:`,
      `1. "summary" is two or three plain sentences covering what the customer wants and where things stand.`,
      `2. "needs" lists what the customer actually asked for — services, coverage, film or tint preferences, timing, budget. Quote their own words where useful.`,
      `3. "objections" lists hesitations, price pushback, competitor mentions, timing problems, or unanswered questions. Empty array if there are none — never invent one.`,
      `4. "next_steps" lists concrete actions for the rep, most urgent first, each a short imperative like "Text install openings for Thursday".`,
      `5. "sentiment" is hot, warm, cooling, or unclear based on how engaged and recent the customer's replies are.`,
      `Use only what the conversation supports. No invented prices, dates, or promises.`,
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
        text: { format: { type: "json_schema", name: "conversation_summary", strict: true, schema: SCHEMA } },
      }),
    });

    if (!res.ok || !res.body) {
      const detail = await res.text().catch(() => "");
      if (res.status === 402) throw new Error("The workspace is out of AI credits.");
      if (res.status === 429) throw new Error("AI is busy right now — try again in a moment.");
      throw new Error(`Summary failed (${res.status}). ${detail.slice(0, 200)}`);
    }

    const text = await readStream(res);
    if (!text.trim()) throw new Error("The assistant didn't return a summary — try again.");
    const parsed = JSON.parse(text) as ConversationSummary;
    return {
      summary: parsed.summary ?? "",
      needs: parsed.needs ?? [],
      objections: parsed.objections ?? [],
      next_steps: parsed.next_steps ?? [],
      sentiment: parsed.sentiment ?? "unclear",
    };
  });
