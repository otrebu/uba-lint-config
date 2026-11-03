import { generateOxlintConfig } from "@u-b/lint-config/oxlint";
// Why: JS-plugin rules do not appear in --print-config; only real lint runs verify them.
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { before, describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const oxlintBin = path.join(root, "node_modules/.bin/oxlint");
const fixturesDir = path.join(root, "test/fixtures");
const APP_TYPES = ["fullstack", "backendOnly"];

/** @param {import("oxlint").OxlintConfig} config */
function getRuleEntries(config) {
  return [
    ...Object.entries(config.rules ?? {}),
    ...(config.overrides ?? []).flatMap((override) =>
      Object.entries(override.rules ?? {}),
    ),
  ];
}

/** @param {string} rule */
function getPluginPrefix(rule) {
  const slash = rule.lastIndexOf("/");
  return slash === -1 ? "" : rule.slice(0, slash);
}

/** @param {unknown} setting */
function isOff(setting) {
  const severity = Array.isArray(setting) ? setting[0] : setting;
  return severity === "off" || severity === 0;
}

/** @returns {Set<string>} */
function getNativeRuleNames() {
  const rules = JSON.parse(
    execFileSync(oxlintBin, ["--rules", "--format=json"], { encoding: "utf8" }),
  );
  return new Set(
    rules.map(({ scope, value }) =>
      scope === "eslint"
        ? value
        : `${scope.replace("jsx_a11y", "jsx-a11y")}/${value}`,
    ),
  );
}

/**
 * @param {import("oxlint").OxlintConfig} config
 * @returns {Promise<Map<string, Set<string>>>}
 */
async function getJsPluginRuleNames(config) {
  const plugins = new Map();
  for (const { name, specifier } of config.jsPlugins ?? []) {
    const plugin = (await import(specifier)).default;
    plugins.set(name, new Set(Object.keys(plugin.rules)));
  }
  return plugins;
}

describe("generated config", () => {
  for (const appType of APP_TYPES) {
    describe(appType, () => {
      const config = generateOxlintConfig({ appType });

      it("names only rules that oxlint or a loaded JS plugin has", async () => {
        const nativeRules = getNativeRuleNames();
        const jsPluginRules = await getJsPluginRuleNames(config);
        const guardRules =
          config.rules["uba/no-guard-disable"]?.[1]?.rules ?? [];
        const unknown = [
          ...getRuleEntries(config).map(([rule]) => rule),
          ...guardRules,
        ].filter((rule) => {
          const pluginRules = jsPluginRules.get(getPluginPrefix(rule));
          if (pluginRules) {
            return !pluginRules.has(
              rule.slice(getPluginPrefix(rule).length + 1),
            );
          }
          return !nativeRules.has(rule) && !guardRules.includes(rule);
        });
        assert.deepEqual(unknown, []);
      });

      it("lists the plugin of every native rule it turns on", () => {
        const jsPluginNames = new Set(config.jsPlugins.map(({ name }) => name));
        const plugins = new Set(config.plugins);
        const inert = getRuleEntries(config)
          .map(([rule]) => getPluginPrefix(rule))
          .filter(
            (prefix) =>
              prefix !== "" &&
              !plugins.has(prefix) &&
              !jsPluginNames.has(prefix),
          );
        assert.deepEqual([...new Set(inert)], []);
      });

      it("keeps the policies", () => {
        assert.equal(config.options.denyWarnings, true);
        assert.deepEqual(config.rules.complexity, ["error", { max: 15 }]);
        assert.equal(config.rules["uba/no-class"], "error");
        const warnings = getRuleEntries(config).filter(
          ([, setting]) =>
            (Array.isArray(setting) ? setting[0] : setting) === "warn",
        );
        assert.deepEqual(warnings, []);
      });

      it("turns on none of the dropped rules", () => {
        const droppedRules = JSON.parse(
          readFileSync(path.join(root, "test/dropped-rules.json"), "utf8"),
        );
        const dropped = new Set(
          Object.entries(droppedRules).map(
            ([rule, { oxlint }]) => oxlint ?? rule,
          ),
        );
        const enabled = getRuleEntries(config)
          .filter(([rule, setting]) => dropped.has(rule) && !isOff(setting))
          .map(([rule]) => rule);
        assert.deepEqual(enabled, []);
      });
    });
  }
});

describe("rules fire on fixtures", () => {
  /** @type {Array<{ code: string, filename: string }>} */
  let diagnostics = [];

  before(() => {
    const result = spawnSync(
      oxlintBin,
      [
        "-c",
        "oxlint.config.ts",
        "--ignore-pattern",
        "oxlint.config.ts",
        "-f",
        "json",
        ".",
      ],
      { cwd: fixturesDir, encoding: "utf8" },
    );
    ({ diagnostics } = JSON.parse(result.stdout));
  });

  /**
   * @param {string} file
   * @param {string} code
   */
  function countHits(file, code) {
    return diagnostics.filter(
      (diagnostic) =>
        path.resolve(fixturesDir, diagnostic.filename) ===
          path.resolve(fixturesDir, file) && diagnostic.code === code,
    ).length;
  }

  const expectedHits = [
    ["array-sort.ts", "unicorn(no-array-sort)"],
    ["cast.ts", "typescript(no-unsafe-type-assertion)"],
    ["complexity.ts", "eslint(complexity)"],
    ["cycle-a.ts", "import(no-cycle)"],
    ["disable-reason.ts", "uba(require-disable-reason)"],
    ["leaked-render.tsx", "uba(jsx-no-leaked-render)"],
    ["purity.tsx", "react(purity)"],
    ["query.tsx", "@tanstack/query(exhaustive-deps)"],
    ["regexp.ts", "regexp(no-super-linear-backtracking)"],
    ["restricted-syntax.ts", "eslint-js(no-restricted-syntax)"],
    ["rtl.test.tsx", "testing-library(no-debugging-utils)"],
    ["snapshot.test.ts", "vitest(no-restricted-matchers)"],
    ["switch.ts", "typescript(switch-exhaustiveness-check)"],
    ["throw.ts", "typescript(only-throw-error)"],
    ["ts-nocheck.ts", "typescript(ban-ts-comment)"],
    ["why-comments.ts", "uba(why-comments)"],
    ["module-types/ts/ts-nocheck.ts", "typescript(ban-ts-comment)"],
    ["module-types/tsx/ts-nocheck.tsx", "typescript(ban-ts-comment)"],
    ["module-types/mts/ts-nocheck.mts", "typescript(ban-ts-comment)"],
    ["module-types/cts/ts-nocheck.cts", "typescript(ban-ts-comment)"],
    ["module-types/ts/floating-promise.ts", "typescript(no-floating-promises)"],
    [
      "module-types/tsx/floating-promise.tsx",
      "typescript(no-floating-promises)",
    ],
    [
      "module-types/mts/floating-promise.mts",
      "typescript(no-floating-promises)",
    ],
    [
      "module-types/cts/floating-promise.cts",
      "typescript(no-floating-promises)",
    ],
  ];
  for (const [file, code] of expectedHits) {
    it(`${code} fires in ${file}`, () => {
      assert.ok(countHits(file, code) > 0);
    });
  }

  it("allows classes that extend Error", () => {
    assert.equal(countHits("no-class.ts", "uba(no-class)"), 1);
  });

  it("rejects disabling guard rules by their native or ESLint names", () => {
    assert.equal(countHits("guard-disable.ts", "uba(no-guard-disable)"), 3);
  });
});
