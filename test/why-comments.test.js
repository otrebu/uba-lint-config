import assert from "node:assert/strict";
import { it } from "node:test";
import { fileURLToPath } from "node:url";
import { generateOxlintConfig } from "uba-lint-config/oxlint";

import { runOxlint } from "./support/oxlint.js";

const message =
  "Comments explain why. Start with `Why: `. Put the what in names, types and tests.";
const config = {
  categories: { correctness: "off" },
  jsPlugins: [
    {
      name: "uba",
      specifier: fileURLToPath(
        import.meta.resolve("uba-lint-config/oxlint-plugin"),
      ),
    },
  ],
  rules: { "uba/why-comments": "error" },
};

/**
 * @param {import("node:test").TestContext} t
 * @param {string} comment
 * @param {boolean} shouldPass
 * @param {string} [filename]
 */
function checkComment(t, comment, shouldPass, filename = "source.js") {
  const result = runOxlint(
    t,
    { [filename]: `${comment}\nconst value = 1;\n` },
    config,
    ["-f", "json"],
  );
  assert.equal(
    result.status,
    shouldPass ? 0 : 1,
    result.stdout + result.stderr,
  );
  const { diagnostics } = JSON.parse(result.stdout);
  assert.equal(diagnostics.length === 0, shouldPass);
  for (const diagnostic of diagnostics) {
    assert.equal(diagnostic.code, "uba(why-comments)");
    assert.equal(diagnostic.message, message);
  }
}

it("rejects prose comments with the required explanation", (t) => {
  const result = runOxlint(
    t,
    { "source.js": "// Set the value.\nexport const value = 1;\n" },
    config,
    ["-f", "json"],
  );
  assert.equal(result.status, 1);
  const { diagnostics } = JSON.parse(result.stdout);
  assert.equal(diagnostics[0].code, "uba(why-comments)");
  assert.equal(diagnostics[0].message, message);
});

const validComments = [
  ["line", "// Why: keep the original value for retries."],
  [
    "line run",
    "// Why: retries reuse the original value.\n// A reset would lose the attempt count.",
  ],
  [
    "block",
    "/*\n * Why: retries need the original attempt count.\n * A reset would lose it.\n */",
  ],
  ["JSDoc", "/** Why: callers need the original attempt count. */"],
  [
    "JSX",
    "export const view = <div>{/* Why: reserve space during loading. */}</div>;",
  ],
];
for (const [name, comment] of validComments) {
  it(`accepts a Why: ${name} comment`, (t) =>
    checkComment(t, comment, true, "source.tsx"));
}

const invalidComments = [
  ["unprefixed run", "// Set the value.\n// Store it for later."],
  ["lowercase prefix", "// why: preserve retry state."],
  ["empty reason", "// Why:"],
  ["whitespace reason", "// Why:   "],
  ["extra space", "// Why:  retry state matters."],
  ["tab separator", "// Why:\tretry state matters."],
  ["banner", "// ======== Helpers ========"],
  ["commented-out code", "// const removed = 1;"],
  ["line star", "// * Why: a line comment has no JSDoc marker."],
  ["prose JSDoc", "/** Sets the value. */"],
  ["blank-line break", "// Why: preserve retry state.\n\n// Set the value."],
  [
    "intervening code",
    "const first = 1; // Why: keep retry state.\nconst second = 2; // Set the second value.",
  ],
];
for (const [name, comment] of invalidComments) {
  it(`rejects a ${name} comment`, (t) => checkComment(t, comment, false));
}

const directives = [
  "// eslint-disable no-console -- diagnostic output",
  "// eslint-disable-next-line no-console -- diagnostic output",
  "// eslint-disable-line no-console -- diagnostic output",
  "/* eslint-enable no-console */",
  "// oxlint-disable no-console -- diagnostic output",
  "// oxlint-disable-next-line no-console -- diagnostic output",
  "// oxlint-disable-line no-console -- diagnostic output",
  "/* oxlint-enable no-console */",
  "// @ts-expect-error -- a deliberate type error",
  "// @ts-ignore",
  "// @ts-check",
  "// @ts-nocheck",
  '/// <reference path="./types.d.ts" />',
  "// @vitest-environment jsdom",
  "/* #__PURE__ */",
  "/* @__PURE__ */",
  "/* @vite-ignore */",
  '/* webpackChunkName: "worker" */',
  '/* webpackMode: "lazy" */',
  "/* webpackIgnore: true */",
  "/* c8 ignore next */",
  "/* v8 ignore next */",
  "/* istanbul ignore next */",
  "// oxfmt-ignore",
  "// prettier-ignore",
  "/** @jsx React.createElement */",
  "/** @jsxImportSource react */",
  "/** @jsxRuntime automatic */",
  "/** @jsxFrag React.Fragment */",
];
for (const directive of directives) {
  it(`allows the directive ${directive}`, (t) =>
    checkComment(t, directive, true));
}

