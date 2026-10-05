# fitness-app

An offline-first strength training log that understands *how* you train: primers, intensity techniques (partials, eccentric-only reps, 1.5-rep ladders, trap sets) and weekly per-muscle set targets. It is not just a log of what you lifted.

The product research and roadmap live in [`docs/PLAN.md`](docs/PLAN.md).

## Status: Phase 1, data foundation

This repo currently contains the **storage-agnostic domain core** and the **Postgres schema**. The same TypeScript runs in the PWA (against local SQLite via PowerSync), in the future Expo app, and on the server.

| Path | What it is |
|---|---|
| `src/domain/types.ts` | Vocabulary: slot types (`primer`, `main`, `burnout`…), set types, technique kinds, logged workouts |
| `src/domain/volume.ts` | Weekly per-muscle volume: Σ set credit × muscle factor. Excludes primer/warm-up work. Technique segments (e.g. +4 partials) add coach-tunable credit |
| `src/domain/progression.ts` | Data-driven progression rules: `double_progression`, `linear` (with stall deload), `rep_target` |
| `src/domain/template.ts` | Method template DSL (zod), catalog-aware validation, default rest per slot type |
| `src/domain/planner.ts` | Projects a template's week into per-muscle set ranges and frequency, warns against targets, computes sets remaining this week |
| `src/data/catalog.ts` | Starter muscles, techniques and ~40 exercises (the production taxonomy is coach-owned) |
| `src/data/templates/` | House template *Twice-Weekly Primer + Intensity Split* (generic; no third-party branding) |
| `src/db/schema.ts` | Drizzle schema for Supabase: enums, RLS policies, synced-table conventions |
| `drizzle/` | Generated SQL migrations |

### Schema conventions

- Every client-synced table has a client-generated `uuid` id, `updated_at` (last-write-wins), and `deleted_at` (tombstones; never hard-delete).
- Every synced table also carries `user_id`. RLS policies (`user_id = auth.uid()`) and PowerSync sync rules can then filter without joins.
- A program's template is stored as validated JSON in `programs.template`, so a program syncs and versions as a single row.
- Weekly volume is computed client-side by `computeWeeklyVolume`, so it works offline. A server-side materialized view can come later for analytics.

## Development

```bash
npm install
npm run check        # typecheck + tests
npm run db:generate  # regenerate SQL migrations after editing src/db/schema.ts
```

## Next steps (from the plan)

1. PowerSync + Supabase spike: sync rules by `user_id`, then log a workout in airplane mode and confirm zero loss across two devices.
2. Next.js PWA shell (Serwist, SQLite WASM on OPFS, Wake Lock, rest-timer notifications) on top of this core.
3. Strong/Hevy CSV import.
4. Coach review of the exercise taxonomy, muscle factors and technique credit values.
