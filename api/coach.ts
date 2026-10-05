// Vercel Function: the conversational coach.
// Needs ANTHROPIC_API_KEY in the project's environment variables.
// Optional: COACH_ALLOWED_ORIGINS (comma-separated) to restrict callers.
import Anthropic from "@anthropic-ai/sdk";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { COACH_SYSTEM, COACH_TOOLS, LIMITS, PROPOSED, REMEMBERED, toAction, type CoachAction, type CoachTurn } from "../src/coach/spec.js";

const MODEL = "claude-opus-5-5";
const MAX_ROUNDS = 4;

// Best-effort per-instance rate limit: 30 requests per IP per hour.
const hits = new Map<string, number[]>();
function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 3_600_000);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > 30;
}

function allowedOrigin(origin: string | undefined, host: string | undefined): boolean {
  const extra = (process.env.COACH_ALLOWED_ORIGINS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (!origin) return false;
  try {
    const o = new URL(origin);
    return o.host === host || extra.includes(origin) || o.hostname === "localhost";
  } catch {
    return false;
  }
}

function validTurns(x: unknown): x is CoachTurn[] {
  return (
    Array.isArray(x) &&
    x.length > 0 &&
    x.length <= LIMITS.turns &&
    x.every((t) => t && (t.role === "user" || t.role === "assistant") && typeof t.content === "string" && t.content.length <= LIMITS.turnChars) &&
    x[x.length - 1].role === "user"
  );
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST." });
  if (!allowedOrigin(req.headers.origin, req.headers.host)) return res.status(403).json({ error: "Not allowed." });
  if (!process.env.ANTHROPIC_API_KEY) return res.status(503).json({ error: "The coach isn't connected yet.", code: "not_configured" });

  const ip = String(req.headers["x-forwarded-for"] ?? "").split(",")[0]?.trim() || "unknown";
  if (rateLimited(ip)) return res.status(429).json({ error: "You've asked a lot this hour. Try again in a bit.", code: "rate_limited" });

  const { messages, context } = (req.body ?? {}) as { messages?: unknown; context?: unknown };
  if (!validTurns(messages)) return res.status(400).json({ error: "Invalid conversation." });
  const contextText = JSON.stringify(context ?? {});
  if (contextText.length > LIMITS.contextChars) return res.status(400).json({ error: "Context too large." });

  const client = new Anthropic();
  const convo: Anthropic.Beta.BetaMessageParam[] = messages.map((m) => ({ role: m.role, content: m.content }));
  const actions: CoachAction[] = [];
  let reply = "";

  try {
    for (let round = 0; round < MAX_ROUNDS; round++) {
      const response = await client.beta.messages.create({
        model: MODEL,
        max_tokens: 4000,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default" as never,
        output_config: { effort: "medium" },
        system: [
          { type: "text", text: COACH_SYSTEM, cache_control: { type: "ephemeral" } },
          { type: "text", text: `ATHLETE DATA (today is ${new Date().toISOString().slice(0, 10)}):\n${contextText}` },
        ],
        tools: COACH_TOOLS.map((t) => ({ ...t, strict: true })) as never,
        messages: convo,
      });

      if (response.stop_reason === "refusal") {
        reply = "I can't help with that one. Ask me about your training, recovery or nutrition.";
        break;
      }

      const text = response.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("\n").trim();
      if (text) reply = reply ? `${reply}\n\n${text}` : text;

      const toolUses = response.content.filter((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === "tool_use");
      if (response.stop_reason !== "tool_use" || !toolUses.length) break;

      convo.push({ role: "assistant", content: response.content as Anthropic.Beta.BetaContentBlockParam[] });
      convo.push({
        role: "user",
        content: toolUses.map((tu) => {
          const action = toAction(tu.name, tu.input as Record<string, unknown>);
          if (action) actions.push(action);
          return {
            type: "tool_result" as const,
            tool_use_id: tu.id,
            content: action ? (action.type === "remember" ? REMEMBERED : PROPOSED) : "Unknown tool.",
            is_error: !action,
          };
        }),
      });
    }
    return res.status(200).json({ reply: reply || "Done. Check the suggestions below.", actions });
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) return res.status(429).json({ error: "The coach is busy. Try again in a minute.", code: "rate_limited" });
    if (err instanceof Anthropic.AuthenticationError) return res.status(503).json({ error: "The coach isn't connected yet.", code: "not_configured" });
    if (err instanceof Anthropic.APIError) return res.status(502).json({ error: "The coach couldn't answer. Try again.", code: "upstream" });
    return res.status(500).json({ error: "Something went wrong. Try again.", code: "internal" });
  }
}
