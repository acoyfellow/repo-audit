# How-to: Avoid GitHub API Rate Limits

Server-side auditing uses the GitHub REST API. Unauthenticated requests are rate-limited.

If you see `GitHub API rate limit exceeded`, you have three options (from best to worst):

- Set a server-side `GITHUB_TOKEN` (recommended for public deployments).
- Paste a token into the UI (Advanced) to use your own limits (token is **not stored**).
- Wait for the rate limit window to reset.

## Local (dev)

1. Copy:

```bash
cp .dev.vars.example .dev.vars
```

2. Set `GITHUB_TOKEN` inside `.dev.vars`.

3. Run:

```bash
npm run dev
```

## Production (Cloudflare)

Set a Worker secret:

```bash
npx wrangler secret put GITHUB_TOKEN
```

This raises the global GitHub request budget for everyone using the deployed site.
