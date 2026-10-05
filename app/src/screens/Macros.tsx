import { useMemo, useRef, useState } from "react";
import { searchFoods, type Food } from "../../../src/data/foods";
import { scaleMacros, sumMacros, type Macros as MacroSet } from "../../../src/domain/nutrition";
import { cloudEnabled, estimateFromPhoto, lookupBarcode, type PhotoEstimate } from "../cloud";
import { targetsMacros, uid, type AppState, type FoodEntry, type Meal } from "../store";
import { Icon } from "../ui/Icon";
import { Ring } from "../ui/Ring";

const MEALS: { id: Meal; label: string }[] = [
  { id: "breakfast", label: "Breakfast" },
  { id: "lunch", label: "Lunch" },
  { id: "dinner", label: "Dinner" },
  { id: "snack", label: "Snacks" },
];

const defaultMeal = (): Meal => {
  const h = new Date().getHours();
  return h < 11 ? "breakfast" : h < 16 ? "lunch" : h < 21 ? "dinner" : "snack";
};

interface Props {
  state: AppState;
  onAdd: (entries: FoodEntry[]) => void;
  onDelete: (id: string) => void;
}

export function Macros({ state, onAdd, onDelete }: Props) {
  const [offset, setOffset] = useState(0); // days back from today
  const [sheet, setSheet] = useState<{ meal: Meal } | null>(null);
  const target = targetsMacros(state.profile) ?? { calories: 2400, protein: 150, carbs: 270, fat: 70 };

  const day = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - offset);
    return d;
  }, [offset]);
  const entries = state.food.filter((f) => sameDay(new Date(f.eatenAt), day));
  const eaten = sumMacros(entries.map((e) => e.macros));
  const left = target.calories - eaten.calories;
  const dayLabel = offset === 0 ? "Today" : offset === 1 ? "Yesterday" : day.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });

  return (
    <div className="screen">
      <header className="large-title">
        <div className="lt-text">
          <p className="eyebrow">Nutrition</p>
          <h1>Macros</h1>
        </div>
        <button className="cam-btn" onClick={() => setSheet({ meal: offset === 0 ? defaultMeal() : "snack" })} aria-label="Log food with camera">
          <Icon name="camera" size={22} />
        </button>
      </header>

      <div className="day-nav">
        <button className="icon-btn" onClick={() => setOffset(offset + 1)} aria-label="Previous day">
          <Icon name="chevron" size={18} className="flip" />
        </button>
        <span>{dayLabel}</span>
        <button className="icon-btn" onClick={() => setOffset(Math.max(0, offset - 1))} disabled={offset === 0} aria-label="Next day">
          <Icon name="chevron" size={18} />
        </button>
      </div>

      <section className="card macro-hero">
        <div className="macro-cal">
          <Ring value={eaten.calories / target.calories} size={132} width={12} color={left < 0 ? "var(--warn)" : "var(--accent)"}>
            <span className="cal-num">{Math.abs(left).toLocaleString()}</span>
            <span className="cal-sub">{left < 0 ? "kcal over" : "kcal left"}</span>
          </Ring>
          <dl className="cal-break">
            <div>
              <dt>Goal</dt>
              <dd>{target.calories.toLocaleString()}</dd>
            </div>
            <div>
              <dt>Eaten</dt>
              <dd>{eaten.calories.toLocaleString()}</dd>
            </div>
          </dl>
        </div>
        <div className="macro-trio">
          <MacroRing label="Protein" color="var(--protein)" value={eaten.protein} goal={target.protein} />
          <MacroRing label="Carbs" color="var(--carbs)" value={eaten.carbs} goal={target.carbs} />
          <MacroRing label="Fat" color="var(--fat)" value={eaten.fat} goal={target.fat} />
        </div>
      </section>

      <div className="quick-log">
        <button className="quick-btn" onClick={() => setSheet({ meal: offset === 0 ? defaultMeal() : "snack" })}>
          <Icon name="camera" size={20} />
          <span>
            <strong>Snap a meal</strong>
            <span>Photo or barcode</span>
          </span>
        </button>
        <button className="quick-btn" onClick={() => setSheet({ meal: offset === 0 ? defaultMeal() : "snack" })}>
          <Icon name="search" size={20} />
          <span>
            <strong>Search foods</strong>
            <span>Or quick add</span>
          </span>
        </button>
      </div>

      {MEALS.map((meal) => {
        const items = entries.filter((e) => e.meal === meal.id);
        const total = sumMacros(items.map((i) => i.macros));
        return (
          <section className="group" key={meal.id}>
            <div className="group-head">
              <h3>{meal.label}</h3>
              <span className="muted small num">{total.calories} kcal</span>
            </div>
            <ul className="list card">
              {items.map((it) => (
                <li className="row" key={it.id}>
                  <span className={`row-icon food-src-${it.source}`}>
                    <Icon name={it.source === "photo" ? "camera" : it.source === "barcode" ? "barcode" : "pie"} size={18} />
                  </span>
                  <span className="row-text">
                    <span className="row-title">{it.name}</span>
                    <span className="row-sub">
                      {it.grams ? `${Math.round(it.grams)} g · ` : ""}P {fmt1(it.macros.protein)} · C {fmt1(it.macros.carbs)} · F {fmt1(it.macros.fat)}
                    </span>
                  </span>
                  <span className="row-kcal num">{it.macros.calories}</span>
                  <button className="row-del" onClick={() => onDelete(it.id)} aria-label={`Remove ${it.name}`}>
                    <Icon name="close" size={16} />
                  </button>
                </li>
              ))}
              <li className="row">
                <button className="row-btn add-food" onClick={() => setSheet({ meal: meal.id })}>
                  <Icon name="plus" size={18} stroke={2.4} /> Add food
                </button>
              </li>
            </ul>
          </section>
        );
      })}

      {sheet && (
        <AddFood
          meal={sheet.meal}
          day={day}
          onClose={() => setSheet(null)}
          onAdd={(list) => {
            onAdd(list);
            setSheet(null);
          }}
        />
      )}
    </div>
  );
}

