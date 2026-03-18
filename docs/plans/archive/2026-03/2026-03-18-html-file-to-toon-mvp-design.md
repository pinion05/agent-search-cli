# HTML File To TOON MVP Design

## Goal

Add the thinnest possible file-based layer on top of the existing `htmlToToon` function:

- read a local HTML file
- convert it to TOON
- save the `.toon` result to disk
- return the saved absolute path

## Mermaid Diagram

```mermaid
flowchart TD
    A[HTML 파일 경로 입력] --> B[파일 읽기]
    B --> C[htmlToToon 호출]
    C --> D{출력 경로 지정됨?}
    D -- 예 --> E[지정된 .toon 경로 사용]
    D -- 아니오 --> F[입력 파일 basename으로 .toon 경로 생성]
    E --> G[TOON 문자열 저장]
    F --> G
    G --> H[저장된 절대 경로 반환]
```

## Detailed htmlToToon Call

```mermaid
flowchart TD
    A[htmlToToon html options 호출] --> B[parseDocument html]
    B --> C{looksLikeFullHtmlDocument?}
    C -- 예 --> D[parseHTML html 원문]
    C -- 아니오 --> E[fragment를 html body로 감싸기]
    E --> F[parseHTML 감싼 문서]
    D --> G[document 확보]
    F --> G
    G --> H[nodes 빈 배열 생성]
    H --> I{document.body 존재?}
    I -- 아니오 --> N[빈 nodes 유지]
    I -- 예 --> J[body.childNodes 순회 시작]
    J --> K[collectNodes child depth 0]
    K --> L{남은 child 있음?}
    L -- 예 --> K
    L -- 아니오 --> N[수집 완료]
    N --> O[nodes.forEach로 idx 재할당]
    O --> P[document.title 정규화]
    P --> Q[상단 메타데이터 라인 생성]
    Q --> R[nodes 길이로 header 라인 생성]
    R --> S[nodes.map formatNode]
    S --> T[모든 라인을 개행으로 join]
    T --> U[TOON 문자열 반환]
```

## Detailed collectNodes Flow

```mermaid
flowchart TD
    A[collectNodes node depth nodes 호출] --> B{nodeType == ELEMENT_NODE?}
    B -- 아니오 --> Z[즉시 return]
    B -- 예 --> C[element와 tagName 추출]
    C --> D{tagName == a?}
    D -- 예 --> E[a.textContent 정규화]
    E --> F[href attribute 읽기]
    F --> G{text 또는 href 존재?}
    G -- 예 --> H[createNode depth text href]
    H --> I[nodes.push]
    I --> Z
    G -- 아니오 --> Z
    D -- 아니오 --> J{tagName == img?}
    J -- 예 --> K[src attribute 읽기]
    K --> L[alt attribute 읽기]
    L --> M{src 또는 alt 존재?}
    M -- 예 --> N[createNode depth src alt]
    N --> O[nodes.push]
    O --> Z
    M -- 아니오 --> Z
    J -- 아니오 --> P[readDirectText element]
    P --> Q[normalizeWhitespace 적용]
    Q --> R{directText 비어있나?}
    R -- 아니오 --> S[createNode depth text]
    S --> T[nodes.push]
    T --> U[nextDepth = depth + 1]
    R -- 예 --> V[nextDepth = depth]
    U --> W[element.childNodes 순회]
    V --> W
    W --> X[각 child에 collectNodes child nextDepth nodes]
    X --> Y{남은 child 있음?}
    Y -- 예 --> X
    Y -- 아니오 --> Z
```

## Detailed Serialization Flow

```mermaid
flowchart TD
    A[formatNode node] --> B[idx 출력]
    B --> C[deps 출력]
    C --> D[text를 formatScalar]
    D --> E[href를 formatScalar]
    E --> F[src를 formatScalar]
    F --> G[alt를 formatScalar]
    G --> H[status를 formatScalar]
    H --> I[쉼표로 join]
    I --> J[노드 한 줄 반환]

    K[formatScalar value] --> L{빈 문자열인가?}
    L -- 예 --> M["\"\"" 반환]
    L -- 아니오 --> N{quote slash colon newline 포함?}
    N -- 예 --> O[JSON.stringify value]
    N -- 아니오 --> P[원문 그대로 반환]
```

## Test Flow

```mermaid
flowchart TD
    T1[임시 HTML 파일 생성] --> T2[htmlFileToToonFile 실행]
    T2 --> T3[.toon 파일 생성 여부 확인]
    T3 --> T4[반환 경로가 절대경로인지 확인]
    T4 --> T5[파일 내용에 TOON 직렬화 결과 포함 여부 확인]
    T5 --> T6[명시적 outputPath 지정 케이스 확인]
```

## Scope

This design intentionally does not include:

- URL fetching
- browser rendering
- cache policy
- CLI command parsing
- failure-node design beyond basic file IO errors
