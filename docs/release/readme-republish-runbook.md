# README Republish Runbook

This runbook is the worker-3 cross-check for the README cleanup/republish pass.
It is intentionally scoped to release follow-up so the shared `README.md` rewrite can stay in the worker-2 lane.

## Minimal README contract

The rewritten README should keep only the sections below:

1. **What brAIve is**
   - short product summary
   - note that the repo name is `agent-search-cli` and the package/product name is `brAIve`
2. **Install**
   - `npm install -g @npmc_5/braive`
3. **Environment**
   - `BRAVE_API_KEY` is required for `braive query ...`
   - `url` / `urls` mode do not require Brave Search
4. **Commands**
   - `braive query <search query> [--count N] [--out FILE] [--debug-dir DIR]`
   - `braive url <url> [--out FILE] [--debug-dir DIR]`
   - `braive urls <url...> [--out FILE] [--debug-dir DIR]`
5. **Output and debug artifacts**
   - final stdout / `--out` payload is a JSON packet
   - processed documents include `url`, `finalUrl`, `title`, `fetchedAt`, `mode`, `toon`, and `reducedHtml`
   - `--debug-dir` writes per-URL artifacts:
     - `reduced.html`
     - `toon.txt`
     - `packet.json`
6. **Why use brAIve**
   - practical agent benefit only: compact, source-linked page/query packets for downstream agents

## Current README noise to remove

The current README still includes planning/status material that should not survive the rewrite:

- `Goal`
- `Planned Output`
- `Status`
- `Current MVP`
- `Not implemented yet`

Those sections are useful for internal planning, but not for a practical published package README.

## Code-grounded facts to preserve

These points were cross-checked against the current repository state:

- package name: `@npmc_5/braive` (`package.json`)
- binary name: `braive` (`package.json -> bin`, `src/cli.ts`)
- help text:
  - `braive query <search query> [--count N] [--out FILE] [--debug-dir DIR]`
  - `braive url <url> [--out FILE] [--debug-dir DIR]`
  - `braive urls <url...> [--out FILE] [--debug-dir DIR]`
- `BRAVE_API_KEY` is enforced only for query mode (`src/braive-runner.ts`)
- `--debug-dir` writes `reduced.html`, `toon.txt`, and `packet.json` into a per-URL slug directory (`src/braive-runner.ts`)
- publish dry-run commands already exist in `package.json`:
  - `npm pack --dry-run`
  - `npm publish --dry-run --access public`

## Republish checklist

After the shared README rewrite lands, run this sequence before the patch release:

1. Confirm the README matches the minimal contract above.
2. Verify the install command still matches `package.json`.
3. Re-run:
   - `bunx tsc --noEmit`
   - `bun test`
   - `npm pack --dry-run`
   - `npm publish --dry-run --access public`
4. Inspect the pack dry-run output and confirm `README.md` is included in the published files.
5. If the package has already been published, ship the README update as a new patch version rather than attempting to reuse the same version.

## Reviewer quick questions

Use these questions for the final cross-check:

- Can a new user install the package in one copy/paste?
- Is the single required environment variable obvious?
- Are the three commands shown exactly as the CLI accepts them?
- Does the README explain both the JSON output and the optional debug artifacts?
- Does the README describe user benefit without roadmap language or planning noise?
