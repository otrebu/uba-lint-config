const SNAPSHOT_MESSAGE =
  "Use explicit assertions (toEqual, toMatchObject) so the expected value stays in the test.";

/** @type {import("../types.js").OxlintFragment} */
const vitestRules = {
  overrides: [
    {
      env: { vitest: true },
      files: [
        "tests/**",
        "**/*.test.ts",
        "**/*.test.tsx",
        "**/*.test.mts",
        "**/*.test.cts",
        "**/*.test.js",
      ],
      rules: {
        // Why: test mocks may be placed before the imports they replace.
        "import/first": "off",
        // Why: tests throw non-Error values to check error handling.
        "typescript/only-throw-error": "off",
        "vitest/expect-expect": [
          "error",
          {
            assertFunctionNames: [
              "assert",
              "assert*",
              "expect",
              "expect*",
              "verify*",
            ],
          },
        ],
        "vitest/max-nested-describe": ["error", { max: 3 }],
        "vitest/no-commented-out-tests": "error",
        "vitest/no-disabled-tests": "error",
        "vitest/no-focused-tests": "error",
        "vitest/no-identical-title": "error",
        "vitest/no-import-node-test": "error",
        "vitest/no-interpolation-in-snapshots": "error",
        // Why: snapshots let a test pass without stating the expected value.
        "vitest/no-restricted-matchers": [
          "error",
          {
            toMatchInlineSnapshot: SNAPSHOT_MESSAGE,
            toMatchSnapshot: SNAPSHOT_MESSAGE,
            toThrowErrorMatchingInlineSnapshot: SNAPSHOT_MESSAGE,
            toThrowErrorMatchingSnapshot: SNAPSHOT_MESSAGE,
          },
        ],
        "vitest/no-standalone-expect": [
          "error",
          {
            additionalTestBlockFunctions: [
              "afterAll",
              "afterEach",
              "beforeAll",
              "beforeEach",
            ],
          },
        ],
        "vitest/no-unneeded-async-expect-function": "error",
        "vitest/prefer-called-exactly-once-with": "error",
        "vitest/require-local-test-context-for-concurrent-snapshots": "error",
        "vitest/valid-describe-callback": "error",
        "vitest/valid-expect": "error",
        "vitest/valid-expect-in-promise": "error",
        "vitest/valid-title": "error",
      },
    },
  ],
  plugins: ["vitest"],
  // Why: without typecheck mode, valid-title rejects describe(someVariable).
  settings: { vitest: { typecheck: true } },
};

export default vitestRules;
