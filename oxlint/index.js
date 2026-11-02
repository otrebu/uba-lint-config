import cypressRules from "./js-plugins/cypress.js";
import eslintJsRules from "./js-plugins/eslint-js.js";
import queryRules from "./js-plugins/query.js";
import regexpRules from "./js-plugins/regexp.js";
import routerRules from "./js-plugins/router.js";
import getStorybookRules from "./js-plugins/storybook.js";
import testingLibraryRules from "./js-plugins/testing-library.js";
import getUbaPluginRules from "./js-plugins/uba.js";
import a11yRules from "./rules/a11y.js";
import eslintRules from "./rules/eslint.js";
import importJavascriptRules from "./rules/import-javascript.js";
import importTypescriptRules from "./rules/import-typescript.js";
import promiseRules from "./rules/promise.js";
import reactRules from "./rules/react.js";
import typescriptRules from "./rules/typescript.js";
import unicornRules from "./rules/unicorn.js";
import vitestRules from "./rules/vitest.js";

/**
 * @typedef {'fullstack' | 'backendOnly'} AppType
 * @typedef {import("./types.js").OxlintFragment} OxlintFragment
 * @typedef {import("oxlint").OxlintConfig} OxlintConfig
 */

/**
 * @type {OxlintFragment}
 */
const componentFilenameRules = {
  overrides: [
    {
      excludeFiles: ["**/index.jsx", "**/index.tsx"],
      files: ["**/src/components/**/*.jsx", "**/src/components/**/*.tsx"],
      rules: { "unicorn/filename-case": ["error", { case: "pascalCase" }] },
    },
  ],
  plugins: ["unicorn"],
};

/**
 * @param {Object} [options]
 * @param {AppType} [options.appType='fullstack']
 * @param {boolean} [options.shouldEnableTypescript=true]
 * @param {boolean} [options.shouldEnableJsPlugins=true]
 * @param {boolean} [options.shouldEnableStorybook=false]
 * @param {boolean} [options.shouldEnableCypress=false]
 * @param {boolean} [options.shouldDenyWarnings=true]
 * @returns {OxlintConfig}
 */
function generateOxlintConfig({
  appType = "fullstack",
  shouldDenyWarnings = true,
  shouldEnableCypress = false,
  shouldEnableJsPlugins = true,
  shouldEnableStorybook = false,
  shouldEnableTypescript = true,
} = {}) {
  switch (appType) {
    case "backendOnly": {
      return generateOxlintConfigByFeatures({
        shouldDenyWarnings,
        shouldEnableA11y: false,
        shouldEnableBrowserGlobals: false,
        shouldEnableCypress: false,
        shouldEnableJsPlugins,
        shouldEnableNodeGlobals: true,
        shouldEnableQuery: false,
        shouldEnableReact: false,
        shouldEnableRouter: false,
        shouldEnableStorybook: false,
        shouldEnableTypescript,
        shouldEnableVitest: true,
      });
    }
    case "fullstack": {
      return generateOxlintConfigByFeatures({
        shouldDenyWarnings,
        shouldEnableA11y: true,
        shouldEnableBrowserGlobals: true,
        shouldEnableCypress,
        shouldEnableJsPlugins,
        shouldEnableNodeGlobals: true,
        shouldEnableQuery: true,
        shouldEnableReact: true,
        shouldEnableRouter: true,
        shouldEnableStorybook,
        shouldEnableTypescript,
        shouldEnableVitest: true,
      });
    }
    default: {
      throw new Error(`Invalid app type: ${appType}`);
    }
  }
}

/**
 * @param {Object} [options]
 * @param {boolean} [options.shouldDenyWarnings=true]
 * @param {boolean} [options.shouldEnableA11y=false]
 * @param {boolean} [options.shouldEnableBrowserGlobals=false]
 * @param {boolean} [options.shouldEnableCypress=false]
 * @param {boolean} [options.shouldEnableJsPlugins=true]
 * @param {boolean} [options.shouldEnableNodeGlobals=false]
 * @param {boolean} [options.shouldEnableQuery=false]
 * @param {boolean} [options.shouldEnableReact=false]
 * @param {boolean} [options.shouldEnableRouter=false]
 * @param {boolean} [options.shouldEnableStorybook=false]
 * @param {boolean} [options.shouldEnableTypescript=true]
 * @param {boolean} [options.shouldEnableVitest=false]
 * @returns {OxlintConfig}
 */
