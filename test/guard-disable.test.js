import assert from "node:assert/strict";
import { it } from "node:test";
import { fileURLToPath } from "node:url";

import { runOxlint } from "./support/oxlint.js";

const config = {
  categories: { correctness: "off" },
  jsPlugins: [
    {
      name: "uba",
      specifier: fileURLToPath(
        new URL("../oxlint/plugin/index.js", import.meta.url),
      ),
    },
  ],
  rules: {
    "no-console": "error",
    "uba/no-guard-disable": [
      "error",
      { rules: ["uba/no-guard-disable", "no-console"] },
    ],
  },
};

for (const prefix of ["eslint", "oxlint"]) {
  const directives = {
    block: `/* ${prefix}-disable uba/no-guard-disable, no-console -- probe */\nconsole.log(1);`,
    "same-line": `console.log(1); // ${prefix}-disable-line uba/no-guard-disable, no-console -- probe`,
    "next-line": `// ${prefix}-disable-next-line uba/no-guard-disable, no-console -- probe\nconsole.log(1);`,
    "separate blocks": `/* ${prefix}-disable uba/no-guard-disable -- probe */\n/* ${prefix}-disable no-console -- probe */\nconsole.log(1);`,
    "all rules": `/* ${prefix}-disable -- probe */\nconsole.log(1);`,
  };
  for (const [shape, source] of Object.entries(directives)) {
    it(`fails with a clear fatal message for ${prefix} ${shape} guard suppression`, (t) => {
      const result = runOxlint(t, { "source.js": source }, config);
      assert.equal(result.status, 1, result.stdout + result.stderr);
      assert.match(
        result.stdout + result.stderr,
        /uba\/no-guard-disable:.*cannot be disabled/u,
      );
    });
  }
}

it("keeps ordinary reasoned disable comments available", (t) => {
  const result = runOxlint(
    t,
    {
      "source.js":
        "console.log(1); // eslint-disable-line no-console -- diagnostic output",
    },
    { ...config, rules: { ...config.rules, "uba/no-guard-disable": "error" } },
  );
  assert.equal(result.status, 0, result.stdout + result.stderr);
});

/**
 * @param {string} prefix
 * @param {string} rules
 */
function getDisableShapes(prefix, rules) {
  return {
    block: `/* ${prefix}-disable ${rules} -- diagnostic output */\nconsole.log(1);`,
    "same-line": `console.log(1); // ${prefix}-disable-line ${rules} -- diagnostic output`,
    "next-line": `// ${prefix}-disable-next-line ${rules} -- diagnostic output\nconsole.log(1);`,
  };
}

for (const prefix of ["eslint", "oxlint"]) {
  for (const [separator, rules] of [
    ["spaces", "no-console uba/no-guard-disable"],
    ["mixed separators", "no-debugger, no-console\tuba/no-guard-disable"],
  ]) {
    for (const [shape, source] of Object.entries(
      getDisableShapes(prefix, rules),
    )) {
      it(`rejects ${prefix} ${shape} self-disable with ${separator}`, (t) => {
        const result = runOxlint(t, { "source.js": source }, config);
        assert.equal(result.status, 1, result.stdout + result.stderr);
        assert.match(
          result.stdout + result.stderr,
          /guard validation cannot be disabled/u,
        );
      });
    }
  }
  for (const [shape, source] of Object.entries(
    getDisableShapes(prefix, "no-debugger, no-alert no-console"),
  )) {
    it(`rejects ${prefix} ${shape} mixed-list guard disable without self-disable`, (t) => {
      const result = runOxlint(t, { "source.js": source }, config, [
        "-f",
        "json",
      ]);
      assert.equal(result.status, 1, result.stdout + result.stderr);
      assert.ok(
        JSON.parse(result.stdout).diagnostics.some(
          ({ code }) => code === "uba(no-guard-disable)",
        ),
      );
    });
  }
  for (const [shape, source] of Object.entries(
    getDisableShapes(prefix, "no-debugger, no-alert\tno-console"),
  )) {
    it(`allows ${prefix} ${shape} ordinary reasoned mixed-list disable`, (t) => {
      const result = runOxlint(
        t,
        { "source.js": source },
        {
          ...config,
          rules: { ...config.rules, "uba/no-guard-disable": "error" },
        },
      );
      assert.equal(result.status, 0, result.stdout + result.stderr);
    });
  }
}

const whitespaceSeparators = [
  "\t",
  "\n",
  "\r",
  "\v",
  "\f",
  "\r\n",
  "\u0085",
  "\u00a0",
  "\u1680",
  "\u2000",
  "\u2001",
  "\u2002",
  "\u2003",
  "\u2004",
  "\u2005",
  "\u2006",
  "\u2007",
  "\u2008",
  "\u2009",
  "\u200a",
  "\u2028",
  "\u2029",
  "\u202f",
  "\u205f",
  "\u3000",
];
for (const prefix of ["eslint", "oxlint"]) {
  for (const separator of whitespaceSeparators) {
    it(`rejects ${prefix} guard lists separated by ${JSON.stringify(separator)}`, (t) => {
      const source = `/* ${prefix}-disable no-console${separator}uba/no-guard-disable -- diagnostic output */\nconsole.log(1);`;
      const result = runOxlint(t, { "source.js": source }, config);
      assert.equal(result.status, 1, result.stdout + result.stderr);
      assert.match(
        result.stdout + result.stderr,
        /guard validation cannot be disabled/u,
      );
    });
  }
}
