import { defineConfig } from "oxfmt";

import { generateOxfmtConfig } from "./oxfmt/index.js";

export default defineConfig({
  ...generateOxfmtConfig({ appType: "backendOnly" }),
  // Why: semantic-release owns the changelog, so formatting must leave it alone.
  ignorePatterns: ["CHANGELOG.md"],
});