it("does not grant prose an exception after a directive", (t) => {
  checkComment(t, "// @ts-check\n// Set the value.", false);
});

const typeOnlyJsdoc = `/**
 * @typedef {string} Name
 * @callback Compare
 * @param {Name} value
 * @param {Object} [options]
 * @property {number} options.limit
 * @returns {number}
 * @template T, U
 * @template {string} Key
 * @import { Other as Alias } from "types"
 * @satisfies {Record<string, number>}
 * @overload
 * @type {{ value: "}", read: (input: { id: number }) => string }}
 */`;
for (const extension of ["js", "mjs", "cjs"]) {
  it(`accepts type-only JSDoc in .${extension}`, (t) =>
    checkComment(t, typeOnlyJsdoc, true, `source.${extension}`));
}
for (const extension of ["ts", "tsx", "mts", "cts", "jsx"]) {
  it(`requires Why: for type-only JSDoc in .${extension}`, (t) =>
    checkComment(t, typeOnlyJsdoc, false, `source.${extension}`));
}
const proseTags = [
  "@type {string} The value.",
  "@param {string} value - a description",
  "@param {string} value a description",
  "@returns {string} a result",
  "@typedef {string} Name a description",
  "@property {string} name - a description",
  "@template T a description",
  "@callback Handler a description",
  "@satisfies {string} a description",
  "@overload a description",
  '@import { Thing } from "types" a description',
  "@throws {Error}",
  "@type {string} a description {hidden}",
];
for (const tag of proseTags) {
  it(`requires Why: for prose or an unsupported tag: ${tag}`, (t) =>
    checkComment(t, `/** ${tag} */`, false));
}
it("requires actual JSDoc markers for the JavaScript type exception", (t) => {
  checkComment(t, "/* @type {string} */", false);
});
it("accepts nested and multiline JSDoc types without prose", (t) => {
  checkComment(
    t,
    '/**\n * @type {{\n *   value: "}",\n *   read: (input: { id: number }) => string\n * }}\n */',
    true,
  );
});

it("rejects prose disguised as an optional JSDoc parameter name", (t) => {
  checkComment(t, "/** @param {string} [name - a description] */", false);
});

it("accepts nested and quoted optional JSDoc defaults", (t) => {
  checkComment(
    t,
    '/**\n * @param {Array<number>} [values=[1, 2]]\n * @param {string} [suffix="]"]\n */',
    true,
  );
});

for (const appType of ["fullstack", "backendOnly"]) {
  it(`checks Why: comments in source and tests by default for ${appType}`, (t) => {
    const result = runOxlint(
      t,
      {
        "source.js": "// Set the value.\nexport const value = 1;\n",
        "source.test.js":
          "// Set the expected value.\nexport const expected = 1;\n",
      },
      generateOxlintConfig({ appType, shouldEnableTypescript: false }),
      ["-f", "json"],
    );
    const { diagnostics } = JSON.parse(result.stdout);
    assert.equal(
      diagnostics.filter(({ code }) => code === "uba(why-comments)").length,
      2,
    );
  });
}

it("rejects a disable comment for why-comments through the guard", (t) => {
  const result = runOxlint(
    t,
    {
      "source.js":
        "/* eslint-disable uba/why-comments -- legacy code */\n// Set the value.\nexport const value = 1;\n",
    },
    generateOxlintConfig({ shouldEnableTypescript: false }),
    ["-f", "json"],
  );
  assert.equal(result.status, 1);
  const { diagnostics } = JSON.parse(result.stdout);
  assert.ok(
    diagnostics.some(
      ({ code, message: text }) =>
        code === "uba(no-guard-disable)" &&
        text.startsWith("uba/why-comments is a guard rule"),
    ),
  );
});

