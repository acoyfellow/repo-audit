# Reference: Configuration

## Wrangler

Worker config lives in `wrangler.jsonc`.

Bindings:

- `AI`: Cloudflare Workers AI binding
- `ASSETS`: static assets from `./dist`
- `RATE_LIMIT`: KV (rate limiting)
- `RESULTS`: KV (audit cache + shared results)

Routes:

- Custom domains are configured via `routes` (see `docs/how-to/custom-domain.md`).

## Environment variables / secrets

- `GITHUB_TOKEN` (optional): increases GitHub API rate limits