function MacroRing({ label, color, value, goal }: { label: string; color: string; value: number; goal: number }) {
  const left = Math.round(goal - value);
  return (
    <div className="macro-ring">
      <p className="macro-label" style={{ color }}>{label}</p>
      <Ring value={value / goal} size={74} width={8} color={color}>
        <span className="ring-num small-num">{Math.round(value)}</span>
        <span className="ring-den">/{goal}g</span>
      </Ring>
      <p className="ring-card-foot">{left >= 0 ? `${left}g left` : `${-left}g over`}</p>
    </div>
  );
}

/* ---------------------------------------------------------------- add food */

type Picked = { name: string; brand?: string; barcode?: string; per100g: MacroSet; serving?: { grams: number; label: string }; source: FoodEntry["source"] };

function AddFood({ meal: initialMeal, day, onClose, onAdd }: { meal: Meal; day: Date; onClose: () => void; onAdd: (e: FoodEntry[]) => void }) {
  const [meal, setMeal] = useState<Meal>(initialMeal);
  const [tab, setTab] = useState<"camera" | "search" | "quick">("camera");
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<Picked | null>(null);
  const [grams, setGrams] = useState("100");
  const [estimate, setEstimate] = useState<(PhotoEstimate & { keep: boolean[]; preview: string }) | null>(null);
  const [status, setStatus] = useState<{ tone: "info" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [quick, setQuick] = useState({ name: "", calories: "", protein: "", carbs: "", fat: "" });
  const photoInput = useRef<HTMLInputElement>(null);
  const barcodeInput = useRef<HTMLInputElement>(null);

  const eatenAt = () => {
    const now = new Date();
    const d = new Date(day);
    if (sameDay(d, now)) return now.toISOString();
    d.setHours(12, 0, 0, 0);
    return d.toISOString();
  };
  const entry = (p: Omit<FoodEntry, "id" | "eatenAt" | "meal">): FoodEntry => ({ id: crypto.randomUUID?.() ?? uid(), eatenAt: eatenAt(), meal, ...p });

  const pick = (p: Picked) => {
    setPicked(p);
    setGrams(String(p.serving?.grams ?? 100));
    setStatus(null);
  };

  const findBarcode = async (code: string) => {
    setBusy(true);
    setStatus({ tone: "info", text: `Looking up ${code}…` });
    const product = await lookupBarcode(code);
    setBusy(false);
    if (!product) return setStatus({ tone: "error", text: `No nutrition data found for ${code}. Search for the food or quick add it.` });
    pick({
      name: product.name,
      brand: product.brand,
      barcode: code,
      per100g: product.per100g,
      serving: product.servingGrams ? { grams: product.servingGrams, label: "1 serving" } : undefined,
      source: "barcode",
    });
  };

  const onBarcodePhoto = async (file: File) => {
    const Detector = (window as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => { detect: (s: ImageBitmap) => Promise<{ rawValue: string }[]> } }).BarcodeDetector;
    if (!Detector) return setStatus({ tone: "error", text: "This browser can't read barcodes from photos. Type the number under the barcode instead." });
    try {
      const bitmap = await createImageBitmap(file);
      const codes = await new Detector({ formats: ["ean_13", "ean_8", "upc_a", "upc_e"] }).detect(bitmap);
      if (!codes.length) return setStatus({ tone: "error", text: "No barcode found. Hold the camera closer and keep it sharp, or type the number." });
      await findBarcode(codes[0]!.rawValue);
    } catch {
      setStatus({ tone: "error", text: "Couldn't read that photo. Try again or type the number." });
    }
  };

  const onMealPhoto = async (file: File) => {
    setBusy(true);
    setStatus({ tone: "info", text: "Estimating your meal…" });
    try {
      const { base64, preview } = await toJpeg(file);
      const result = await estimateFromPhoto(base64, "image/jpeg");
      if ("error" in result) {
        setStatus({ tone: "error", text: result.error });
      } else if (!result.items.length) {
        setStatus({ tone: "error", text: result.notes || "No food found in that photo." });
      } else {
        setEstimate({ ...result, keep: result.items.map(() => true), preview });
        setStatus(null);
      }
    } catch {
      setStatus({ tone: "error", text: "Couldn't read that photo. Try another one." });
    }
    setBusy(false);
  };

  const g = Number(grams) || 0;
  const pickedMacros = picked ? scaleMacros(picked.per100g, g) : null;

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet sheet-tall" role="dialog" aria-label="Add food" onClick={(e) => e.stopPropagation()}>
        <span className="sheet-grabber" aria-hidden="true" />
        <div className="sheet-top">
          <h3>{picked ? picked.name : estimate ? "Photo estimate" : "Add food"}</h3>
          <button className="icon-btn" onClick={picked || estimate ? () => { setPicked(null); setEstimate(null); } : onClose} aria-label={picked || estimate ? "Back" : "Close"}>
            <Icon name={picked || estimate ? "chevron" : "close"} size={18} className={picked || estimate ? "flip" : undefined} />
          </button>
        </div>
        <div className="meal-chips" role="radiogroup" aria-label="Meal">
          {MEALS.map((m) => (
            <button key={m.id} role="radio" aria-checked={meal === m.id} className={`chip${meal === m.id ? " on" : ""}`} onClick={() => setMeal(m.id)}>
              {m.label}
            </button>
          ))}
        </div>

        {picked && pickedMacros ? (
          <div className="portion">
            {picked.brand && <p className="muted">{picked.brand}</p>}
            <div className="portion-row">
              <label className="num-field grow" htmlFor="portion-grams">
                <span>Amount</span>
                <span className="num-field-input">
                  <input id="portion-grams" inputMode="decimal" value={grams} onChange={(e) => setGrams(e.target.value.replace(/[^\d.]/g, ""))} />
                  <em>g</em>
                </span>
              </label>
              {picked.serving && (
                <button className="chip" onClick={() => setGrams(String(picked.serving!.grams))}>
                  {picked.serving.label} · {picked.serving.grams} g
                </button>
              )}
            </div>
            <MacroSummary m={pickedMacros} />
            <button
              className="btn-primary"
              disabled={g <= 0}
              onClick={() => onAdd([entry({ name: picked.name, brand: picked.brand, barcode: picked.barcode, grams: g, source: picked.source, macros: pickedMacros })])}
            >
              Add to {MEALS.find((m) => m.id === meal)!.label.toLowerCase()}
            </button>
          </div>
        ) : estimate ? (
          <div className="estimate">
            <img className="estimate-photo" src={estimate.preview} alt="Your meal" />
            <p className="muted small">
              Estimated with {estimate.confidence} confidence. {estimate.notes} Untick anything that's wrong.
            </p>
            <ul className="list card">
              {estimate.items.map((it, i) => (
                <li className="row" key={i}>
                  <button
                    className={`tick${estimate.keep[i] ? " on" : ""}`}
                    aria-pressed={estimate.keep[i]}
                    aria-label={`Include ${it.name}`}
                    onClick={() => setEstimate({ ...estimate, keep: estimate.keep.map((k, j) => (j === i ? !k : k)) })}
                  >
                    <Icon name="check" size={16} stroke={2.6} />
                  </button>
                  <span className="row-text">
                    <span className="row-title">{it.name}</span>
                    <span className="row-sub">
                      ~{Math.round(it.grams)} g · P {fmt1(it.protein)} · C {fmt1(it.carbs)} · F {fmt1(it.fat)}
                    </span>
                  </span>
                  <span className="row-kcal num">{Math.round(it.calories)}</span>
                </li>
              ))}
            </ul>
            <button
              className="btn-primary"
              disabled={!estimate.keep.some(Boolean)}
              onClick={() =>
                onAdd(
                  estimate.items
                    .filter((_, i) => estimate.keep[i])
                    .map((it) =>
                      entry({
                        name: it.name,
                        grams: it.grams,
                        source: "photo",
                        macros: { calories: Math.round(it.calories), protein: it.protein, carbs: it.carbs, fat: it.fat },
                      }),
                    ),
                )
              }
            >
              Add {estimate.keep.filter(Boolean).length} items
            </button>
          </div>
        ) : (
          <>
            <div className="segmented" role="tablist" aria-label="Add food by">
              {(
                [
                  ["camera", "Camera"],
                  ["search", "Search"],
                  ["quick", "Quick add"],
                ] as const
              ).map(([id, label]) => (
                <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? "on" : ""} onClick={() => { setTab(id); setStatus(null); }}>
                  {label}
                </button>
              ))}
            </div>

            {tab === "camera" && (
              <div className="cam-options">
                <input ref={photoInput} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void onMealPhoto(f); }} />
                <input ref={barcodeInput} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void onBarcodePhoto(f); }} />
                <button className="cam-tile" onClick={() => photoInput.current?.click()} disabled={busy}>
                  <span className="cam-tile-icon">
                    <Icon name="camera" size={26} />
                  </span>
                  <strong>Snap your meal</strong>
                  <span>AI estimates each food and its macros</span>
                  {!cloudEnabled && <em>Needs an account</em>}
                </button>
                <button className="cam-tile" onClick={() => barcodeInput.current?.click()} disabled={busy}>
                  <span className="cam-tile-icon">
                    <Icon name="barcode" size={26} />
                  </span>
                  <strong>Scan a barcode</strong>
                  <span>Packaged foods from Open Food Facts</span>
                </button>
                <form
                  className="barcode-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (/^\d{8,14}$/.test(manualCode)) void findBarcode(manualCode);
                    else setStatus({ tone: "error", text: "Barcodes are 8 to 14 digits." });
                  }}
                >
                  <input id="manual-barcode" inputMode="numeric" placeholder="Or type the barcode number" value={manualCode} onChange={(e) => setManualCode(e.target.value.replace(/\D/g, ""))} />
                  <button className="btn-small" type="submit" disabled={busy || !manualCode}>
                    Look up
                  </button>
                </form>
              </div>
            )}

            {tab === "search" && (
              <div className="food-search">
                <label className="search-field">
                  <Icon name="search" size={18} />
                  <input id="food-search" placeholder="Search foods" value={query} onChange={(e) => setQuery(e.target.value)} autoComplete="off" />
                </label>
                <ul className="list card food-results">
                  {searchFoods(query).map((f: Food) => (
                    <li className="row" key={f.id}>
                      <button className="row-btn" onClick={() => pick({ name: f.name, per100g: f.per100g, serving: f.serving, source: "catalog" })}>
                        <span className="row-text">
                          <span className="row-title">{f.name}</span>
                          <span className="row-sub">
                            {f.serving.label} ({f.serving.grams} g) · {scaleMacros(f.per100g, f.serving.grams).calories} kcal
                          </span>
                        </span>
                        <Icon name="plus" size={18} />
                      </button>
                    </li>
                  ))}
                  {searchFoods(query).length === 0 && (
                    <li className="row">
                      <span className="row-sub">No match for “{query}”. Use Quick add to enter it yourself.</span>
                    </li>
                  )}
                </ul>
              </div>
            )}

            {tab === "quick" && (
              <form
                className="quick-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  const m = { calories: Number(quick.calories) || 0, protein: Number(quick.protein) || 0, carbs: Number(quick.carbs) || 0, fat: Number(quick.fat) || 0 };
                  const calories = m.calories || Math.round(m.protein * 4 + m.carbs * 4 + m.fat * 9);
                  if (!calories) return setStatus({ tone: "error", text: "Enter calories or at least one macro." });
                  onAdd([entry({ name: quick.name.trim() || "Quick add", source: "manual", macros: { ...m, calories } })]);
                }}
              >
                <label className="field">
                  <span>Name</span>
                  <input id="quick-name" placeholder="e.g. Chicken burrito" value={quick.name} onChange={(e) => setQuick({ ...quick, name: e.target.value })} />
                </label>
                <div className="num-fields four">
                  {(["calories", "protein", "carbs", "fat"] as const).map((k) => (
                    <label className="num-field" key={k} htmlFor={`quick-${k}`}>
                      <span>{k[0]!.toUpperCase() + k.slice(1)}</span>
                      <span className="num-field-input">
                        <input id={`quick-${k}`} inputMode="decimal" value={quick[k]} onChange={(e) => setQuick({ ...quick, [k]: e.target.value.replace(/[^\d.]/g, "") })} placeholder="0" />
                        <em>{k === "calories" ? "kcal" : "g"}</em>
                      </span>
                    </label>
                  ))}
                </div>
                <p className="muted small">Leave calories empty to calculate them from the macros.</p>
                <button className="btn-primary" type="submit">
                  Add
                </button>
              </form>
            )}
          </>
        )}

        {status && (
          <p className={`auth-msg ${status.tone}`} role="status">
            {status.text}
          </p>
        )}
      </div>
    </div>
  );
}

function MacroSummary({ m }: { m: MacroSet }) {
  return (
    <div className="macro-summary">
      <span>
        <strong>{m.calories}</strong>kcal
      </span>
      <span style={{ color: "var(--protein)" }}>
        <strong>{fmt1(m.protein)}</strong>protein
      </span>
      <span style={{ color: "var(--carbs)" }}>
        <strong>{fmt1(m.carbs)}</strong>carbs
      </span>
      <span style={{ color: "var(--fat)" }}>
        <strong>{fmt1(m.fat)}</strong>fat
      </span>
    </div>
  );
}

/** Downscale a photo to ≤1280px JPEG (keeps uploads small and fast). */
async function toJpeg(file: File): Promise<{ base64: string; preview: string }> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1280 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const preview = canvas.toDataURL("image/jpeg", 0.85);
  return { base64: preview.split(",")[1]!, preview };
}

const fmt1 = (n: number) => (Math.round(n * 10) / 10).toString();

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
