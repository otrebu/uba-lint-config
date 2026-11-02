import { isToolDirective } from "./comment-directives.js";

/** @param {import("estree").Comment} comment */
function getCommentLines(comment) {
  return comment.value
    .split(/\r?\n/u)
    .map((line) =>
      comment.type === "Block"
        ? line
            .trim()
            .replace(/^\*+\s?/u, "")
            .trim()
        : line.trim(),
    )
    .filter(Boolean);
}

/**
 * @param {import("eslint").SourceCode} sourceCode
 * @param {import("estree").Comment | undefined} previous
 * @param {import("estree").Comment} current
 */
function isLineContinuation(sourceCode, previous, current) {
  // Why: unrelated inline comments must not borrow another comment's reason.
  return (
    previous?.type === "Line" &&
    current.type === "Line" &&
    previous.loc.end.line + 1 === current.loc.start.line &&
    /^\s*$/u.test(sourceCode.text.slice(previous.range[1], current.range[0]))
  );
}

const TYPE_TAGS = new Set(["type", "returns", "satisfies"]);
const NAMED_TYPE_TAGS = new Set(["param", "property"]);
const QUOTES = new Set(['"', "'", "`"]);
const TYPE_NAME = /^[$\p{ID_Start}][.$\p{ID_Continue}]*$/u;
const IDENTIFIER = /^[$_\p{ID_Start}][$\u200c\u200d\p{ID_Continue}]*$/u;
const OPENING_DELIMITERS = new Set(["{", "[", "("]);
const CLOSING_DELIMITERS = new Set(["}", "]", ")"]);

/** @param {string} text */
function splitJsdocTags(text) {
  const tags = [];
  let start = 0;
  let depth = 0;
  let quote = "";
  // Why: inline tags count too, but @ inside types, defaults and strings is data.
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quote) {
      if (character === "\\") {
        index += 1;
      } else if (character === quote) {
        quote = "";
      }
      continue;
    }
    if (QUOTES.has(character)) {
      quote = character;
    } else if (OPENING_DELIMITERS.has(character)) {
      depth += 1;
    } else if (CLOSING_DELIMITERS.has(character)) {
      depth -= 1;
    } else if (
      character === "@" &&
      depth === 0 &&
      index > 0 &&
      /\s/u.test(text[index - 1])
    ) {
      tags.push(text.slice(start, index).trim());
      start = index;
    }
  }
  tags.push(text.slice(start).trim());
  return tags;
}

/** @param {string} text */
function isIdentifier(text) {
  const decoded = text.replaceAll(
    /\\u(?<point>\{[\dA-Fa-f]{1,6}\}|[\dA-Fa-f]{4})/gu,
    (escape, point) => {
      const codePoint = Number.parseInt(point.replaceAll(/[{}]/gu, ""), 16);
      return codePoint <= 0x10_ff_ff ? String.fromCodePoint(codePoint) : escape;
    },
  );
  return IDENTIFIER.test(decoded);
}

/** @param {string} bindings */
function isImportBindings(bindings) {
  const comma = bindings.indexOf(",");
  if (comma !== -1 && !bindings.startsWith("{")) {
    const defaultName = bindings.slice(0, comma).trim();
    const remainingBindings = bindings.slice(comma + 1).trim();
    return (
      isIdentifier(defaultName) &&
      (remainingBindings.startsWith("{") ||
        remainingBindings.startsWith("*")) &&
      isImportBindings(remainingBindings)
    );
  }
  if (bindings.startsWith("{") && bindings.endsWith("}")) {
    const names = bindings.slice(1, -1).trim().split(",");
    if (names.at(-1)?.trim() === "") {
      names.pop();
    }
    return names.every((name) => {
      const aliases = name.trim().split(/\s+as\s+/u);
      return (
        aliases.length <= 2 && aliases.every((alias) => isIdentifier(alias))
      );
    });
  }
  return isIdentifier(bindings.replace(/^\*\s+as\s+/u, ""));
}

