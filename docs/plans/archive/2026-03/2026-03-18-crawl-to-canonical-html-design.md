# Crawl To Canonical HTML Design

## Goal

Move the system boundary earlier than `htmlToToon`.

Instead of letting `htmlToToon` guess whether its input is a full HTML document or a fragment, the crawler/rendering layer must always produce a fixed intermediate contract:

- `url`
- `finalUrl`
- `fetchedAt`
- `title`
- `bodyHtml`

Then the TOON engine consumes that `RenderedDocument` directly.

This removes heuristic parsing such as `looksLikeFullHtmlDocument` from the TOON layer and avoids introducing a separate canonical-HTML assembly layer before it is truly needed.

## Architecture Flow

```mermaid
flowchart TD
    A[URL 입력] --> B[crawlUrlToRenderedDocument]
    B --> B1[브라우저 실행]
    B1 --> B2[페이지 이동]
    B2 --> B3[렌더링 완료 대기]
    B3 --> B4[title 추출]
    B3 --> B5[bodyHtml 추출]
    B4 --> B6[RenderedDocument 생성]
    B5 --> B6

    B6 --> C[htmlToToon]
    C --> C1[RenderedDocument title 사용]
    C --> C2[RenderedDocument bodyHtml 파싱]
    C2 --> C3[body 순회]
    C3 --> C4[의미 있는 노드 추출]
    C4 --> C5[idx 와 deps 부여]
    C1 --> C6[메타데이터 라인 구성]
    C5 --> C7[TOON 직렬화]
    C6 --> C7
    C7 --> D[TOON 출력]

    E[제거 대상] -.-> C
    E1[buildCanonicalHtmlDocument] --> E
    E2[looksLikeFullHtmlDocument] --> E
    E3[fragment 추정 로직] --> E
```

## Sequence Flow

```mermaid
sequenceDiagram
    participant U as User
    participant C as Crawl Engine
    participant B as Browser
    participant T as TOON Engine

    U->>C: crawlUrlToRenderedDocument(url)
    C->>B: open page
    B-->>C: rendered page ready
    C->>B: read document.title
    B-->>C: title
    C->>B: read document.body.innerHTML
    B-->>C: bodyHtml
    C-->>T: RenderedDocument

    Note over C,T: { url, finalUrl, fetchedAt, title, bodyHtml }

    T->>T: parse renderedDocument.bodyHtml
    T->>T: use renderedDocument.title
    T->>T: traverse body
    T->>T: reduce meaningful nodes
    T->>T: assign idx and deps
    T->>T: serialize TOON

    T-->>U: TOON output
```

## Responsibility Split

- Crawl Engine
  - owns page loading and render timing
  - extracts `title` and `bodyHtml`
  - produces `RenderedDocument`

- TOON Engine
  - consumes `RenderedDocument` directly
  - uses crawler-provided `title` and `bodyHtml`
  - never guesses fragment vs full document
  - focuses only on reduction and serialization

## RenderedDocument Shape

```ts
type RenderedDocument = {
  url: string;
  finalUrl: string;
  fetchedAt: string;
  title: string;
  bodyHtml: string;
};
```

## Design Consequence

After this boundary is adopted:

- `htmlToToon` should accept `RenderedDocument`
- `htmlToToon` should not contain `looksLikeFullHtmlDocument`
- `buildCanonicalHtmlDocument` is not part of the MVP path
- crawler output becomes the only supported upstream contract
