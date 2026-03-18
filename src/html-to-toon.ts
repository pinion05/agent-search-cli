import { parseHTML } from "linkedom";

const ELEMENT_NODE = 1;
const TEXT_NODE = 3;

type ToonNode = {
  idx: number;
  deps: number;
  text: string;
  href: string;
  src: string;
  alt: string;
  status: string;
};

type HtmlToToonOptions = {
  fetchedAt: string;
  finalUrl?: string;
  url: string;
};

export function htmlToToon(html: string, options: HtmlToToonOptions): string {
  const { document } = parseDocument(html);
  const nodes: ToonNode[] = [];

  if (document.body) {
    for (const child of Array.from(document.body.childNodes)) {
      collectNodes(child, 0, nodes);
    }
  }

  nodes.forEach((node, index) => {
    node.idx = index;
  });

  const title = normalizeWhitespace(document.title);

  return [
    `url: ${formatScalar(options.url)}`,
    `final_url: ${formatScalar(options.finalUrl ?? "")}`,
    `title: ${formatScalar(title)}`,
    `fetched_at: ${formatScalar(options.fetchedAt)}`,
    `nodes[${nodes.length}]{idx,deps,text,href,src,alt,status}:`,
    ...nodes.map(formatNode)
  ].join("\n");
}

function parseDocument(html: string) {
  if (looksLikeFullHtmlDocument(html)) {
    return parseHTML(html);
  }

  return parseHTML(`<!doctype html><html><head></head><body>${html}</body></html>`);
}

function looksLikeFullHtmlDocument(html: string): boolean {
  return /<!doctype|<html[\s>]|<head[\s>]|<body[\s>]/i.test(html);
}

function collectNodes(node: Node, depth: number, nodes: ToonNode[]): void {
  if (node.nodeType !== ELEMENT_NODE) {
    return;
  }

  const element = node as Element;
  const tagName = element.tagName.toLowerCase();

  if (tagName === "a") {
    const text = normalizeWhitespace(element.textContent ?? "");
    const href = element.getAttribute("href") ?? "";

    if (text !== "" || href !== "") {
      nodes.push(createNode(depth, { href, text }));
    }

    return;
  }

  if (tagName === "img") {
    const src = element.getAttribute("src") ?? "";
    const alt = element.getAttribute("alt") ?? "";

    if (src !== "" || alt !== "") {
      nodes.push(createNode(depth, { alt, src }));
    }

    return;
  }

  const directText = normalizeWhitespace(readDirectText(element));
  const nextDepth = directText === "" ? depth : depth + 1;

  if (directText !== "") {
    nodes.push(createNode(depth, { text: directText }));
  }

  for (const child of Array.from(element.childNodes)) {
    collectNodes(child, nextDepth, nodes);
  }
}

function createNode(
  depth: number,
  values: Partial<Omit<ToonNode, "deps" | "idx">>
): ToonNode {
  return {
    idx: -1,
    deps: depth,
    text: values.text ?? "",
    href: values.href ?? "",
    src: values.src ?? "",
    alt: values.alt ?? "",
    status: values.status ?? ""
  };
}

function readDirectText(element: Element): string {
  return Array.from(element.childNodes)
    .filter((node) => node.nodeType === TEXT_NODE)
    .map((node) => node.textContent ?? "")
    .join(" ");
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function formatNode(node: ToonNode): string {
  return [
    node.idx,
    node.deps,
    formatScalar(node.text),
    formatScalar(node.href),
    formatScalar(node.src),
    formatScalar(node.alt),
    formatScalar(node.status)
  ].join(",");
}

function formatScalar(value: string): string {
  if (value === "") {
    return '""';
  }

  if (/[",:\/\n]/.test(value)) {
    return JSON.stringify(value);
  }

  return value;
}
