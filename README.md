# brAIve

`brAIve` is an agent-focused retrieval CLI built on top of Brave Search. It turns search results and known URLs into compact, source-linked JSON packets that are easier for agents to inspect, rank, and reuse.

## Why use brAIve?

- Run `query` when you want Brave discovery plus page processing in one step.
- Run `url` or `urls` when you already know which pages to reduce.
- Keep structured outputs (`toon`, `reducedHtml`) instead of raw browser noise.
- Save inspectable debug artifacts per URL with `--debug-dir`.

## Install

Published package:

```bash
npm install -g @npmc_5/braive
```

Requirements:

- Node.js 20+
- Bun if you want to run the repo-local `bun run braive -- ...` script

## Environment

`query` mode requires a Brave API key:

```bash
export BRAVE_API_KEY=...
```

`url` and `urls` modes do not require `BRAVE_API_KEY`.

## Commands

Installed CLI:

```bash
braive query "openai codex pricing"
braive query "openai codex pricing" --count 3 --out result.json
braive url https://example.com --debug-dir ./artifacts
braive urls https://example.com https://example.org --out packet.json
```

Repo-local CLI:

```bash
bun install
bun run braive -- query "openai codex pricing"
bun run braive -- url https://example.com
bun run braive -- urls https://example.com https://example.org
```

Supported options:

```bash
--count <n>      query 모드에서 Brave 검색 결과 개수 지정
--out <file>     최종 JSON packet을 파일로 저장
--debug-dir <d>  URL별 reduced HTML / TOON / reduced packet 산출물 저장
```

## Output and debug artifacts

Every successful run emits a JSON packet with:

- `generated_at`
- `input`
- `search.results` for `query` mode
- `documents`
- `failures`

Each document includes:

- `url`
- `finalUrl`
- `title`
- `fetchedAt`
- `mode`
- `toon`
- `reducedHtml`

Use `--out` to save the final JSON packet to disk.

Use `--debug-dir` to write per-URL artifacts:

```text
<debug-dir>/<slug>/
  reduced.html
  toon.txt
  packet.json
```
