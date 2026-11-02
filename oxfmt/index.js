/**
 * @typedef {'fullstack' | 'backendOnly'} AppType
 * @typedef {import("oxfmt").OxfmtConfig} OxfmtConfig
 */

/**
 * @param {Object} [options]
 * @param {AppType} [options.appType='fullstack']
 * @param {string} [options.tailwindStylesheet]
 * @returns {OxfmtConfig}
 */
function generateOxfmtConfig({
  appType = "fullstack",
  tailwindStylesheet,
} = {}) {
  return {
    arrowParens: "always",
    bracketSpacing: true,
    embeddedLanguageFormatting: "auto",
    endOfLine: "lf",
    htmlWhitespaceSensitivity: "css",
    objectWrap: "collapse",
    // Why: short lines remain readable in narrow editor panes.
    printWidth: 80,
    quoteProps: "as-needed",
    semi: true,
    singleQuote: false,
    sortImports: {
      groups: [
        "type-import",
        ["value-builtin", "value-external"],
        "type-internal",
        "value-internal",
        ["type-parent", "type-sibling", "type-index"],
        ["value-parent", "value-sibling", "value-index"],
        "unknown",
      ],
      ignoreCase: true,
      internalPattern: ["~/", "@/"],
      newlinesBetween: true,
      order: "asc",
    },
    sortPackageJson: true,
    sortTailwindcss: getTailwindSorting({ appType, tailwindStylesheet }),
    tabWidth: 2,
    trailingComma: "all",
    useTabs: false,
  };
}

/**
 * @param {Object} options
 * @param {AppType} options.appType
 * @param {string | undefined} options.tailwindStylesheet
 * @returns {OxfmtConfig["sortTailwindcss"]}
 */
function getTailwindSorting({ appType, tailwindStylesheet }) {
  if (appType !== "fullstack") {
    return false;
  }
  return tailwindStylesheet ? { stylesheet: tailwindStylesheet } : true;
}

/** @type {OxfmtConfig} */
const ubaOxfmtConfig = generateOxfmtConfig({ appType: "fullstack" });

export default ubaOxfmtConfig;
export { generateOxfmtConfig };
