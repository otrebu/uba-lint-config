import * as config from "@u-b/lint-config";
import oxfmtConfig, { generateOxfmtConfig } from "@u-b/lint-config/oxfmt";
import oxlintConfig, {
  generateOxlintConfig,
  generateOxlintConfigByFeatures,
} from "@u-b/lint-config/oxlint";
import ubaPlugin from "@u-b/lint-config/oxlint-plugin";
import packageManifest from "@u-b/lint-config/package.json" with { type: "json" };
import assert from "node:assert/strict";
import { describe, it } from "node:test";

describe("public package API", () => {
  it("exposes the same generators and defaults from the root and subpaths", () => {
    assert.equal(config.generateOxlintConfig, generateOxlintConfig);
    assert.equal(
      config.generateOxlintConfigByFeatures,
      generateOxlintConfigByFeatures,
    );
    assert.equal(config.generateOxfmtConfig, generateOxfmtConfig);
    assert.equal(config.ubaOxlintConfig, oxlintConfig);
    assert.equal(config.ubaOxfmtConfig, oxfmtConfig);
    assert.equal(packageManifest.name, "@u-b/lint-config");
  });

  for (const appType of ["fullstack", "backendOnly"]) {
    it(`keeps Storybook opt-in for ${appType}`, () => {
      const generated = generateOxlintConfig({ appType });
      assert.equal(
        generated.jsPlugins.some(({ name }) => name === "storybook"),
        false,
      );
      assert.equal(generated.options.typeAware, true);
    });
  }

  it("supports native-only configs through the feature generator", () => {
    const generated = generateOxlintConfigByFeatures({
      shouldEnableJsPlugins: false,
      shouldEnableStorybook: true,
      shouldEnableTypescript: false,
    });
    assert.deepEqual(generated.jsPlugins, []);
    assert.equal(generated.options.typeAware, false);
    assert.equal(generated.rules["import/no-cycle"], "error");
  });

  it("exposes the standalone plugin with its guard and JSX rules", () => {
    assert.deepEqual(Object.keys(ubaPlugin.rules).toSorted(), [
      "jsx-no-leaked-render",
      "no-class",
      "no-guard-disable",
      "require-disable-reason",
      "why-comments",
    ]);
  });

  it("supports formatter options through the public subpath", () => {
    assert.equal(
      generateOxfmtConfig({ appType: "backendOnly" }).sortTailwindcss,
      false,
    );
    assert.deepEqual(
      generateOxfmtConfig({
        appType: "fullstack",
        tailwindStylesheet: "./src/app.css",
      }).sortTailwindcss,
      { stylesheet: "./src/app.css" },
    );
  });
});
