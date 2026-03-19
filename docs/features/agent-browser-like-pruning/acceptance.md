# Agent-Browser-Like Pruning Acceptance — 2026-03-19

## Verdict

**ACCEPT**

The feature is approval-ready on commit `322e986`.

## What Was Verified

### Code and test health

Commands:

```bash
bunx tsc --noEmit
bun test
bun scripts/write-agent-browser-like-pruning-review-samples.ts
```

Result:

- `bunx tsc --noEmit` passed
- `bun test` passed with `27 pass`, `0 fail`
- the BrowserOS review sample generator refreshed the raw/reduced fixtures successfully

### BrowserOS raw-vs-reduced review

BrowserOS was attached through CDP on port `9005`.

Commands used:

```bash
node --input-type=module <<'NODE'
import fs from 'node:fs';
import { execSync } from 'node:child_process';
const manifest = JSON.parse(fs.readFileSync('docs/features/agent-browser-like-pruning/samples/manifest.json', 'utf8'));
for (const entry of manifest) {
  execSync(`agent-browser --cdp 9005 open file://${entry.reducedPath} >/dev/null`);
  execSync('agent-browser --cdp 9005 wait --load networkidle >/dev/null');
  const text = execSync('agent-browser --cdp 9005 get text body', { encoding: 'utf8' });
  console.log(`### ${entry.slug}`);
  for (const signal of entry.preservedSignals) {
    console.log(`${text.includes(signal) ? 'PASS' : 'FAIL'} ${signal}`);
  }
}
NODE
```

Reviewed sample pairs:

- `docs-generic`
- `package-generic`
- `map-generic`
- `place-detail-generic`
- `forum-generic`
- `marketing-generic`
- `generic-blog`

All preserved signals passed in the reduced outputs for every reviewed sample.

## Why This Is Accepted

- the prior generic fallback bug is fixed: generic pages now keep narrative content and no longer misclassify non-interactive structure as actions
- unseen-fixture unit coverage now spans `docs`, `package-page`, `map-view`, `place-detail`, `forum-qna`, `marketing-media`, and `generic`
- BrowserOS acceptance coverage now spans every supported reducer mode
- the reduced outputs preserve the key identity, fact, structure, content, and interaction signals needed by an agent on the reviewed samples

## Related Artifacts

- `docs/features/agent-browser-like-pruning/review.md`
- `docs/features/agent-browser-like-pruning/browseros-review-inputs.md`
- `docs/features/agent-browser-like-pruning/samples/manifest.json`
