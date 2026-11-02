// Why: override globs are relative to the config file, so it lives with the fixtures.
import { generateOxlintConfig } from "../../oxlint/index.js";

const base = generateOxlintConfig({ appType: "fullstack" });

export default {
  ...base,
  rules: {
    ...base.rules,
    "eslint-js/no-restricted-syntax": [
      "error",
      {
        message: "Use a union of string literals instead of an enum.",
        selector: "TSEnumDeclaration",
      },
    ],
  },
};
