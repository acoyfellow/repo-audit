# Explanation: Scoring

The audit uses two layers:

1. **Deterministic scoring**: rule-based signals derived from GitHub metadata, repository file paths, README content, and workflow presence.
2. **Optional AI enhancement**: Workers AI can nudge category scores slightly (bounded adjustments) and add narrative output (summary, recommendations).

Deterministic scoring is the source of truth. AI adjustments are:

- optional
- clamped so each category remains within 0-10

The rubric is available in the app at `/matrix`.

