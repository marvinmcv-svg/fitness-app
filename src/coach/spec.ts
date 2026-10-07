/**
 * Shared spec for the conversational coach: the instructions, the actions it
 * can propose, and the athlete context it reads. Used by the Vercel function
 * (api/coach.ts) and by the in-preview transport, so both coach the same way.
 */

export const COACH_SYSTEM = `You are the FuerzaFlow coach: a strength and nutrition coach inside a training app.

You coach from the athlete's real data, given below as ATHLETE DATA. Before answering, look at it: their goal, program, the last 7 days of sets per muscle against targets, recent workouts and lift trends, today's food, and saved memory notes. Use their numbers in your answer ("you did 6 of 10 sets for lats"), not generic advice.

How to coach:
- Be brief and specific. Lead with the answer. Most replies are 2–5 short sentences or a short list. Use plain words a gym-goer uses.
- Give one clear recommendation instead of a menu of options, unless they ask for options.
- Base training advice on established principles: progressive overload, roughly 10–20 hard sets per muscle per week for most people, training each muscle about twice a week, 1–3 reps in reserve on most sets, protein around 1.6–2.2 g per kg of body weight.
- When a change to their plan would help, propose it with a tool instead of only describing it. The athlete sees each proposal as a card with an Apply button and decides. Say in one line what you proposed and why.
  - swap_exercise: only use an exercise slug from that slot's "options" list in the data.
  - change_program and set_volume_targets: only when their schedule, experience or results call for it.
  - log_food: when they tell you what they ate. Estimate realistic portions and macros; say they can edit after.
  - remember: when they share something you should keep in mind next time (an injury, a schedule constraint, a preference, an event date). Keep notes short and factual.
- Never invent numbers that aren't in the data. If something isn't logged, say so and suggest logging it.

Safety:
- You are not a doctor. For pain that is sharp, worsening, or comes with swelling, numbness or a pop, tell them to stop loading that area and see a doctor or physiotherapist, then offer to work around it.
- For chest pain, fainting, or trouble breathing, tell them to stop and get medical help. Do not coach through it.
- Never recommend fewer than 1,200 kcal/day (women) or 1,500 kcal/day (men), crash diets, dehydration, or drugs. If they describe disordered eating, respond with care and point them to professional help.
- Don't prescribe for pregnancy, diagnosed conditions or post-surgery rehab beyond general encouragement; suggest a qualified professional.

Language: reply in the language named in ATHLETE DATA "reply_language" (English if missing), even if the data itself is in English. Keep exercise and food names natural for that language. Write tool "reason" fields and food names in that language too.

Format: plain text with short paragraphs or "- " bullet lists. No markdown headings, no tables, no bold.`;

export interface CoachTool {
  name: string;
  description: string;
  input_schema: {
    type: "object";
    properties: Record<string, unknown>;
    required: string[];
    additionalProperties: false;
  };
}

export const COACH_TOOLS: CoachTool[] = [
  {
    name: "swap_exercise",
    description: "Propose replacing one exercise in the athlete's program with an alternative from that slot's options list.",
    input_schema: {
      type: "object",
      properties: {
        day_key: { type: "string", description: "Program day key, e.g. upper-a" },
        slot_index: { type: "integer", description: "The slot's index as given in the data" },
        exercise: { type: "string", description: "Exercise slug from the slot's options list" },
        reason: { type: "string", description: "One short sentence the athlete will read" },
      },
      required: ["day_key", "slot_index", "exercise", "reason"],
      additionalProperties: false,
    },
  },
  {
    name: "change_program",
    description: "Propose switching to a different program template.",
    input_schema: {
      type: "object",
      properties: {
        program_slug: { type: "string", enum: ["full-body", "upper-lower", "twice-weekly-primer-split"] },
        reason: { type: "string" },
      },
      required: ["program_slug", "reason"],
      additionalProperties: false,
    },
  },
  {
    name: "set_volume_targets",
    description: "Propose a weekly sets-per-muscle target range: beginner 8-14, standard 10-20, advanced 12-24.",
    input_schema: {
      type: "object",
      properties: {
        preset: { type: "string", enum: ["beginner", "standard", "advanced"] },
        reason: { type: "string" },
      },
      required: ["preset", "reason"],
      additionalProperties: false,
    },
  },
  {
    name: "log_food",
    description: "Propose adding a food the athlete says they ate to today's log, with estimated macros.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string" },
        meal: { type: "string", enum: ["breakfast", "lunch", "dinner", "snack"] },
        grams: { type: "number" },
        calories: { type: "number" },
        protein: { type: "number" },
        carbs: { type: "number" },
        fat: { type: "number" },
      },
      required: ["name", "meal", "grams", "calories", "protein", "carbs", "fat"],
      additionalProperties: false,
    },
  },
  {
    name: "remember",
    description: "Save a short fact about the athlete to remember in future conversations (injury, constraint, preference, event).",
    input_schema: {
      type: "object",
      properties: { note: { type: "string", description: "Under 120 characters" } },
      required: ["note"],
      additionalProperties: false,
    },
  },
];

export type CoachAction =
  | { type: "swap_exercise"; day_key: string; slot_index: number; exercise: string; reason: string }
  | { type: "change_program"; program_slug: string; reason: string }
  | { type: "set_volume_targets"; preset: "beginner" | "standard" | "advanced"; reason: string }
  | { type: "log_food"; name: string; meal: "breakfast" | "lunch" | "dinner" | "snack"; grams: number; calories: number; protein: number; carbs: number; fat: number }
  | { type: "remember"; note: string };

/** What the tool result tells the model after it proposes an action. */
export const PROPOSED = "Shown to the athlete as a card with an Apply button. They decide; don't assume it was applied.";
export const REMEMBERED = "Saved to memory. The athlete can see and delete it.";

export function toAction(name: string, input: Record<string, unknown>): CoachAction | null {
  if (!COACH_TOOLS.some((t) => t.name === name)) return null;
  return { type: name, ...input } as CoachAction;
}

export interface CoachTurn {
  role: "user" | "assistant";
  content: string;
}

/** Hard limits shared by client and server. */
export const LIMITS = { turns: 24, turnChars: 2000, contextChars: 24000 };
