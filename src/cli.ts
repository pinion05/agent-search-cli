#!/usr/bin/env bun

import { createDefaultBraiveDependencies, runBraiveCli } from "./braive-runner";

try {
  const result = await runBraiveCli(process.argv.slice(2), createDefaultBraiveDependencies());
  process.stdout.write(result.output);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
}
