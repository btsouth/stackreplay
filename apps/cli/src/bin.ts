#!/usr/bin/env node
import { runCli } from "./cli.js";

const exitCode = await runCli(process.argv.slice(2), {
  stdout: (text) => process.stdout.write(`${text}\n`),
  stderr: (text) => process.stderr.write(`${text}\n`),
  isTty: process.stdout.isTTY === true,
});

process.exitCode = exitCode;
