// Why: no-void-query-fn needs type information, which JS plugins do not get.
import resolvePluginPath from "../resolve.js";

/** @type {import("../types.js").OxlintFragment} */
const queryRules = {
  jsPlugins: [
    {
      name: "@tanstack/query",
      specifier: resolvePluginPath("@tanstack/eslint-plugin-query"),
    },
  ],
  rules: {
    "@tanstack/query/exhaustive-deps": "error",
    "@tanstack/query/infinite-query-property-order": "error",
    "@tanstack/query/mutation-property-order": "error",
    "@tanstack/query/no-rest-destructuring": "error",
    "@tanstack/query/no-unstable-deps": "error",
    "@tanstack/query/stable-query-client": "error",
  },
};

export default queryRules;
