import { fileURLToPath } from "node:url";

import TEST_FILES from "../test-files.js";

// Why: fixed SDK signatures can need long parameter lists, so max-params accepts
// a reasoned disable rather than requiring a config override.
const GUARD_RULES = [
  "@tanstack/query/exhaustive-deps",
  "complexity",
  "eslint-js/no-restricted-syntax",
  "import/no-cycle",
  "max-depth",
  "no-restricted-globals",
  "no-restricted-imports",
  "no-restricted-properties",
  "react/exhaustive-deps",
  "react/rules-of-hooks",
  "typescript/ban-ts-comment",
  "typescript/no-floating-promises",
  "typescript/no-misused-promises",
  "typescript/no-unsafe-type-assertion",
  "typescript/switch-exhaustiveness-check",
  "uba/jsx-no-leaked-render",
  "uba/no-guard-disable",
  "uba/require-disable-reason",
  "uba/why-comments",
  "unicorn/no-abusive-eslint-disable",
];

/**
 * Why: both presets need the class restriction, including backend-only projects.
 * @param {Object} options
 * @param {boolean} options.shouldEnableReact
 * @returns {import("../types.js").OxlintFragment}
 */
function getUbaPluginRules({ shouldEnableReact }) {
  return {
    jsPlugins: [
      {
        name: "uba",
        specifier: fileURLToPath(
          new URL("../plugin/index.js", import.meta.url),
        ),
      },
    ],
    overrides: [
      {
        // Why: SDK fakes and page objects need classes in tests.
        files: TEST_FILES,
        rules: {
          "uba/no-class": "off",
          // Why: test doubles need any often; a reason per mock adds nothing.
          "uba/require-disable-reason": "off",
        },
      },
    ],
    rules: {
      "uba/no-class": "error",
      // Why: config overrides make guard exceptions visible to reviewers.
      "uba/no-guard-disable": ["error", { rules: GUARD_RULES }],
      "uba/require-disable-reason": "error",
      "uba/why-comments": "error",
      ...(shouldEnableReact ? { "uba/jsx-no-leaked-render": "error" } : {}),
    },
  };
}

export default getUbaPluginRules;