it("allows a top-level config override while a codebase is being cleaned up", (t) => {
  const base = generateOxlintConfig({
    appType: "backendOnly",
    shouldEnableTypescript: false,
  });
  const result = runOxlint(
    t,
    { "source.js": "// Set the value.\nexport const value = 1;\n" },
    { ...base, rules: { ...base.rules, "uba/why-comments": "off" } },
  );
  assert.equal(result.status, 0, result.stdout + result.stderr);
});

for (const extension of ["js", "mjs", "cjs"]) {
  for (const [name, comment] of [
    ["two inline tags", "/** @param {number} value @returns {number} */"],
    [
      "tags across inline and multiline types",
      '/** @param {{ tag: "@returns", nested: { value: number } }} value\n * @returns {number} @overload */',
    ],
    [
      "tags after optional defaults",
      '/** @param {string} [value=" @returns {prose} "] @returns {string} */',
    ],
    ["Unicode named import", '/** @import { Café } from "types" */'],
    [
      "Unicode aliased import",
      '/** @import { 类型 as 名称, Café as _café } from "types" */',
    ],
    ["Unicode namespace import", '/** @import * as 类型 from "types" */'],
    ["Unicode default import", '/** @import Café from "types" */'],
    [
      "identifier joiners",
      '/** @import { a\u200cb, a\u200db, 𐐀name } from "types" */',
    ],
    [
      "escaped identifiers",
      String.raw`/** @import { \u0043af\u00e9 as \u{540d}称 } from "types" */`,
    ],
    [
      "inline import and type tags",
      '/** @import { Café } from "@types/example" @type {Café} */',
    ],
  ]) {
    it(`accepts ${name} in .${extension}`, (t) =>
      checkComment(t, comment, true, `source.${extension}`));
  }
  for (const [name, comment] of [
    [
      "prose between tags",
      "/** @param {number} value a description @returns {number} */",
    ],
    [
      "prose after inline tags",
      "/** @param {number} value @returns {number} a description */",
    ],
    [
      "prose after Unicode import",
      '/** @import { Café } from "types" a description */',
    ],
    ["invalid import identifier", '/** @import { 9Café } from "types" */'],
  ]) {
    it(`rejects ${name} in .${extension}`, (t) =>
      checkComment(t, comment, false, `source.${extension}`));
  }
}

for (const pragma of [
  "@ts-check",
  "#__PURE__",
  "@__PURE__",
  "@vite-ignore",
  "prettier-ignore",
  "oxfmt-ignore",
  "@vitest-environment jsdom",
  "@jsx React.createElement",
  "@jsxImportSource react",
  "@jsxRuntime automatic",
  "@jsxFrag React.Fragment",
  'webpackChunkName: "worker"',
  "c8 ignore next",
  "v8 ignore next",
  "istanbul ignore next",
]) {
  for (const marker of ["/*", "/**"]) {
    it(`rejects prose after ${pragma} in ${marker} blocks`, (t) => {
      checkComment(
        t,
        `${marker}\n * ${pragma}\n * This describes how the module works.\n */`,
        false,
      );
    });
  }
}
for (const prefix of ["eslint", "oxlint"]) {
  it(`accepts a multiline ${prefix} rule list and reason`, (t) => {
    checkComment(
      t,
      `/* ${prefix}-disable\n no-console,\n no-debugger -- diagnostic output\n stays available for support.\n */`,
      true,
    );
  });
  it(`accepts a multiline ${prefix} enable list`, (t) => {
    checkComment(
      t,
      `/* ${prefix}-enable\n no-console,\n no-debugger\n */`,
      true,
    );
  });
}
it("accepts multiple JSX pragmas in one JSDoc", (t) => {
  checkComment(
    t,
    "/**\n * @jsx React.createElement\n * @jsxFrag React.Fragment\n */",
    true,
  );
});
it("accepts a multiline pragma argument", (t) => {
  checkComment(t, "/** @jsxImportSource\n * react */", true);
});
it("accepts multiline webpack options", (t) => {
  checkComment(
    t,
    '/* webpackChunkName: "worker",\n webpackMode: "lazy" */',
    true,
  );
});

