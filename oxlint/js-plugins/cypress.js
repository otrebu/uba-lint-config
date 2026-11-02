import resolvePluginPath from "../resolve.js";

/** @type {import("../types.js").OxlintFragment} */
const cypressRules = {
  jsPlugins: [
    { name: "cypress", specifier: resolvePluginPath("eslint-plugin-cypress") },
  ],
  overrides: [
    {
      env: { browser: true, mocha: true },
      files: [
        "cypress/**/*.ts",
        "cypress/**/*.tsx",
        "cypress/**/*.mts",
        "cypress/**/*.cts",
        "**/*.test.tsx",
      ],
      globals: {
        assert: "writable",
        chai: "writable",
        cy: "writable",
        Cypress: "writable",
        expect: "writable",
      },
      rules: {},
    },
  ],
};

export default cypressRules;
