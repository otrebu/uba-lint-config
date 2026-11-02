import { defineConfig } from "oxlint";

import { generateOxlintConfig } from "./oxlint/index.js";

const base = generateOxlintConfig({
  appType: "backendOnly",
  // Why: this package has no TS project for the type-aware engine.
  shouldEnableTypescript: false,
});

// Why: extends drops env, so the generated config must be spread.
export default defineConfig({
  ...base,
  // Why: the test runner checks fixture violations separately from package lint.
  ignorePatterns: ["CHANGELOG.md", "test/fixtures/**"],
  overrides: [
    ...base.overrides,
    // Why: node:test needs no extra test-runner dependency.
    { files: ["test/**"], rules: { "vitest/no-import-node-test": "off" } },
  ],
});
