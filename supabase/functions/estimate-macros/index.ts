// Estimates the macros in a meal photo with Claude vision.
// Deploy: supabase functions deploy estimate-macros
// Secret:  supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
// Called from the app with supabase.functions.invoke (JWT verified by the platform).
import Anthropic from "npm:@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY") });

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["items", "confidence", "notes"],
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "grams", "calories", "protein", "carbs", "fat"],
        properties: {
          name: { type: "string" },
          grams: { type: "number" },
          calories: { type: "number" },
          protein: { type: "number" },
          carbs: { type: "number" },
          fat: { type: "number" },
        },
      },
    },
    confidence: { type: "string", enum: ["low", "medium", "high"] },
    notes: { type: "string" },
  },
};

const SYSTEM =
  "You estimate nutrition from meal photos for a fitness app. List each distinct food you can see " +
  "with an estimated cooked weight in grams and its calories and macros (protein, carbs, fat in grams). " +
  "Use plate, cutlery and hands for scale. Include visible oils and sauces. If the photo is not food, " +
  "return an empty items list and say so in notes. Keep notes to one short sentence.";

const MEDIA_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Use POST" }, 405);

  let image: string, mediaType: string;
  try {
    ({ image, mediaType } = await req.json());
  } catch {
    return json({ error: "Send JSON: { image: <base64>, mediaType: 'image/jpeg' }" }, 400);
  }
  if (!image || !MEDIA_TYPES.has(mediaType)) return json({ error: "Missing image or unsupported mediaType" }, 400);
  if (image.length > 7_000_000) return json({ error: "Image too large. Resize to under 5 MB." }, 413);

  try {
    const response = await client.beta.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 4000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA } },
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data: image } },
            { type: "text", text: "Estimate the macros for this meal." },
          ],
        },
      ],
    } as never);

    if (response.stop_reason === "refusal") return json({ error: "The photo could not be analyzed." }, 422);
    const text = response.content.find((b: { type: string }) => b.type === "text") as { text: string } | undefined;
    if (!text) return json({ error: "No estimate returned" }, 502);
    return json(JSON.parse(text.text));
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) return json({ error: "Busy. Try again in a minute." }, 429);
    if (err instanceof Anthropic.AuthenticationError) return json({ error: "Server API key is not configured." }, 500);
    if (err instanceof Anthropic.APIError) return json({ error: `Estimate failed (${err.status})` }, 502);
    return json({ error: "Estimate failed" }, 500);
  }
});