/** @param {string} body */
function isTypeImport(body) {
  const parts = body.split(/\s+from\s+(?=["'])/u);
  return (
    parts.length === 2 &&
    isImportBindings(parts[0]) &&
    /^(?:"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*');?$/u.test(parts[1])
  );
}

/**
 * @param {string} text
 * @param {string} opening
 * @param {string} closing
 */
function getDelimitedSuffix(text, opening, closing) {
  if (!text.startsWith(opening)) {
    return null;
  }
  let depth = 0;
  let quote = "";
  // Why: nested types or defaults and quoted delimiters must not hide trailing prose.
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quote) {
      if (character === "\\") {
        index += 1;
      } else if (character === quote) {
        quote = "";
      }
    } else if (QUOTES.has(character)) {
      quote = character;
    } else if (character === opening) {
      depth += 1;
    } else if (character === closing) {
      depth -= 1;
      if (depth === 0) {
        return text.slice(index + 1).trim();
      }
    }
  }
  return null;
}

/** @param {string} text */
function getTypeSuffix(text) {
  return getDelimitedSuffix(text, "{", "}");
}

/** @param {string} text */
function isTypeName(text) {
  if (TYPE_NAME.test(text)) {
    return true;
  }
  if (getDelimitedSuffix(text, "[", "]") !== "") {
    return false;
  }
  const [name] = text.slice(1, -1).split("=");
  return TYPE_NAME.test(name.trim());
}

/** @param {string} body */
function isTemplateTypeBody(body) {
  const names = body.startsWith("{") ? getTypeSuffix(body) : body;
  return (
    names !== null && names.split(",").every((name) => isTypeName(name.trim()))
  );
}

/** @param {string} text */
function isTypeOnlyTag(text) {
  const match = /^@(?<tag>\w+)(?=\s|$)/u.exec(text);
  if (!match?.groups) {
    return false;
  }
  const { tag } = match.groups;
  const body = text.slice(match[0].length).trim();
  if (TYPE_TAGS.has(tag)) {
    return getTypeSuffix(body) === "";
  }
  if (NAMED_TYPE_TAGS.has(tag)) {
    const name = getTypeSuffix(body);
    return name !== null && isTypeName(name);
  }
  if (tag === "typedef") {
    const name = body.startsWith("{") ? getTypeSuffix(body) : body;
    return name !== null && (name === "" || isTypeName(name));
  }
  if (tag === "template") {
    return isTemplateTypeBody(body);
  }
  if (tag === "import") {
    return isTypeImport(body);
  }
  if (tag === "callback") {
    return isTypeName(body);
  }
  return tag === "overload" && body === "";
}

/**
 * @param {import("eslint").Rule.RuleContext} context
 * @param {import("estree").Comment} comment
 * @param {Array<string>} lines
 */
function isTypeOnlyJsdoc(context, comment, lines) {
  return (
    comment.type === "Block" &&
    /\.(?:js|mjs|cjs)$/u.test(context.filename) &&
    context.sourceCode.text.startsWith("/**", comment.range[0]) &&
    splitJsdocTags(lines.join("\n")).every((tag) => isTypeOnlyTag(tag))
  );
}

/** @type {import("eslint").Rule.RuleModule} */
const whyCommentsRule = {
  create(context) {
    return {
      Program() {
        let previous;
        let isWhyRun = false;
        for (const comment of context.sourceCode.getAllComments()) {
          const lines = getCommentLines(comment);
          const [firstLine = ""] = lines;
          const isWhyComment = /^Why: \S/u.test(firstLine);
          const isContinuation =
            isWhyRun &&
            isLineContinuation(context.sourceCode, previous, comment);
          isWhyRun =
            comment.type === "Line" && (isWhyComment || isContinuation);
          previous = comment;
          if (
            !isWhyComment &&
            !isContinuation &&
            !isToolDirective(comment, lines) &&
            !isTypeOnlyJsdoc(context, comment, lines)
          ) {
            context.report({ loc: comment.loc, messageId: "explainWhy" });
          }
        }
      },
    };
  },
  meta: {
    docs: { description: "Require comments to explain why with a Why: prefix" },
    messages: {
      explainWhy:
        "Comments explain why. Start with `Why: `. Put the what in names, types and tests.",
    },
    schema: [],
    type: "suggestion",
  },
};

export default whyCommentsRule;
