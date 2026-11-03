import { generateOxlintConfig } from "@u-b/lint-config/oxlint";
import assert from "node:assert/strict";
import path from "node:path";
import { it } from "node:test";

import { runOxlint } from "./support/oxlint.js";

const extensions = ["js", "jsx", "mjs", "ts", "tsx", "mts", "cts"];

for (const appType of ["fullstack", "backendOnly"]) {
  for (const shouldEnableTypescript of [true, false]) {
    it(`rejects ESM cycles for ${appType}, TypeScript=${shouldEnableTypescript}`, (t) => {
      const files = {
        "tsconfig.json": JSON.stringify({
          compilerOptions: {
            allowJs: true,
            allowImportingTsExtensions: true,
            jsx: "preserve",
            module: "esnext",
            moduleResolution: "bundler",
            noEmit: true,
            strict: true,
          },
          include: ["**/*"],
        }),
      };
      for (const extension of extensions) {
        files[`${extension}/cycle-a.${extension}`] =
          `import { readB } from "./cycle-b.${extension}";\nexport function readA() { return readB; }\n`;
        files[`${extension}/cycle-b.${extension}`] =
          `import { readA } from "./cycle-a.${extension}";\nexport function readB() { return readA; }\n`;
      }
      const result = runOxlint(
        t,
        files,
        generateOxlintConfig({ appType, shouldEnableTypescript }),
        ["-f", "json"],
      );
      assert.equal(result.status, 1, result.stdout + result.stderr);
      assert.ok(result.stdout.startsWith("{"), result.stdout + result.stderr);
      const { diagnostics } = JSON.parse(result.stdout);
      const cycles = new Set(
        diagnostics
          .filter(({ code }) => code === "import(no-cycle)")
          .map(({ filename }) => path.basename(filename)),
      );
      const missing = extensions.filter(
        (extension) =>
          !cycles.has(`cycle-a.${extension}`) ||
          !cycles.has(`cycle-b.${extension}`),
      );
      assert.deepEqual(missing, []);
      // Why: native cycle analysis skips require() edges, so .cjs also needs
      // a config-level assertion.
      assert.equal(
        generateOxlintConfig({ appType, shouldEnableTypescript }).rules[
          "import/no-cycle"
        ],
        "error",
      );
    });
  }
}

for (const extension of ["mts", "cts"]) {
  it(`applies TypeScript feature rules to .${extension} files`, (t) => {
    const result = runOxlint(
      t,
      {
        [`hooks.${extension}`]:
          'import { useState } from "react";\nexport function loadState() { return useState(0); }\n',
        [`promise.${extension}`]:
          "export const task = new Promise((done) => done(1));\n",
        [`source.test.${extension}`]:
          'import { it, expect } from "vitest";\nit("snapshot", () => { expect(1).toMatchSnapshot(); });\n',
      },
      generateOxlintConfig({ shouldEnableTypescript: false }),
      ["-f", "json"],
    );
    const { diagnostics } = JSON.parse(result.stdout);
    const codes = new Set(diagnostics.map(({ code }) => code));
    assert.ok(codes.has("react-hooks(rules-of-hooks)"));
    assert.ok(codes.has("promise(param-names)"));
    assert.ok(codes.has("vitest(no-restricted-matchers)"));
  });
}
