# brAIve 실쿼리 실행 보고서 — 2026-03-19

## 개요

이 문서는 현재 `brAIve` CLI를 실제 Brave Search API에 연결해 `query` 모드로 실행한 결과를 정리한 보고서다.

검증 대상 빌드:

- 브랜치: `dev`
- CLI 통합 커밋: `d3cae1f`

## 환경 가정

- 환경 변수에 `BRAVE_API_KEY`가 존재했다
- 비밀값 자체는 출력하거나 이 보고서에 저장하지 않았다
- `Crawlee + Playwright` 실행에 필요한 로컬 브라우저 런타임은 이미 준비되어 있었다
- 실행은 현재 저장소 워크스페이스에서 직접 이루어졌다

## 실행 명령

```bash
bun run braive -- query "nextjs app router docs" --count 3 --out .omx/artifacts/braive-live-query/output.json --debug-dir .omx/artifacts/braive-live-query/debug
```

## 종료 결과

- 명령 종료: 성공 (`0`)
- 출력 파일 생성: 예
- 디버그 아티팩트 디렉터리 생성: 예
- packet 내 실패 건수: `0`

## 출력 경로

- packet JSON
  - `.omx/artifacts/braive-live-query/output.json`
- debug 루트
  - `.omx/artifacts/braive-live-query/debug`
- 문서별 debug 아티팩트
  - `.omx/artifacts/braive-live-query/debug/app/`
  - `.omx/artifacts/braive-live-query/debug/docs/`
  - `.omx/artifacts/braive-live-query/debug/quickstart/`

각 debug 디렉터리에는 다음 파일이 포함된다:

- `packet.json`
- `reduced.html`
- `toon.txt`

## Brave 검색 결과

쿼리: `nextjs app router docs`

Brave가 반환한 상위 3개 결과(순서 유지):

1. `https://nextjs.org/docs/app`
   - 제목: `Next.js Docs: App Router | Next.js`
2. `https://nextjs.org/docs`
   - 제목: `Next.js Docs | Next.js`
3. `https://clerk.com/docs/nextjs/getting-started/quickstart`
   - 제목: `Next.js Quickstart (App Router) - Getting started | Clerk Docs`

## 처리된 문서

### 1. `https://nextjs.org/docs/app`

- 최종 URL: 변경 없음
- 판별 모드: `docs`
- 결과 품질: 좋음

관찰 사항:

- `App Router`와 여러 버전 표기 같은 핵심 사실이 유지되었다
- 다음 구조 링크들이 실제 href와 함께 유지되었다
  - `Getting Started`
  - `Installation`
  - `Project Structure`
  - `Deploying`
  - `Guides`
  - `API Reference`
  - `Configuration`
  - `Routing`
- reduced HTML과 TOON이 모두 정상 생성되었다

주요 아티팩트:

- `.omx/artifacts/braive-live-query/debug/app/reduced.html`
- `.omx/artifacts/braive-live-query/debug/app/toon.txt`

### 2. `https://nextjs.org/docs`

- 최종 URL: 변경 없음
- 판별 모드: `docs`
- 결과 품질: 좋음

관찰 사항:

- 상위 문서 탐색 구조와 핵심 facts가 유지되었다
- 주요 docs 섹션 링크가 reduced HTML에서 실제 href로 보존되었다
- reduced HTML과 TOON이 모두 정상 생성되었다

주요 아티팩트:

- `.omx/artifacts/braive-live-query/debug/docs/reduced.html`
- `.omx/artifacts/braive-live-query/debug/docs/toon.txt`

### 3. `https://clerk.com/docs/nextjs/getting-started/quickstart`

- 최종 URL: 변경 없음
- 판별 모드: `generic`
- 결과 품질: 사용 가능하지만 앞선 두 페이지보다 덜 깔끔함

관찰 사항:

- 명령 자체는 정상 완료되었다
- reduced output의 structure 레이어에서 다음 실제 href들이 보존되었다
  - `Skip to main content`
  - `Documentation version`
  - `Next.js Select your SDK`
  - `Quickstart (App Router)`
  - `Quickstart (Pages Router)`
- 다만 이 페이지는 `docs`가 아니라 `generic`으로 분류되었다
- 내용 추출도 1st-party Next.js 문서보다 shell/noise가 더 섞여 보였다

주요 아티팩트:

- `.omx/artifacts/braive-live-query/debug/quickstart/reduced.html`
- `.omx/artifacts/braive-live-query/debug/quickstart/toon.txt`

## Packet 요약

생성된 packet에는 다음이 포함되었다:

- query 모드 입력 메타데이터
- rank 순서를 유지한 Brave 검색 결과
- 처리된 문서 3개
- 실패 0건

최종 packet은 downstream agent가 읽을 수 있는 구조였고, 각 문서별로 `toon`과 `reducedHtml`을 함께 포함했다.

## 상세 관찰

### 잘 된 점

- 실제 API 키로 Brave query 모드를 실실행했다
- Brave 결과 순서가 packet에 그대로 유지되었다
- 크롤링부터 의미 압축까지 3개 URL 모두 end-to-end로 완료되었다
- Next.js 페이지들에서는 reduced HTML 구조 링크에 실제 href가 잘 보존되었다
- 모든 처리 페이지에 대해 TOON 출력이 생성되었다
- 최종 packet에 런타임 실패가 기록되지 않았다

### 허용 가능하지만 아쉬운 점

- 세 번째 결과(`Clerk Docs`)는 `docs`가 아니라 `generic`으로 분류되었다
- 해당 페이지의 reduced content는 1st-party Next.js 문서보다 shell 영향이 더 커 보였다
- debug artifact 하위 디렉터리 이름이 URL basename(`app`, `docs`, `quickstart`) 기준이라 규모가 커지면 설명력이 부족할 수 있다

## 리스크 / 후속 항목

1. 3rd-party 문서 사이트에 대한 docs 판별은 아직 완벽하지 않다.
2. 현재 query 모드는 multi-page 종합 요약이 아니라 per-page packet 출력이다.
3. 많은 URL이 같은 basename을 가지면 artifact 디렉터리 이름 충돌 가능성이 더 커질 수 있다.
4. 이번 검증은 하나의 실제 쿼리만 다뤘으므로, package/forum/marketing 위주의 다른 실쿼리도 추가 검증하면 더 좋다.

## 판정

**실쿼리 기반 query-mode MVP 검증은 PASS.**

현재 CLI는 이 환경에서 실제 Brave query에 대해 다음 전체 경로를 성공적으로 처리했다:

- 검색
- URL 선택
- 크롤링
- 의미 압축
- reduced HTML 생성
- TOON 직렬화

현재 MVP 기준에서는 충분히 쓸 수 있는 상태이며, 가장 큰 보완점은 일부 3rd-party docs 페이지가 여전히 더 noisy한 `generic` 축약으로 떨어질 수 있다는 점이다.
