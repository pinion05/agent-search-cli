# brAIve

Brave Search 결과를 가져와서 URL을 크롤링하고, 의미 단위로 압축한 뒤 TOON까지 만들어 주는 CLI입니다.

## 기대효과

- 검색 -> URL 선택 -> 크롤링 -> 의미 압축을 한 번에 처리
- 원문 HTML보다 훨씬 짧은 형태로 문서를 확인 가능
- `reducedHtml`과 `toon`을 같이 남겨서 사람이 보기에도, 에이전트에 넘기기에도 편함
- `--debug-dir`로 각 URL별 산출물을 바로 확인 가능

## 설치

```bash
npm install -g @npmc_5/braive
```

## 환경 변수

`query` 모드는 Brave Search API 키가 필요합니다.

```bash
export BRAVE_API_KEY=...
```

## 사용법

### 1. 검색부터 한 번에

```bash
braive query "nextjs app router docs"
braive query "openai codex pricing" --count 5
```

### 2. URL 하나 처리

```bash
braive url https://example.com
```

### 3. URL 여러 개 처리

```bash
braive urls https://example.com https://example.org
```

## 자주 쓰는 옵션

```bash
--count <n>      query 모드에서 Brave 검색 결과 개수 지정
--out <file>     최종 JSON packet을 파일로 저장
--debug-dir <d>  URL별 reduced HTML / TOON / reduced packet 산출물 저장
```

## 예시

```bash
braive query "nextjs app router docs" \
  --count 3 \
  --out .omx/artifacts/braive-live-query/output.json \
  --debug-dir .omx/artifacts/braive-live-query/debug
```

## 출력 형태

기본 출력은 JSON packet입니다.

주요 필드:

- `generated_at`
- `input`
- `search.results` (`query` 모드일 때만)
- `documents[]`
  - `url`
  - `finalUrl`
  - `title`
  - `fetchedAt`
  - `mode`
  - `toon`
  - `reducedHtml`
- `failures[]`

## debug-dir 안에 생기는 것

URL 하나당 디렉터리 하나가 생기고, 아래 파일이 들어갑니다.

- `packet.json`
- `reduced.html`
- `toon.txt`

## 언제 쓰면 좋나

- 기술 문서 몇 개를 빠르게 압축해서 보고 싶을 때
- 검색 결과 상위 문서를 바로 에이전트 입력용으로 줄이고 싶을 때
- 크롤링 결과와 압축 결과를 같이 저장해 디버깅하고 싶을 때
