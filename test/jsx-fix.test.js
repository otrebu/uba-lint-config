import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { it } from "node:test";
import { fileURLToPath } from "node:url";

import { runOxlint } from "./support/oxlint.js";

const config = {
  categories: { correctness: "off" },
  jsPlugins: [
    {
      name: "uba",
      specifier: fileURLToPath(
        import.meta.resolve("@u-b/lint-config/oxlint-plugin"),
      ),
    },
  ],
  rules: { "uba/jsx-no-leaked-render": "error" },
};

const cases = [
  [
    "conditional condition",
    "(choose ? left : right) && child",
    "(choose ? left : right) ? child : null",
  ],
  [
    "assignment condition",
    "(value = 0) && child",
    "(value = 0) ? child : null",
  ],
  [
    "sequence condition",
    "(value = 1, count) && child",
    "(value = 1, count) ? child : null",
  ],
  [
    "logical condition",
    "(left || right) && child",
    "(left || right) ? child : null",
  ],
  [
    "conditional right side",
    "count && (choose ? left : right)",
    "count ? (choose ? left : right) : null",
  ],
  [
    "assignment right side",
    "count && (value = 0)",
    "count ? (value = 0) : null",
  ],
  [
    "sequence right side",
    "count && (value = 1, child)",
    "count ? (value = 1, child) : null",
  ],
  [
    "logical right side",
    "count && (left || right)",
    "count ? (left || right) : null",
  ],
  [
    "primary operands",
    "count && <span>value</span>",
    "count ? <span>value</span> : null",
  ],
];

for (const [name, expression, expected] of cases) {
  it(`preserves grouping when fixing a ${name}`, (t) => {
    const result = runOxlint(
      t,
      { "source.tsx": `export const rendered = <div>{${expression}}</div>;\n` },
      config,
      ["--fix"],
    );
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.equal(
      readFileSync(path.join(result.directory, "source.tsx"), "utf8"),
      `export const rendered = <div>{${expected}}</div>;\n`,
    );
  });
}
