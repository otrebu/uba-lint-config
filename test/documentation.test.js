import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { it } from "node:test";

it("documents the preset and JS-plugin requirements of the Storybook option", () => {
  const readme = readFileSync(new URL("../README.md", import.meta.url), "utf8");
  const option = readme
    .split("\n")
    .find((line) => line.startsWith("| `shouldEnableStorybook`"));
  assert.match(option, /`fullstack`/u);
  assert.match(option, /`shouldEnableJsPlugins: true`/u);
  assert.match(
    readme,
    /For other feature combinations, use `generateOxlintConfigByFeatures`/u,
  );
});
