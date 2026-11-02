# uba-lint-config

Shared [oxlint](https://oxc.rs/docs/guide/usage/linter.html) and [oxfmt](https://oxc.rs/docs/guide/usage/formatter.html) configuration for TypeScript, React and Node projects.

## Install

```bash
pnpm add -D uba-lint-config oxlint oxfmt oxlint-tsgolint
```

`oxlint-tsgolint` runs the type-aware rules. It brings its own TypeScript 7 and needs no `typescript` package.

The package needs Node 22.13+ or 24+.

## oxlint

Create `oxlint.config.ts` at the repo root:

```ts
import { defineConfig } from "oxlint";
import { generateOxlintConfig } from "uba-lint-config/oxlint";

const base = generateOxlintConfig({ appType: "fullstack" });

// Why: extends drops env, so the generated config must be spread.
export default defineConfig({
  ...base,
  ignorePatterns: ["**/generated/**"],
  overrides: [
    ...base.overrides,
    { files: ["**/*.test.ts"], rules: { "no-console": "off" } },
  ],
});
```

Options of `generateOxlintConfig`:

| Option                   | Default       | Effect                                                                                                                                                                                                            |
| ------------------------ | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `appType`                | `"fullstack"` | `"fullstack"` adds React, jsx-a11y, TanStack Query and Router, and browser globals. `"backendOnly"` leaves them out                                                                                               |
| `shouldEnableTypescript` | `true`        | TypeScript rules and type-aware linting (`options.typeAware`)                                                                                                                                                     |
| `shouldEnableJsPlugins`  | `true`        | ESLint plugins that oxlint runs as JS plugins (alpha): this package's own `uba` plugin, `regexp` and `eslint-js` (both app types), TanStack and Testing Library (`fullstack`). `false` gives a native-only config |
| `shouldEnableStorybook`  | `false`       | Storybook rules for `fullstack` only. Requires `shouldEnableJsPlugins: true`, `eslint-plugin-storybook` and `storybook`                                                                                           |
| `shouldEnableCypress`    | `false`       | Cypress plugin, env and globals for `fullstack`. No Cypress rule is on; add the ones you want in an override                                                                                                      |
| `shouldDenyWarnings`     | `true`        | Warnings fail the run, so local runs and CI give the same result                                                                                                                                                  |

Storybook linting is off by default. Projects on an older Storybook can leave it off without installing the optional peers. To enable it, install `eslint-plugin-storybook@^10.2.8` and `storybook@^10.2.8`.

For other feature combinations, use `generateOxlintConfigByFeatures` with `shouldEnableStorybook: true` and `shouldEnableJsPlugins: true`.

`generateOxlintConfigByFeatures` takes individual feature flags.

Its flags are `shouldEnableA11y`, `shouldEnableBrowserGlobals`, `shouldEnableCypress`, `shouldEnableJsPlugins`, `shouldEnableNodeGlobals`, `shouldEnableQuery`, `shouldEnableReact`, `shouldEnableRouter`, `shouldEnableStorybook`, `shouldEnableTypescript`, `shouldEnableVitest` and `shouldDenyWarnings`. They default to `false`, except `shouldEnableJsPlugins`, `shouldEnableTypescript` and `shouldDenyWarnings`, which default to `true`. Cypress, Query, Router and Storybook require JS plugins. React and Vitest together also load Testing Library when JS plugins are enabled.

TypeScript policies cover `.ts`, `.tsx`, `.mts` and `.cts`. General TypeScript feature globs include all four extensions; JSX-specific checks target `.tsx` and `.jsx`.

`import/no-cycle` is on globally for all JS and TS module extensions, regardless of `shouldEnableTypescript`. Its native analysis checks ESM import cycles; CommonJS `require()` cycles are not covered.

### Import alias

No alias rule is on by default, because only the project knows where `@/` resolves. To require `@/` over deep relative imports, add an override for the folders that have the alias:

```ts
{
  files: ["apps/web/src/**"],
  excludeFiles: ["**/*.test.*", "**/__tests__/**"],
  rules: {
    "no-restricted-imports": ["error", { patterns: [
      { regex: "^(\\.\\./){2,}", message: "Use the @/ alias instead of ../../ imports." },
    ] }],
  },
}
```

It flags `../../` and deeper, in `import` and `export … from`. An override replaces the rule's options, so put any other `no-restricted-imports` entries for those files in the same lists. Tests are left out because they often import config from outside `src`.

### Banned code patterns

`eslint-js/no-restricted-syntax` bans a shape of code: you write a selector over the syntax tree and a message. oxlint has no native version, so the package loads ESLint's own rule through the official `oxlint-plugin-eslint`. No pattern is on by default:

```ts
{
  files: ["apps/server/src/**"],
  rules: {
    "eslint-js/no-restricted-syntax": ["error", {
      selector: "TSEnumDeclaration",
      message: "Use a union of string literals instead of an enum.",
    }],
  },
}
```

An override replaces the whole list, so give each folder one list with all its patterns. The rule is a guard rule (see below): an exception is an override, not a disable comment.

### Why comments

`uba/why-comments` requires comments to explain a reason as `Why: <reason>`: capital W, colon, one space, then text. It runs in source and test files for both app types when JS plugins are enabled. In an adjacent run of `//` comments, only the first needs the prefix; blank lines or intervening code end the run. For block, JSDoc and JSX comments, the first non-empty line after any leading `*` needs the prefix. Prose JSDoc follows the same rule; API descriptions belong in this README.

Tool directives and pragmas keep their own syntax:

- `eslint-disable`, `eslint-disable-line`, `eslint-disable-next-line`, `eslint-enable`, and their `oxlint-` equivalents;
- `@ts-expect-error`, `@ts-ignore`, `@ts-check`, `@ts-nocheck`, `/// <reference ... />`, and `@vitest-environment`;
- `#__PURE__`, `@__PURE__`, `@vite-ignore`, and `webpack*` magic comments;
- `c8 ignore`, `v8 ignore`, `istanbul ignore`, `oxfmt-ignore`, and `prettier-ignore`;
- `@jsx`, `@jsxImportSource`, `@jsxRuntime`, and `@jsxFrag`.

These exceptions do not change the other rules: for example, `@ts-nocheck` is still banned.

In `.js`, `.mjs` and `.cjs` files, JSDoc containing only type tags needs no prefix: `@type`, `@typedef`, `@param`, `@returns`, `@template`, `@import`, `@satisfies`, `@property`, `@callback` and `@overload`. Descriptions, including `- text` after a tag, are prose and need `Why:`. This type-only exception does not apply to TypeScript or JSX files.

For a codebase that is not clean yet, override the rule at the top level of the config:

```ts
export default defineConfig({
  ...base,
  rules: { ...base.rules, "uba/why-comments": "off" },
});
```

It is a guard rule, so a disable comment cannot turn it off.

### Disable comments

Two rules in this package's `uba` plugin check disable comments:

- `uba/no-guard-disable` rejects a disable comment for a guard rule: import cycles and import bans, banned code patterns, exhaustive switches, floating promises, the hooks rules, `complexity` and a few more (`GUARD_RULES` in `oxlint/js-plugins/uba.js`). It also matches the ESLint names, such as `@typescript-eslint/no-floating-promises`. For a real exception, add an override for that file in your config, so the exception is reviewed with the config.
- `uba/require-disable-reason` asks for ` -- <reason>` on every other disable comment. It is off in test files.

With JS plugins enabled, a directive naming `uba/no-guard-disable`, or a blanket directive disabling all rules, causes a fatal plugin error and a non-zero oxlint exit. This applies to block, same-line and next-line directives, including separate blocks, with either the `eslint-` or `oxlint-` prefix. Such comments cannot silence the check itself. Ordinary rules still accept disable comments with a reason; use a reviewed config override for guard exceptions.

oxlint also loads config files it finds in subfolders, and such a file can turn rules off there. Run oxlint with `--disable-nested-config` in every script and hook.

### Rules left off

[`test/dropped-rules.json`](./test/dropped-rules.json) in the source repository lists the rules this package leaves off on purpose, with the reason for each and any alternative check. The tests check that none of them is turned on by default. Read the entry before you turn a rule on.

## oxfmt

Create `oxfmt.config.ts`:

```ts
import { defineConfig } from "oxfmt";
import { generateOxfmtConfig } from "uba-lint-config/oxfmt";

export default defineConfig(generateOxfmtConfig({ appType: "fullstack" }));
```

The formatter uses `printWidth` 80, trailing commas and double quotes. It also:

- sorts imports with the same groups as perfectionist's `sort-imports`;
- sorts `package.json` keys;
- sorts Tailwind classes for `fullstack`. Pass `tailwindStylesheet` for Tailwind v4 theme classes.

## Agent guide

Some conventions are left to the agent guide instead of a lint rule. Copy the list in [AGENTS.md](./AGENTS.md) into your repo's `AGENTS.md` or `CLAUDE.md`. The package ships the file.

## Tests

`pnpm test` checks that every rule in the generated configs exists, that the policies hold (errors only, `complexity` 15, warnings denied, no dropped rule on), and that the key rules fire on the files in `test/fixtures`. Run it after every oxlint upgrade: JS-plugin rules never appear in `oxlint --print-config`, so only a real run shows that they still load.

## Design choices

- Rules use `error`, and warnings fail the run by default (`shouldDenyWarnings`). Only the opt-in Storybook rules use `warn`.
- `import/no-cycle` runs on every lint pass. Import aliases and banned code patterns belong in project overrides (see [Import alias](#import-alias) and [Banned code patterns](#banned-code-patterns)).
- `complexity` is at most 15 and `max-params` is 4. Guard rules require a reviewed config override for exceptions (see [Disable comments](#disable-comments)).
- `// @ts-nocheck` is banned. Outside test files, `typescript/no-unsafe-type-assertion` prevents casts that narrow a type: parse incoming data with a schema validator, then narrow with checks.
- `typescript/switch-exhaustiveness-check` requires every union member, even with a `default`. `typescript/no-deprecated` catches deprecated APIs.
- React hooks rules and compiler checks that work without the compiler are on. `uba/jsx-no-leaked-render` catches values that can leak into JSX.
- `uba/no-class` permits only `Error` subclasses outside tests. Function naming conventions live in [AGENTS.md](./AGENTS.md).
- Vitest rules cover `*.test.ts` and `*.test.tsx`. Snapshot matchers are banned so each test states its expected value. Testing Library rules check component tests for misuse.
- Regex checks catch invalid patterns and backtracking hazards. Style rules and checks already covered by TypeScript or the formatter are left off (see [Rules left off](#rules-left-off)).
- `no-unused-vars` removes unused imports on `--fix` and allows names starting with `_`. Array rules prefer `toSorted()` and `toReversed()` to in-place mutation.
- The native `sort-imports` rule sorts named imports; oxfmt sorts import lines, `package.json` and Tailwind classes. Unions, interfaces, JSX props and switch cases keep their written order.

## License

MIT
