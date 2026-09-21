#!/usr/bin/env node
import { runCli } from "./cli.js";

const exitCode = runCli(process.argv.slice(2), {
  stdout: (text) => process.stdout.write(`${text}\n`),
  stderr: (text) => process.stderr.write(`${text}\n`),
});

process.exitCode = exitCode;
