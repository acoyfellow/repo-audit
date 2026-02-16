# Examples

## Audit via API

```bash
# Basic audit
curl "https://repo-audit.coey.dev/api/audit?repo=sveltejs/svelte"

# With Workers AI qualitative pass
curl "https://repo-audit.coey.dev/api/audit?repo=sveltejs/svelte&model=@cf/zai-org/glm-4.7-flash"

# Disable AI pass
curl "https://repo-audit.coey.dev/api/audit?repo=sveltejs/svelte&ai=0"
```

## Audit via UI

Visit [repo-audit.coey.dev](https://repo-audit.coey.dev) and enter an `owner/repo` slug.

## Response Shape

```json
{
  "meta": { "full_name": "sveltejs/svelte", "description": "...", "stargazers_count": 80000 },
  "scores": { "firstImpressions": 9.0, "readme": 8.5, "documentation": 9.0, "...": "..." },
  "details": { "firstImpressions": ["Has description", "5 topics"], "...": "..." }
}
```
