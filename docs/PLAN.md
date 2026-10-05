# Product & engineering plan (condensed)

Condensed from the research brief *"Building the Best Method-Driven Strength App"* (2026). Prices and competitor facts were checked in 2026 and change often.

## Positioning

> The offline-first training log that understands *how* you train, not just what you lifted.

- **Audience:** method-driven intermediate lifters who follow YouTube and science-based coaches.
- **Lead with the logger, not the AI.** Logging quality wins on day one.
- **Volume targets are configurable.** Default to 10–20 sets/week per muscle; offer 12–24 as an advanced preset.
- **Never brand content with a creator's name** (e.g. ATHLEAN-X) unless it is licensed. Exercise sequences are low IP risk under US precedent (*Bikram*, *Tracy Anderson v. Roup*). Names, videos, text and likeness are high risk.

## The method "grammar" (what the engine encodes)

Creator programs such as the 2025 "Perfect Workout" series reduce to about 8 primitives:

1. Primer slot (sub-max, 1–2 × 10–15, short rest)
2. Heavy compound to form failure (5–8 reps)
3. Mid-range accessory (8–12 reps)
4. Partials appended to a set
5. Eccentric-only reps appended after failure
6. 1.5-rep ladder
7. Trap set (time-under-tension ladder)
8. Bodyweight burnout to failure

These primitives map to `SlotType`, `Technique.countsAsSet` and `SetSegment` in `src/domain`.

## Market gaps (ranked)

1. Uncapped free routines. Strong caps free users at 3 routines and Hevy at 4.
2. Technique-aware logging, with partials, eccentrics and ladders as structured data.
3. Primer and corrective slots kept out of volume math and given their own rest defaults.
4. Weekly per-muscle volume planning below $80/yr. RP charges $299.99/yr.
5. Offline reliability: gyms are dead zones.
6. Regional LatAm pricing.
7. Method-faithful creator templates (B2B2C, later).

## Roadmap

| Phase | Weeks | Deliverables | Exit criterion |
|---|---|---|---|
| 0. Validation | 1–3 | Review mining, 15 lifter interviews, ES/EN landing page | ≥500 waitlist signups |
| 1. Data foundation | 3–6 | Drizzle schema, coach-built taxonomy, PowerSync + Supabase spike, offline Playwright suite | Airplane-mode workout syncs with zero loss across 2 devices |
| 2. MVP PWA | 6–12 | Logger, technique segments, free weekly volume counter, Strong/Hevy CSV import | 100 WAU beta, D30 ≥25% |
| 3. V1 | 13–28 | Method engine, progression rules, planner, Expo + HealthKit/Health Connect, Pro paywall | 3–5% free-to-paid, rating ≥4.6 |
| 4. V2 | 29–56 | Watch app, readiness autoregulation, creator marketplace, social-lite | First licensed creator program |

**Skip:** video classes, nutrition tracking (integrate instead), GPS cardio, an LLM chat coach as a core feature, and a full social network before 50K MAU.

## Architecture decisions

- **Sync:** PowerSync (Postgres to SQLite) on Supabase. Last-write-wins per row on `updated_at` for logs; field-level merge only for routines. Tombstones, never hard deletes. Do not hand-roll sync.
- **PWA:** Serwist service worker, SQLite WASM on OPFS, persistent storage request, Wake Lock, Notifications API for the rest timer.
- **Health:** A PWA cannot read HealthKit or Health Connect. Add an Expo app in V1, and use cloud wearables (Garmin, Whoop, Polar) through an aggregator in V2.
- **n8n:** reports, nudges and webhooks only. Never in the sync path.

## Pricing

- **Free:** unlimited logging, routines and history, plus the weekly muscle counter.
- **Pro:** $3.99/mo, $29.99/yr or $79.99 lifetime. Includes the method engine, progression automation, planner and analytics.
- **Regional:** LatAm pricing at about 40–50% of US prices.
- **Payments:** Stripe on the web; RevenueCat once native.

## Open caveats

- The Back/Legs set and rep numbers and the leg progression rule in the source research are **unverified**: they come from third-party reconstructions. Do not ship them as a creator's prescription.
- Stimulus credit for partials and eccentrics is debated. `techniques.volume_factor` is coach-editable for this reason.
- The legal analysis rests on US Ninth Circuit precedent. Get counsel (US + Bolivia) before launch.
