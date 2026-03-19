import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const README = readFileSync(new URL("../README.md", import.meta.url), "utf8");

describe("README", () => {
  test("keeps the published README minimal and practical", () => {
    for (const section of [
      "## Why use brAIve?",
      "## Install",
      "## Environment",
      "## Commands",
      "## Output and debug artifacts",
    ]) {
      expect(README).toContain(section);
    }

    for (const snippet of [
      "npm install -g @npmc_5/braive",
      "BRAVE_API_KEY",
      "braive query",
      "braive url",
      "braive urls",
      "--count <n>",
      "--out <file>",
      "--debug-dir <d>",
      "generated_at",
      "documents",
      "failures",
      "reduced.html",
      "toon.txt",
      "packet.json",
    ]) {
      expect(README).toContain(snippet);
    }

    expect(README).not.toContain("- `toon`");

    for (const removedSection of [
      "## Goal",
      "## Planned Output",
      "## Status",
      "## Current MVP",
      "Not implemented yet:",
    ]) {
      expect(README).not.toContain(removedSection);
    }
  });
});
