# Agent-Browser Source Research

## Summary

Local inspection shows that `agent-browser` is a better oracle target than raw HTML.

The key reason is that `agent-browser` does not primarily expose page meaning through raw DOM.
It exposes meaning through:

- accessibility snapshot
- interactive role mapping
- semantic locators
- targeted text extraction

## Confirmed Reusable Modules

These imports were verified to work locally:

```ts
import { getEnhancedSnapshot, getSnapshotStats, parseRef, resetRefs } from "agent-browser/dist/snapshot.js";
import { BrowserManager } from "agent-browser/dist/browser.js";
import { executeCommand } from "agent-browser/dist/actions.js";
```

## Important Findings

### 1. Snapshot is accessibility-first

`agent-browser` snapshot uses Playwright ARIA snapshot first.

Key signals:

- `locator.ariaSnapshot()`
- interactive roles get refs
- content roles are preserved for context
- structural roles can be compacted

### 2. Cursor-interactive fallback exists

If an element is not represented well in ARIA, `agent-browser` also scans for:

- `cursor: pointer`
- `onclick`
- `tabindex`

Those elements are surfaced as extra interactive refs.

### 3. Text extraction is targeted

`get text` uses locator text extraction rather than serializing whole DOM meaning.

That means our pruning target should preserve:

- what the oracle can read
- what the oracle can click
- what the oracle can treat as meaningful structure

## Implication For This Repo

The pruning layer should not be designed as an HTML cleaner.

It should be designed as a transformation from:

- rendered HTML

to:

- an `agent-browser-like` reduced semantic document

## Practical Conclusion

If we want `agent-browser-like` outputs, the future implementation should be centered on:

- role-aware extraction
- structure-aware reconstruction
- interaction-aware preservation

instead of raw tag deletion alone.
