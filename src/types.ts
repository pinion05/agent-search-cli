export type RenderedDocument = {
  url: string;
  finalUrl: string;
  fetchedAt: string;
  title: string;
  bodyHtml: string;
};

export type PruningMode =
  | "docs"
  | "package-page"
  | "place-detail"
  | "map-view"
  | "forum-qna"
  | "marketing-media"
  | "generic";

export type PrunedDocument = RenderedDocument & {
  mode: PruningMode;
  prunedHtml: string;
};

export type AgentBrowserOracle = {
  snapshotTree: string;
  interactiveTree: string;
  innerText: string;
};

export type ReducedDocumentSection = {
  heading: string;
  items: string[];
};

export type ReducedDocument = RenderedDocument & {
  mode: PruningMode;
  identity: string[];
  facts: string[];
  structure: ReducedDocumentSection[];
  content: string[];
  interactions: string[];
};
