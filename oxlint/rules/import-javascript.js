/** @type {import("../types.js").OxlintFragment} */
const importJavascriptRules = {
  overrides: [
    {
      env: { es2026: true },
      files: ["**/*.js", "**/*.jsx", "**/*.mjs", "**/*.cjs"],
      rules: {
        "import/first": "error",
        "import/group-exports": "off",
        "import/newline-after-import": "error",
        "import/no-absolute-path": "error",
        "import/no-anonymous-default-export": "error",
        "import/no-default-export": "off",
        "import/no-duplicates": "error",
        "import/no-empty-named-blocks": "error",
        "import/no-mutable-exports": "error",
        "import/no-named-as-default": "error",
        "import/no-named-export": "off",
        "import/no-relative-parent-imports": "off",
        "import/no-self-import": "error",
      },
    },
  ],
  plugins: ["import"],
  // Why: mixed-language projects need cycle checks outside the language glob.
  rules: { "import/no-cycle": "error" },
};

export default importJavascriptRules;
