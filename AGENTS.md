# Agent conventions

Conventions for code linted with @u-b/lint-config: the ones no lint rule checks, and how to respond to the rules that do. They apply to this package's own code too.

If you install this package, copy the list below into your repo's `AGENTS.md` or `CLAUDE.md`.

## Conventions

- Name functions and methods with a leading verb: `loadUser`, not `user`. Predicates start with `is`, `has` or `can`.
- Narrow types with checks, not casts. Parse data that enters the code with a schema validator such as zod; inside the code, narrow with `instanceof` or a type guard.
- Write comments as `Why: <reason>`; use the [README exceptions](./README.md#why-comments) for tool directives and type-only JavaScript JSDoc.
- Fix the code a lint rule flags. If the rule truly does not apply to a line, disable it with the reason: `// eslint-disable-next-line <rule> -- <why>`. Guard rules take no disable comment; propose a reviewed override in the lint config instead.
