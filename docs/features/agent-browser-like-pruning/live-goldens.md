# Live Goldens

This file tracks the real-site golden dataset for `agent-browser-like-pruning`.

Purpose:

- exercise the reducer against current public pages on the live web
- detect drift between the committed synthetic review corpus and real websites
- avoid committing third-party raw HTML into the repository

Dataset source:

- `docs/features/agent-browser-like-pruning/live-goldens.json`

Local artifact output:

- `.omx/artifacts/agent-browser-like-pruning/live-goldens/<run-id>/`

Run command:

```bash
bun scripts/capture-agent-browser-like-live-goldens.ts
```

What the script does:

1. crawls each live URL into a `RenderedDocument`
2. collects the `agent-browser` oracle layers
3. builds the reduced document
4. writes local raw/oracle/reduced artifacts under `.omx/`
5. checks whether the reduced output still preserves the expected signals

Policy:

- keep committed data to URL + expected-signal metadata only
- keep fetched third-party HTML in local `.omx/` artifacts only
- update `live-goldens.json` when a URL becomes unstable or the expected signals drift for legitimate reasons
