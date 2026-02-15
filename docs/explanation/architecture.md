# Explanation: Architecture

This project is an edge app with a thin UI and a server API:

- **UI**: Astro + Tailwind, with a React island for the interactive "three-act" experience.
- **API**: `GET /api/audit` fetches GitHub signals, runs deterministic scoring, and optionally runs a Workers AI qualitative pass.
- **Deploy**: Astro SSR output is packaged as a Cloudflare Worker with static assets.

Key files:

- UI: `src/pages/index.astro`, `src/components/RepoAuditApp.tsx`
- API: `src/pages/api/audit.ts`
- Scoring: `src/lib/scoreRepo.ts`

