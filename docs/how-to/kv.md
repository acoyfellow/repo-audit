# How-to: Set Up KV (Cache + Shared Results)

Repo Audit uses Cloudflare KV for:

- `RATE_LIMIT`: per-IP fixed-window rate limiting
- `RESULTS`: cached audit results + shared links

## Create namespaces

Create both namespaces:

```bash
npx wrangler kv namespace create RATE_LIMIT
npx wrangler kv namespace create RATE_LIMIT --preview

npx wrangler kv namespace create RESULTS
npx wrangler kv namespace create RESULTS --preview
```

Wrangler will print ids for each. Put them into `wrangler.jsonc`:

- `kv_namespaces[0].id` and `preview_id` for `RATE_LIMIT`
- `kv_namespaces[1].id` and `preview_id` for `RESULTS`

## Deploy

```bash
npm run build
npx wrangler deploy --config wrangler.jsonc
```

