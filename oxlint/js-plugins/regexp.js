// Why: these checks catch regexes that can hang or silently miss expected input.
// Native no-invalid-regexp covers syntax errors without another JS rule.
import resolvePluginPath from "../resolve.js";
import TEST_FILES from "../test-files.js";

const REGEXP_RULES = [
  "regexp/confusing-quantifier",
  "regexp/no-contradiction-with-assertion",
  "regexp/no-empty-alternative",
  "regexp/no-lazy-ends",
  "regexp/no-misleading-capturing-group",
  "regexp/no-misleading-unicode-character",
  "regexp/no-missing-g-flag",
  "regexp/no-optional-assertion",
  "regexp/no-potentially-useless-backreference",
  "regexp/no-super-linear-backtracking",
  "regexp/no-useless-assertions",
  "regexp/optimal-lookaround-quantifier",
];

/** @type {import("../types.js").OxlintFragment} */
const regexpRules = {
  jsPlugins: [
    { name: "regexp", specifier: resolvePluginPath("eslint-plugin-regexp") },
  ],
  overrides: [
    {
      // Why: tests control regex inputs, so extra JS-plugin work has little value.
      files: TEST_FILES,
      rules: Object.fromEntries(REGEXP_RULES.map((rule) => [rule, "off"])),
    },
  ],
  rules: Object.fromEntries(REGEXP_RULES.map((rule) => [rule, "error"])),
};

export default regexpRules;
