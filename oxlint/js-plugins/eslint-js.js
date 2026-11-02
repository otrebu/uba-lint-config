// Why: native oxlint cannot express project-specific banned syntax patterns.
import resolvePluginPath from "../resolve.js";

/** @type {import("../types.js").OxlintFragment} */
const eslintJsRules = {
  jsPlugins: [
    { name: "eslint-js", specifier: resolvePluginPath("oxlint-plugin-eslint") },
  ],
};

export default eslintJsRules;
