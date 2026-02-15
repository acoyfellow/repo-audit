# Tutorial: Run Your First Audit

This tutorial walks you through auditing a public GitHub repository end-to-end.

## 1. Open the app

- Production: `https://repo-audit.coey.dev/`
- Backup: `https://repo-audit.coy.workers.dev/`

## 2. Audit a repository

1. Paste `owner/repo` (or a full GitHub URL) into the input.
2. Leave **Workers AI pass** enabled for the qualitative summary, or disable it for deterministic-only.
3. Click **AUDIT**.

## 3. Understand the output

- The **total score** is a weighted average of 11 categories.
- Each category shows:
  - a numeric score (0-10)
  - a short list of detected signals (positive and negative)
- If enabled, Workers AI adds:
  - a summary paragraph
  - top strength and weakness
  - recommendations
  - optional red flags

## 3.5 Shareable link (default)

After each audit, the app creates a shareable URL and redirects you to it. Shared results are retained for 30 days.

## 4. Try another repo

Use **Audit Another** to reset and run a new audit.
