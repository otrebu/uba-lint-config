// Why: projects choose their framework or renderer imports, so that check stays off.
import resolvePluginPath from "../resolve.js";

/** @returns {import("../types.js").OxlintFragment} */
function getStorybookRules() {
  return {
    jsPlugins: [{ name: "storybook", specifier: resolveStorybookPlugin() }],
    overrides: [
      {
        files: [
          "**/*.stories.@(ts|tsx|mts|cts|js|jsx|mjs|cjs)",
          "**/*.story.@(ts|tsx|mts|cts|js|jsx|mjs|cjs)",
        ],
        rules: {
          "import/no-anonymous-default-export": "off",
          "storybook/await-interactions": "error",
          "storybook/context-in-play-function": "error",
          "storybook/default-exports": "error",
          "storybook/hierarchy-separator": "warn",
          "storybook/no-redundant-story-name": "warn",
          "storybook/prefer-pascal-case": "warn",
          "storybook/story-exports": "error",
          "storybook/use-storybook-expect": "error",
          "storybook/use-storybook-testing-library": "error",
        },
      },
      {
        files: [".storybook/main.@(js|cjs|mjs|ts|mts|cts)"],
        rules: { "storybook/no-uninstalled-addons": "error" },
      },
    ],
  };
}

function resolveStorybookPlugin() {
  try {
    return resolvePluginPath("eslint-plugin-storybook");
  } catch {
    throw new Error(
      "Storybook linting requires optional peer dependencies: eslint-plugin-storybook@^10.2.8 and storybook@^10.2.8.",
    );
  }
}

export default getStorybookRules;
