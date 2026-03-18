# HTML To TOON MVP Design

## Goal

Implement the smallest useful slice of the issue design: a pure `HTML -> TOON` conversion path that can be tested locally without browser rendering or URL fetching.

## Scope

This MVP only covers:

- parsing an HTML string
- extracting meaningful text/link/image nodes
- dropping empty wrappers and whitespace-only nodes
- assigning `idx` and reduced-depth `deps`
- serializing the result into a TOON string

This MVP does not cover:

- network fetching
- browser rendering
- iframe traversal
- cache/file output
- CLI commands

## Output Shape

The top-level output follows the flattened structure described in issue `#7` comments:

- `url`
- `final_url`
- `title`
- `fetched_at`
- `nodes`

Each node uses:

- `idx`
- `deps`
- `text`
- `href`
- `src`
- `alt`
- `status`

For this MVP, `status` is always `""` because failure nodes are out of scope.

## Extraction Rules

- Text nodes are kept only when trimmed text is non-empty after conservative whitespace normalization.
- `<a href>` creates a node using the anchor text and raw `href`.
- `<img>` creates a node with raw `src` and raw `alt` when present.
- Container elements without meaningful direct content do not create nodes by themselves.
- Traversal order is DOM preorder.
- `deps` reflects reduced structural depth of meaningful nodes, not raw DOM depth.

## Testing Strategy

Start with failing tests for:

1. plain text and link extraction
2. empty wrapper removal
3. image node extraction
4. whitespace-only node removal

Then implement only enough code to make those tests pass.
