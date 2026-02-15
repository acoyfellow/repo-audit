# How-to: Use Cloudflare Workers AI

The UI can run a deterministic audit only, or add an optional qualitative pass via Workers AI.

## Change the model

1. Open the app.
2. Under **Model**, pick one of the curated models or paste a model id (`@cf/...` or `@hf/...`).
3. Run an audit.

## Disable AI (deterministic-only)

Turn off **Workers AI pass** in the UI, or call the API with `ai=0`:

```bash
curl 'https://repo-audit.coey.dev/api/audit?repo=sveltejs/svelte&ai=0'
```

## Notes

- Workers AI requires remote dev for local iteration: `npm run dev:cf`
- Scores are always clamped to `[0, 10]` after any AI adjustments.

