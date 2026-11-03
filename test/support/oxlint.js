import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const oxlintBin = fileURLToPath(
  new URL("../../node_modules/.bin/oxlint", import.meta.url),
);

/**
 * @param {import("node:test").TestContext} t
 * @param {Record<string, string>} files
 * @param {import("oxlint").OxlintConfig} config
 * @param {string[]} [args]
 */
function runOxlint(t, files, config, args = []) {
  // Why: a sibling of fixtures keeps dependency resolution without racing their sweep.
  const directory = mkdtempSync(
    fileURLToPath(new URL("../cli-", import.meta.url)),
  );
  t.after(() => rmSync(directory, { force: true, recursive: true }));
  for (const [name, content] of Object.entries(files)) {
    const filename = path.join(directory, name);
    mkdirSync(path.dirname(filename), { recursive: true });
    writeFileSync(filename, content);
  }
  writeFileSync(
    path.join(directory, "oxlint.config.json"),
    JSON.stringify(config),
  );
  // Why: oxlint picks the github or agent format from the environment, and the github format drops JS plugin error text.
  const format = args.some((arg) => arg === "-f" || arg.startsWith("--format"))
    ? []
    : ["--format=default"];
  const result = spawnSync(
    oxlintBin,
    [
      "-c",
      "oxlint.config.json",
      "--disable-nested-config",
      ...format,
      ...args,
      ".",
    ],
    {
      cwd: directory,
      encoding: "utf8",
      killSignal: "SIGKILL",
      timeout: 30_000,
    },
  );
  assert.ifError(result.error);
  assert.equal(result.signal, null);
  return { directory, ...result };
}

export { runOxlint };