function generateOxlintConfigByFeatures(options = {}) {
  // Why: a defaults table avoids counting each default parameter as a branch.
  // Undefined options retain their defaults, like default parameters do.
  const features = {
    ...DEFAULT_FEATURES,
    ...Object.fromEntries(
      Object.entries(options).filter(([, value]) => value !== undefined),
    ),
  };
  const jsPluginFragments = features.shouldEnableJsPlugins
    ? [
        getUbaPluginRules({ shouldEnableReact: features.shouldEnableReact }),
        eslintJsRules,
        regexpRules,
        includeIf(features.shouldEnableCypress, cypressRules),
        // Why: lazy resolution lets consumers omit the optional Storybook peers.
        features.shouldEnableStorybook ? getStorybookRules() : undefined,
        includeIf(features.shouldEnableQuery, queryRules),
        includeIf(features.shouldEnableRouter, routerRules),
        includeIf(
          features.shouldEnableReact && features.shouldEnableVitest,
          testingLibraryRules,
        ),
      ]
    : [];

  const merged = mergeFragments([
    eslintRules,
    includeIf(features.shouldEnableTypescript, typescriptRules),
    includeIf(features.shouldEnableA11y, a11yRules),
    componentFilenameRules,
    promiseRules,
    unicornRules,
    includeIf(features.shouldEnableReact, reactRules),
    features.shouldEnableTypescript
      ? importTypescriptRules
      : importJavascriptRules,
    // Why: test mocks need the import/first exception to win over import rules.
    includeIf(features.shouldEnableVitest, vitestRules),
    ...jsPluginFragments,
  ]);

  return {
    ...merged,
    // Why: implicit defaults would add rules this package has not selected.
    categories: { correctness: "off" },
    env: {
      builtin: true,
      es2026: true,
      ...merged.env,
      ...(features.shouldEnableNodeGlobals ? { node: true } : {}),
      ...(features.shouldEnableBrowserGlobals ? { browser: true } : {}),
    },
    options: {
      denyWarnings: features.shouldDenyWarnings,
      typeAware: features.shouldEnableTypescript,
    },
  };
}

const DEFAULT_FEATURES = {
  shouldDenyWarnings: true,
  shouldEnableA11y: false,
  shouldEnableBrowserGlobals: false,
  shouldEnableCypress: false,
  shouldEnableJsPlugins: true,
  shouldEnableNodeGlobals: false,
  shouldEnableQuery: false,
  shouldEnableReact: false,
  shouldEnableRouter: false,
  shouldEnableStorybook: false,
  shouldEnableTypescript: true,
  shouldEnableVitest: false,
};

/**
 * @param {boolean} isEnabled
 * @param {OxlintFragment} fragment
 * @returns {OxlintFragment | undefined}
 */
function includeIf(isEnabled, fragment) {
  return isEnabled ? fragment : undefined;
}

/**
 * @param {Array<OxlintFragment | undefined>} fragments
 * @returns {Required<OxlintFragment>}
 */
function mergeFragments(fragments) {
  /** @type {Required<OxlintFragment>} */
  const merged = {
    env: {},
    jsPlugins: [],
    overrides: [],
    plugins: [],
    rules: {},
    settings: {},
  };

  for (const fragment of fragments.filter((item) => item !== undefined)) {
    merged.plugins = [
      ...new Set([...merged.plugins, ...(fragment.plugins ?? [])]),
    ];
    merged.jsPlugins = [...merged.jsPlugins, ...(fragment.jsPlugins ?? [])];
    merged.env = { ...merged.env, ...fragment.env };
    merged.rules = { ...merged.rules, ...fragment.rules };
    merged.settings = { ...merged.settings, ...fragment.settings };
    merged.overrides = [...merged.overrides, ...(fragment.overrides ?? [])];
  }

  return merged;
}

/** @type {OxlintConfig} */
const ubaOxlintConfig = generateOxlintConfig({ appType: "fullstack" });

export default ubaOxlintConfig;
export { generateOxlintConfig, generateOxlintConfigByFeatures };
