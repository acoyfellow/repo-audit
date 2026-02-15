# Contributing

Thanks for helping improve Repo Audit.

## Development

Prereqs:

- Node.js + npm
- A Cloudflare account (only required for Workers AI testing)

Install:

```bash
npm install
```

Run locally (UI + API, but no Workers AI binding):

```bash
npm run dev
```

Run remote dev on Cloudflare (to exercise Workers AI):

```bash
npx wrangler whoami
cp .dev.vars.example .dev.vars
npm run dev:cf
```

## Tests

```bash
npm test
```

## Docs (Diataxis)

Documentation follows Diataxis:

- Tutorials: `docs/tutorials/`
- How-to guides: `docs/how-to/`
- Reference: `docs/reference/`
- Explanation: `docs/explanation/`

When adding docs, pick the right doc type. Avoid mixing “how” and “why” on the same page.

## Secrets

Do not commit secrets.

- Use `GITHUB_TOKEN` via `.dev.vars` / Cloudflare secrets.
- Keep any account-specific Wrangler config in `wrangler.local.jsonc` (gitignored).