it("rejects an invented webpack magic-comment name", (t) => {
  checkComment(
    t,
    "/* webpackDefinitelyNotAMagicComment: ordinary prose */",
    false,
  );
});
for (const directive of [
  "webpackPrefetch: true",
  "webpackPreload: 2",
  'webpackFetchPriority: "high"',
  "webpackInclude: /[a/b,]+/i",
  "webpackExclude: /test/",
  'webpackExports: ["default", "named"]',
]) {
  it(`accepts the supported magic comment ${directive}`, (t) => {
    checkComment(t, `/* ${directive} */`, true);
  });
}

for (const extension of ["js", "mjs", "cjs", "ts"]) {
  for (const [directive, reason] of [
    ["@ts-expect-error", "intentional type mismatch for boundary test"],
    ["@ts-ignore", "TypeScript does not model this boundary"],
  ]) {
    for (const [style, separator] of [
      ["spaces", " "],
      ["colon", ": "],
      ["hyphens", " -- "],
    ]) {
      it(`accepts TS directive descriptions with ${style} after ${directive} in .${extension}`, (t) => {
        checkComment(
          t,
          `// ${directive}${separator}${reason}`,
          true,
          `source.${extension}`,
        );
      });
    }
  }
}
for (const directive of ["@ts-expect-error", "@ts-ignore"]) {
  it(`accepts a TS directive description with native allow-with-description for ${directive}`, (t) => {
    const result = runOxlint(
      t,
      {
        "source.ts": `// ${directive} intentional type mismatch for boundary test\nexport const value: number = "text";\n`,
      },
      {
        ...config,
        plugins: ["typescript"],
        rules: {
          ...config.rules,
          "typescript/ban-ts-comment": [
            "error",
            { [directive.slice(1)]: "allow-with-description" },
          ],
        },
      },
      ["-f", "json"],
    );
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.deepEqual(JSON.parse(result.stdout).diagnostics, []);
  });
  for (const marker of ["/*", "/**"]) {
    for (const separator of [" ", ": ", " -- "]) {
      it(`rejects later prose after a TS directive description in ${marker} with ${directive}${separator}`, (t) => {
        checkComment(
          t,
          `${marker}\n * ${directive}${separator}intentional boundary test\n * This describes the module.\n */`,
          false,
        );
      });
    }
  }
}
for (const lookalike of [
  "@ts-checking",
  "@ts-ignoreOnce",
  "@ts-expect-errors",
  "@ts-nochecking",
]) {
  it(`rejects the TS directive lookalike ${lookalike}`, (t) => {
    checkComment(t, `// ${lookalike} intentional boundary test`, false);
  });
}

for (const extension of ["js", "mjs", "cjs"]) {
  for (const [name, bindings] of [
    ["default and named", "Default, { Named }"],
    ["default and namespace", "Default, * as Types"],
    ["Unicode default and named", "Café, { 类型 as 名称, Other }"],
    ["Unicode default and namespace", "Café, * as 类型"],
    [
      "escaped default and named",
      String.raw`\u0043af\u00e9, { \u{540d}称 as \u0054ypes }`,
    ],
    [
      "escaped default and namespace",
      String.raw`\u0043af\u00e9, * as \u{540d}称`,
    ],
    ["multiline default and named", "Default,\n * { Named, Other as Alias, }"],
    ["multiline default and namespace", "Default,\n * * as Types"],
  ]) {
    it(`accepts combined @import ${name} in .${extension}`, (t) => {
      checkComment(
        t,
        `/** @import ${bindings} from "types" */`,
        true,
        `source.${extension}`,
      );
    });
  }
  for (const [name, body] of [
    [
      "prose after named import",
      'Default, { Named } from "types" a description',
    ],
    [
      "prose after namespace import",
      'Default, * as Types from "types" a description',
    ],
    ["prose after Unicode import", 'Café, { 类型 } from "types" a description'],
    [
      "prose in default binding",
      'Default a description, { Named } from "types"',
    ],
    ["invalid default name", '9Default, { Named } from "types"'],
    ["invalid named binding", 'Default, { 9Named } from "types"'],
    ["invalid namespace binding", 'Default, * as 9Types from "types"'],
    ["invalid default escape", String.raw`\u{110000}, { Named } from "types"`],
    ["two default names", 'Default, Second from "types"'],
    ["three binding clauses", 'Default, Second, { Named } from "types"'],
  ]) {
    it(`rejects combined @import ${name} in .${extension}`, (t) => {
      checkComment(t, `/** @import ${body} */`, false, `source.${extension}`);
    });
  }
}
