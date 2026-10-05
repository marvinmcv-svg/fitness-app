import { createClient, type Session, type SupabaseClient } from "@supabase/supabase-js";
import type { FoodEntry, Profile } from "./store";

/**
 * Supabase is optional: with VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY
 * set (see .env.example) members sign up with Google or email and their
 * profile and food log sync. Without them the app runs on this device only.
 */
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

export const supabase: SupabaseClient | null = url && key ? createClient(url, key) : null;
export const cloudEnabled = supabase !== null;

export type AuthResult = { ok: true; message?: string } | { ok: false; error: string };

export async function signInWithGoogle(): Promise<AuthResult> {
  if (!supabase) return { ok: false, error: "Accounts aren't set up yet. Continue as a guest for now." };
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: window.location.origin + window.location.pathname },
  });
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function signUpWithEmail(email: string, password: string, name: string): Promise<AuthResult> {
  if (!supabase) return { ok: false, error: "Accounts aren't set up yet. Continue as a guest for now." };
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: name }, emailRedirectTo: window.location.origin + window.location.pathname },
  });
  if (error) return { ok: false, error: error.message };
  return data.session ? { ok: true } : { ok: true, message: `Check ${email} for a link to confirm your account.` };
}

export async function signInWithEmail(email: string, password: string): Promise<AuthResult> {
  if (!supabase) return { ok: false, error: "Accounts aren't set up yet. Continue as a guest for now." };
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function signOut() {
  await supabase?.auth.signOut();
}

export function onSession(cb: (session: Session | null) => void): () => void {
  if (!supabase) {
    cb(null);
    return () => {};
  }
  supabase.auth.getSession().then(({ data }) => cb(data.session));
  const { data } = supabase.auth.onAuthStateChange((_event, session) => cb(session));
  return () => data.subscription.unsubscribe();
}

export function displayNameOf(session: Session): string {
  const meta = session.user.user_metadata as { full_name?: string; name?: string };
  return meta.full_name ?? meta.name ?? session.user.email?.split("@")[0] ?? "Member";
}

/* ----------------------------------------------------------------- profile */

export async function loadProfile(userId: string): Promise<Profile | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("answers, program_slug, swaps, display_name")
    .eq("id", userId)
    .maybeSingle();
  if (error || !data || !data.program_slug) return null;
  return { ...(data.answers as Profile), programSlug: data.program_slug, swaps: data.swaps ?? {}, name: data.display_name ?? "" };
}

export async function saveProfile(userId: string, profile: Profile, macroTargets: unknown) {
  if (!supabase) return;
  const { programSlug, swaps, name, ...answers } = profile;
  await supabase.from("profiles").upsert({
    id: userId,
    display_name: name,
    answers,
    program_slug: programSlug,
    swaps,
    macro_targets: macroTargets,
    updated_at: new Date().toISOString(),
  });
}

/* --------------------------------------------------------------- food logs */

interface FoodRow {
  id: string;
  eaten_at: string;
  meal: FoodEntry["meal"];
  name: string;
  brand: string | null;
  barcode: string | null;
  grams: number | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  source: FoodEntry["source"];
}

const toEntry = (r: FoodRow): FoodEntry => ({
  id: r.id,
  eatenAt: r.eaten_at,
  meal: r.meal,
  name: r.name,
  brand: r.brand ?? undefined,
  barcode: r.barcode ?? undefined,
  grams: r.grams ?? undefined,
  source: r.source,
  macros: { calories: Number(r.calories), protein: Number(r.protein), carbs: Number(r.carbs), fat: Number(r.fat) },
});

export async function loadFood(userId: string, sinceIso: string): Promise<FoodEntry[] | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("food_logs")
    .select("id, eaten_at, meal, name, brand, barcode, grams, calories, protein, carbs, fat, source")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .gte("eaten_at", sinceIso)
    .order("eaten_at");
  return error ? null : (data as FoodRow[]).map(toEntry);
}

export async function saveFood(userId: string, e: FoodEntry) {
  if (!supabase) return;
  await supabase.from("food_logs").upsert({
    id: e.id,
    user_id: userId,
    eaten_at: e.eatenAt,
    meal: e.meal,
    name: e.name,
    brand: e.brand ?? null,
    barcode: e.barcode ?? null,
    grams: e.grams ?? null,
    calories: e.macros.calories,
    protein: e.macros.protein,
    carbs: e.macros.carbs,
    fat: e.macros.fat,
    source: e.source,
    updated_at: new Date().toISOString(),
  });
}

export async function deleteFood(userId: string, id: string) {
  if (!supabase) return;
  const now = new Date().toISOString();
  await supabase.from("food_logs").update({ deleted_at: now, updated_at: now }).eq("id", id).eq("user_id", userId);
}

/* ------------------------------------------------------- photo estimation */

export interface PhotoEstimate {
  items: { name: string; grams: number; calories: number; protein: number; carbs: number; fat: number }[];
  confidence: "low" | "medium" | "high";
  notes: string;
}

export async function estimateFromPhoto(image: string, mediaType: string): Promise<PhotoEstimate | { error: string }> {
  if (!supabase) return { error: "Photo estimates need an account. Sign up to use them." };
  const { data, error } = await supabase.functions.invoke("estimate-macros", { body: { image, mediaType } });
  if (error) return { error: "Couldn't analyze the photo. Try again, or add the food by search." };
  return data as PhotoEstimate;
}

/* ------------------------------------------------------- Open Food Facts */

export interface BarcodeProduct {
  name: string;
  brand?: string;
  per100g: { calories: number; protein: number; carbs: number; fat: number };
  servingGrams?: number;
}

/** Look up a packaged food by barcode (free, no key). Null when not found or offline. */
export async function lookupBarcode(code: string): Promise<BarcodeProduct | null> {
  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=product_name,brands,nutriments,serving_quantity`,
    );
    if (!res.ok) return null;
    const body = (await res.json()) as {
      status: number;
      product?: { product_name?: string; brands?: string; serving_quantity?: number; nutriments?: Record<string, number> };
    };
    const p = body.product;
    if (body.status !== 1 || !p?.nutriments) return null;
    const n = p.nutriments;
    const kcal = n["energy-kcal_100g"] ?? (n["energy_100g"] ? n["energy_100g"] / 4.184 : undefined);
    if (kcal == null) return null;
    return {
      name: p.product_name || "Scanned product",
      brand: p.brands?.split(",")[0]?.trim(),
      per100g: {
        calories: Math.round(kcal),
        protein: n["proteins_100g"] ?? 0,
        carbs: n["carbohydrates_100g"] ?? 0,
        fat: n["fat_100g"] ?? 0,
      },
      servingGrams: p.serving_quantity ? Number(p.serving_quantity) : undefined,
    };
  } catch {
    return null;
  }
}
