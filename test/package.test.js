import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { it } from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));

/**
 * @param {import("node:test").TestContext} t
 * @returns {string}
 */
function packArchive(t) {
  const destination = mkdtempSync(path.join(tmpdir(), "uba-pack-"));
  t.after(() => rmSync(destination, { force: true, recursive: true }));
  execFileSync("pnpm", ["pack", "--pack-destination", destination], {
    cwd: root,
    env: { ...process.env, HUSKY: "0" },
    stdio: "pipe",
  });
  return path.join(
    destination,
    readdirSync(destination).find((name) => name.endsWith(".tgz")),
  );
}

const consumerSource = `import type { OxfmtConfig } from "oxfmt";
import type { OxlintConfig } from "oxlint";

import { generateOxlintConfig as generateFromRoot } from "@u-b/lint-config";
import { generateOxfmtConfig } from "@u-b/lint-config/oxfmt";
import { generateOxlintConfig } from "@u-b/lint-config/oxlint";
import ubaPlugin from "@u-b/lint-config/oxlint-plugin";

export const oxlint: OxlintConfig = generateOxlintConfig({ appType: "fullstack" });
export const oxfmt: OxfmtConfig = generateOxfmtConfig({ appType: "backendOnly" });
export const fromRoot: typeof generateOxlintConfig = generateFromRoot;
export const pluginName: string = ubaPlugin.meta.name;
// @ts-expect-error appType accepts only the documented app types.
generateOxlintConfig({ appType: "frontend" });
`;

it("ships type declarations that a TypeScript config can import", (t) => {
  const archive = packArchive(t);
  const consumer = mkdtempSync(path.join(tmpdir(), "uba-consumer-"));
  t.after(() => rmSync(consumer, { force: true, recursive: true }));
  const installed = path.join(consumer, "node_modules", "@u-b", "lint-config");
  mkdirSync(installed, { recursive: true });
  execFileSync("tar", [
    "-xzf",
    archive,
    "-C",
    installed,
    "--strip-components=1",
  ]);
  // Why: the declarations import types from the oxlint and oxfmt peers.
  for (const peer of ["oxfmt", "oxlint"]) {
    symlinkSync(
      path.join(root, "node_modules", peer),
      path.join(consumer, "node_modules", peer),
    );
  }
  writeFileSync(
    path.join(consumer, "package.json"),
    JSON.stringify({ type: "module" }),
  );
  writeFileSync(
    path.join(consumer, "tsconfig.json"),
    JSON.stringify({
      compilerOptions: {
        module: "nodenext",
        noEmit: true,
        skipLibCheck: true,
        strict: true,
        types: [],
      },
      files: ["consumer.ts"],
    }),
  );
  writeFileSync(path.join(consumer, "consumer.ts"), consumerSource);
  const result = spawnSync(
    process.execPath,
    [
      path.join(root, "node_modules", "typescript", "bin", "tsc"),
      "-p",
      consumer,
    ],
    { encoding: "utf8" },
  );
  assert.equal(result.status, 0, result.stdout + result.stderr);
});

it("ships the complete upstream MIT notice for the JSX rule port", (t) => {
  const archive = packArchive(t);
  const files = execFileSync("tar", ["-tzf", archive], { encoding: "utf8" });
  assert.ok(files.split("\n").includes("package/THIRD_PARTY_NOTICES"));
  const notice = execFileSync(
    "tar",
    ["-xOf", archive, "package/THIRD_PARTY_NOTICES"],
    { encoding: "utf8" },
  );
  assert.match(notice, /eslint-plugin-react 7\.37\.5/u);
  assert.match(notice, /jsx-no-leaked-render/u);
  assert.match(notice, /Copyright \(c\) 2014 Yannick Croissant/u);
  const license = readFileSync(path.join(root, "LICENSE"), "utf8");
  const permissionAndDisclaimer = license.slice(license.indexOf("Permission"));
  assert.ok(notice.includes(permissionAndDisclaimer.trim()));
});
