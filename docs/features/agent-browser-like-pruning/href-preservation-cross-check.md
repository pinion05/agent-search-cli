# Href Preservation Cross-Check — 2026-03-19

## Summary

Baseline `agent-browser-like-pruning` health is clean, but href preservation is not implemented yet.

Current state:

- typecheck passes
- tests pass
- review sample regeneration passes
- reduced HTML still drops original link destinations and renders `href="#"`

## Verification Evidence

### 1. Typecheck

```bash
bunx tsc --noEmit
```

Result: PASS

### 2. Test suite

```bash
bun test
```

Result: PASS (`27 pass`, `0 fail`)

### 3. Review sample regeneration

```bash
bun scripts/write-agent-browser-like-pruning-review-samples.ts
```

Result: PASS (`wrote 7 review sample pairs ...`)

### 4. Targeted href probe

Command:

```bash
node --input-type=module <<'NODE'
import { buildReducedDocumentFromOracle, renderReducedDocumentHtml } from './src/agent-browser-like-pruning.ts';
const reduced = buildReducedDocumentFromOracle(
  {
    url: 'https://docs.python.org/3/library/json.html',
    finalUrl: 'https://docs.python.org/3/library/json.html',
    fetchedAt: '2026-03-19T00:00:00Z',
    title: 'JSON Module Docs',
    bodyHtml: '<main><a href="/overview">Overview</a><a href="/api">API Reference</a></main>'
  },
  {
    snapshotTree: ['- link "Overview" [ref=e1]', '- link "API Reference" [ref=e2]'].join('\n'),
    interactiveTree: ['- button "Search docs" [ref=e3]'].join('\n'),
    innerText: ['JSON Module Docs', 'Parse and emit structured documents.'].join('\n')
  }
);
console.log(JSON.stringify(reduced.structure, null, 2));
console.log('--- HTML ---');
console.log(renderReducedDocumentHtml(reduced));
NODE
```

Observed result:

- the reduced structure only keeps labels (`"Overview"`, `"API Reference"`)
- rendered HTML emits `<a href="#">Overview</a>` and `<a href="#">API Reference</a>`
- original `/overview` and `/api` destinations are lost before render output

## Why hrefs are currently lost

### Schema gap

`src/types.ts:29-40`

- `ReducedDocumentSection.items` is `string[]`
- there is no place to store a destination URL for structure links
- `interactions` is also `string[]`, so link-vs-button intent is not representable there either

### Data-flow gap

`src/agent-browser-like-pruning.ts:314-393` and `src/agent-browser-like-pruning.ts:426-436`

- `buildStructure()` selects labels from `snapshotLabels` / `interactiveLabels`
- `buildInteractions()` also reduces everything to label strings
- no stage carries raw `href` values forward from `document.bodyHtml`

### Renderer gap

`src/agent-browser-like-pruning.ts:184-192`

- `renderReducedDocumentHtml()` hardcodes every structure anchor as `href="#"`

## Smallest viable schema / data-flow

Recommended minimum change:

1. add a link item type for rendered structure, e.g.

   ```ts
   type ReducedLinkItem = {
     text: string;
     href: string;
   };
   ```

2. change `ReducedDocumentSection.items` from `string[]` to `ReducedLinkItem[]`
3. parse raw anchors from `document.bodyHtml` and keep a text-to-href lookup using the original raw `href`
4. when structure labels are selected, resolve matching `href`s from that lookup
5. render `item.href` instead of `#`
6. add tests that prove reduced HTML preserves real destinations for representative docs/package/forum/menu cases

This is the smallest change that fixes the real issue end-to-end without redesigning the full reducer.

## Sample-generator wrinkle

`worker-1` flagged one important verification wrinkle, and local inspection confirms it:

- `scripts/write-agent-browser-like-pruning-review-samples.ts` currently uses many `<a>` elements without real `href` attributes in both `rawHtml` and `document.bodyHtml`
- that means sample regeneration can still pass even after href-preservation code lands, because the sample inputs do not yet supply destinations to preserve
- after the implementation lands, the sample generator should be updated to include representative real hrefs before regenerated reduced HTML is used as href-preservation evidence

## Follow-up checks after implementation lands

After worker-2 lands the reducer/types/renderer change, rerun:

```bash
bunx tsc --noEmit
bun test
bun scripts/write-agent-browser-like-pruning-review-samples.ts
```

Then add one targeted assertion per mode that the reduced HTML contains the expected raw `href` values instead of `#`.
