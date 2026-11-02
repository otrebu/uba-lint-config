// Why: cleanup depends on runner globals, and query-style rules add no bug checks.
// Custom query detection would misread unrelated helpers such as findBySlug().
import resolvePluginPath from "../resolve.js";

/** @type {import("../types.js").OxlintFragment} */
const testingLibraryRules = {
  jsPlugins: [
    {
      name: "testing-library",
      specifier: resolvePluginPath("eslint-plugin-testing-library"),
    },
  ],
  overrides: [
    {
      // Why: Node and Playwright tests have no Testing Library queries to check.
      excludeFiles: ["**/e2e/**"],
      files: ["**/*.test.jsx", "**/*.test.tsx"],
      rules: {
        "testing-library/await-async-events": [
          "error",
          { eventModule: "userEvent" },
        ],
        "testing-library/await-async-queries": "error",
        "testing-library/await-async-utils": "error",
        "testing-library/no-await-sync-events": [
          "error",
          { eventModules: ["fire-event"] },
        ],
        "testing-library/no-await-sync-queries": "error",
        "testing-library/no-debugging-utils": "error",
        "testing-library/no-dom-import": ["error", "react"],
        "testing-library/no-global-regexp-flag-in-query": "error",
        "testing-library/no-promise-in-fire-event": "error",
        "testing-library/no-render-in-lifecycle": "error",
        "testing-library/no-unnecessary-act": "error",
        "testing-library/no-wait-for-multiple-assertions": "error",
        "testing-library/no-wait-for-side-effects": "error",
        "testing-library/prefer-find-by": "error",
        "testing-library/prefer-query-by-disappearance": "error",
      },
    },
  ],
  settings: { "testing-library/custom-queries": "off" },
};

export default testingLibraryRules;
