# Repo Audit (Astro + Tailwind + Cloudflare Workers AI)

Prototype turned into a deployable edge app:

- Frontend: Astro + React island + Tailwind
- Backend: Astro API route `GET /api/audit`
- AI: Cloudflare Workers AI (`env.AI.run(...)`) for an optional qualitative pass
  - Default model: `@cf/zai-org/glm-4.7-flash`

## Local dev

Runs UI + API locally, but **without Workers AI** (no `AI` binding locally).

```bash
npm install
npm run dev
```

## Cloudflare dev (Workers AI)

Workers AI requires remote dev.

```bash
# 1) Auth (one-time)
npx wrangler whoami

# 2) Optional: raise GitHub API rate limits
cp .dev.vars.example .dev.vars

# 3) Run remote dev
npm run dev:cf
```

## Deploy

```bash
npx wrangler whoami
npm run deploy
```

## Notes

- `wrangler.jsonc` configures:
  - assets from `./dist`
  - `AI` binding for Workers AI
  - `RATE_LIMIT` + `RESULTS` KV bindings (you must create KV namespaces and fill in their ids)
- Astro sessions are explicitly configured to use the in-memory driver (no KV binding required).
- Scoring rubric is available at `/matrix`.
- Legacy single-file prototype is kept in `/_legacy/`.

## Documentation (Diataxis)

Docs are organized using the Diataxis framework:

- `docs/tutorials/`
- `docs/how-to/`
- `docs/reference/`
- `docs/explanation/`
