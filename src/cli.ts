#!/usr/bin/env node

import { createDefaultBraiveDependencies, runBraiveCli } from "./braive-runner.js";

try {
  const result = await runBraiveCli(process.argv.slice(2), createDefaultBraiveDependencies());
  process.stdout.write(result.output);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
}
