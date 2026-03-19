# Production Readiness Checklist

## P0 — Must pass before public npm release

- [x] CLI entrypoint exists for `query`, `url`, and `urls`
- [x] Typecheck passes
- [x] Test suite passes
- [x] Node-executable package entry configured (`bin` -> `dist/cli.js`)
- [x] Build config exists and emits publishable JS to `dist/`
- [x] `npm pack --dry-run` passes
- [x] `npm publish --dry-run --access public` passes
- [ ] npm authentication available (`npm whoami` currently fails with 401)
- [ ] final publish completed successfully

## P1 — Strongly recommended before public release

- [x] README includes basic CLI usage
- [x] package metadata filled in enough for dry-run packaging
- [x] live query validation report exists
- [ ] package license choice confirmed for public distribution
- [x] live `query` verification report recorded end-to-end

## P2 — Good follow-ups after first publish

- [ ] Brave query caching
- [ ] multi-page synthesis / research-pack output
- [ ] stronger docs detection for third-party documentation sites
- [ ] more live query golden coverage
