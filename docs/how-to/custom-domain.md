# How-to: Deploy With a Custom Domain

This project is deployed as a Cloudflare Worker (Astro SSR output + static assets).

## Prereqs

- `wrangler` authenticated: `npx wrangler whoami`
- Domain/zone exists in the Cloudflare account

## Deploy

1. Build:

```bash
npm run build
```

2. Deploy:

```bash
npx wrangler deploy --config wrangler.jsonc
```

To use a custom domain, add a `routes` entry in your Wrangler config using a `custom_domain` route, for example:

```jsonc
{
  "routes": [
    {
      "pattern": "your-domain.example",
      "custom_domain": true
    }
  ]
}
```

## Verify

```bash
curl -I https://your-domain.example/
```
