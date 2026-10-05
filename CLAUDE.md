# fitness-app

## Previewing the app (cloud sessions)

The user works in Claude Code on the web, where `localhost` on the container is not reachable from their browser. After any change to the UI (`app/`), always:

1. Run `npm run check` (typecheck + tests).
2. Run `npm run build:artifact` to produce `dist/setwise.html`.
3. Publish `dist/setwise.html` with the Artifact tool, reusing the existing artifact URL
   https://claude.ai/artifact/6pXqocA2bkFwHVk5Tr8v6L (pass it as `url`, after a `read`), so the
   side-panel preview updates in place. Then `open` it for the user.

Do not tell the user to open `localhost:5173` unless they are running `npm run dev` on their own computer.

## Layout

- `src/domain`: storage-agnostic training logic (volume, progression, templates, planner) with tests in `test/`.
- `src/db/schema.ts`: Drizzle/Supabase schema; regenerate migrations with `npm run db:generate`.
- `app/`: Vite + React iOS-style UI. `npm run dev` for local development on the user's own machine.
