import resolvePluginPath from "../resolve.js";

/** @type {import("../types.js").OxlintFragment} */
const routerRules = {
  jsPlugins: [
    {
      name: "@tanstack/router",
      specifier: resolvePluginPath("@tanstack/eslint-plugin-router"),
    },
  ],
  rules: {
    "@tanstack/router/create-route-property-order": "error",
    "@tanstack/router/route-param-names": "error",
  },
};

export default routerRules;
