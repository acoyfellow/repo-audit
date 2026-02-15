# Reference: API

## Endpoint

`GET /api/audit`

## Share

`POST /api/share` stores an audit result in KV and returns a shareable link.

- Body: `{ "result": <AuditResult> }`
- Retention: 30 days (TTL)

`GET /api/result?id=...` fetches a previously shared result (JSON).

Shared UI route: `GET /r/:id`

## Query params

- `repo` (required): `owner/name`
- `ai` (optional): set to `0` to disable Workers AI enhancement
- `model` (optional): Workers AI model id (for example `@cf/zai-org/glm-4.7-flash`)

## Examples

Deterministic only:

```bash
curl 'https://repo-audit.coey.dev/api/audit?repo=sveltejs/svelte&ai=0'
```

AI enabled + explicit model:

```bash
curl 'https://repo-audit.coey.dev/api/audit?repo=sveltejs/svelte&model=@cf/zai-org/glm-4.7-flash'
```

Share an existing result JSON:

```bash
curl -X POST 'https://repo-audit.coey.dev/api/share' \
  -H 'content-type: application/json' \
  --data '{"result":{...}}'
```

## Response shape (high level)

- `meta`: repo metadata (stars, forks, language, license, etc.)
- `scores`: per-category scores (0-10)
- `details`: per-category signal strings
- `summary`, `topStrength`, `topWeakness`, `recommendations`, `redFlags`: AI-only fields when enabled
