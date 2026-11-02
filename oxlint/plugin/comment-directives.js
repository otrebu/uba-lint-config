const STRING_VALUE = String.raw`(?:"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')`;
const REGEXP_VALUE = String.raw`/(?:\\.|[^\\/[\r\n]|\[(?:\\.|[^\\\]\r\n])*\])*/[dgimsuvy]*`;
const ARRAY_VALUE = String.raw`\[(?:\s*${STRING_VALUE}\s*,)*\s*(?:${STRING_VALUE}\s*)?\]`;
const NUMBER_VALUE = String.raw`-?\d+(?:\.\d+)?`;
const WEBPACK_VALUES = new Map(
  [
    ["ChunkName", STRING_VALUE],
    ["Mode", STRING_VALUE],
    ["FetchPriority", STRING_VALUE],
    ["Ignore", "(?:true|false)"],
    ["Prefetch", `(?:true|false|${NUMBER_VALUE})`],
    ["Preload", `(?:true|false|${NUMBER_VALUE})`],
    ["Include", REGEXP_VALUE],
    ["Exclude", REGEXP_VALUE],
    ["Exports", `(?:${STRING_VALUE}|${ARRAY_VALUE})`],
  ].map(([name, pattern]) => [name, new RegExp(`^(?:${pattern})`, "u")]),
);

/** @param {string} text */
function isWebpackDirective(text) {
  let rest = text;
  while (rest) {
    const key = /^webpack(?<name>\w+)\s*:\s*/u.exec(rest);
    if (!key?.groups) {
      return false;
    }
    const valuePattern = WEBPACK_VALUES.get(key.groups.name);
    const value = valuePattern?.exec(rest.slice(key[0].length));
    if (!value) {
      return false;
    }
    rest = rest.slice(key[0].length + value[0].length).trim();
    if (!rest) {
      return true;
    }
    if (!rest.startsWith(",")) {
      return false;
    }
    rest = rest.slice(1).trim();
  }
  return true;
}

/** @param {string} text */
function isLintDirective(text) {
  const command =
    /^(?:eslint|oxlint)-(?:disable(?:-next-line|-line)?|enable)(?=\p{White_Space}|$)/u.exec(
      text,
    );
  if (!command) {
    return false;
  }
  // Why: a -- reason belongs to the directive, even when it spans block lines.
  const [rules] = text
    .slice(command[0].length)
    .split(/\p{White_Space}--(?:\p{White_Space}|$)/u);
  return rules
    .split(/[,\p{White_Space}]+/u)
    .filter(Boolean)
    .every((rule) => /^[\w@/.-]+$/u.test(rule));
}

const SIMPLE_DIRECTIVE =
  /^(?:(?:#|@)__PURE__|@vite-ignore|(?:oxfmt|prettier)-ignore)$/u;
const TS_DIRECTIVE =
  /^@ts-(?:expect-error|ignore|check|nocheck)(?=$|[\t :])[^\r\n\u2028\u2029]*$/u;
const ENVIRONMENT_DIRECTIVE = /^@vitest-environment\s+\S+$/u;
const JSX_DIRECTIVE =
  /^@jsx(?:ImportSource|Frag)?\s+\S+$|^@jsxRuntime\s+(?:automatic|classic)$/u;
const COVERAGE_DIRECTIVE =
  /^(?:(?:c8|v8) ignore (?:next(?:\s+\d+)?|start|stop)|istanbul ignore (?:next|if|else|file))(?:(?:\s+--|:)\s+\S[\s\S]*)?$/u;

/**
 * @param {import("estree").Comment} comment
 * @param {Array<string>} lines
 */
export function isToolDirective(comment, lines) {
  const text = lines.join("\n");
  // Why: a pragma exempts its syntax, not unrelated prose later in the block.
  return (
    isLintDirective(text) ||
    SIMPLE_DIRECTIVE.test(text) ||
    TS_DIRECTIVE.test(text) ||
    ENVIRONMENT_DIRECTIVE.test(text) ||
    COVERAGE_DIRECTIVE.test(text) ||
    (text.startsWith("@jsx") &&
      text
        .split(/\n(?=@jsx)/u)
        .every((pragma) => JSX_DIRECTIVE.test(pragma))) ||
    (text.startsWith("webpack") && isWebpackDirective(text)) ||
    (comment.type === "Line" && /^\/\s*<reference\b[^>]*\/>$/u.test(text))
  );
}
