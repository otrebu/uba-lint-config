import whyCommentsRule from "./why-comments.js";

/** @type {import("eslint").Rule.RuleModule} */
const noClassRule = {
  create(context) {
    /** @param {import("estree").ClassDeclaration | import("estree").ClassExpression} node */
    function reportClass(node) {
      if (
        node.superClass?.type === "Identifier" &&
        node.superClass.name === "Error"
      ) {
        return;
      }
      context.report({ messageId: "avoidClass", node });
    }

    return { ClassDeclaration: reportClass, ClassExpression: reportClass };
  },
  meta: {
    docs: { description: "Avoid classes, except classes that extend Error" },
    messages: {
      avoidClass: "Avoid classes (except for those extending Error)",
    },
    schema: [],
    type: "suggestion",
  },
};

// Why: oxlint lacks jsx-no-leaked-render, so this port retains eslint-plugin-react
// 7.37.5's default checks. The upstream MIT notice is in THIRD_PARTY_NOTICES.
const COERCED_TYPES = new Set([
  "BinaryExpression",
  "CallExpression",
  "UnaryExpression",
]);

/** @param {import("estree").Expression} node */
function isCoerced(node) {
  if (node.type === "LogicalExpression") {
    return isCoerced(node.left) && isCoerced(node.right);
  }
  return COERCED_TYPES.has(node.type);
}

/**
 * @param {import("eslint").Scope.Scope | null} scope
 * @param {string} name
 */
function findVariable(scope, name) {
  for (let current = scope; current; current = current.upper) {
    const variable = current.set.get(name);
    if (variable) {
      return variable;
    }
  }
  return null;
}

/**
 * @param {import("eslint").Rule.RuleContext} context
 * @param {import("estree").Expression} node
 */
function isBooleanConstant(context, node) {
  if (node.type !== "Identifier") {
    return false;
  }
  const variable = findVariable(context.sourceCode.getScope(node), node.name);
  const init = variable?.defs[0]?.node.init;
  return init?.type === "Literal" && typeof init.value === "boolean";
}

/** @param {import("estree").Expression} node */
function stripDoubleNegation(node) {
  if (
    node.type === "UnaryExpression" &&
    node.argument.type === "UnaryExpression"
  ) {
    return stripDoubleNegation(node.argument.argument);
  }
  return node;
}

const PRIMARY_EXPRESSION_TYPES = new Set([
  "ArrayExpression",
  "ClassExpression",
  "FunctionExpression",
  "Identifier",
  "JSXElement",
  "JSXFragment",
  "Literal",
  "MetaProperty",
  "ObjectExpression",
  "TemplateLiteral",
  "ThisExpression",
]);

/**
 * @param {import("eslint").Rule.RuleContext} context
 * @param {import("estree").Expression} node
 */
function getGroupedExpressionText(context, node) {
  const text = context.sourceCode.getText(node);
  return PRIMARY_EXPRESSION_TYPES.has(node.type) ? text : `(${text})`;
}

/** @type {import("eslint").Rule.RuleModule} */
const jsxNoLeakedRenderRule = {
  create(context) {
    return {
      /** @param {import("estree").LogicalExpression} node */
      'JSXExpressionContainer > LogicalExpression[operator="&&"]'(node) {
        const { left, right } = node;
        if (isCoerced(left) || isBooleanConstant(context, left)) {
          return;
        }
        // Why: React 18+ renders an empty string as nothing, so it cannot leak.
        if (left.type === "Literal" && left.value === "") {
          return;
        }
        context.report({
          fix: (fixer) => {
            const leftText = getGroupedExpressionText(
              context,
              stripDoubleNegation(left),
            );
            const rightText = getGroupedExpressionText(context, right);
            return fixer.replaceText(node, `${leftText} ? ${rightText} : null`);
          },
          messageId: "leakedRender",
          node,
        });
      },
    };
  },
  meta: {
    docs: {
      description:
        "Disallow `&&` in JSX when the left side can render a value such as 0",
    },
    fixable: "code",
    messages: {
      leakedRender:
        "Potential leaked value that might cause unintentionally rendered values or rendering crashes",
    },
    schema: [],
    type: "problem",
  },
};

const DISABLE_DIRECTIVE =
  /^\p{White_Space}*(?:eslint|oxlint)-disable(?:-next-line|-line)?(?=\p{White_Space}|$)/u;
const REASON_SEPARATOR = /\p{White_Space}--(?:\p{White_Space}|$)/u;

// Why: consumers may use ESLint names in directives; oxlint uses its own names.
const RULE_PREFIX_ALIASES = [
  ["@typescript-eslint/", "typescript/"],
  ["react-hooks/", "react/"],
  ["import-x/", "import/"],
  ["eslint/", ""],
];

/** @param {string} name */
function normalizeRuleName(name) {
  const alias = RULE_PREFIX_ALIASES.find(([prefix]) => name.startsWith(prefix));
  return alias ? alias[1] + name.slice(alias[0].length) : name;
}

/**
 * @param {string} text
 * @returns {{ reason: string, rules: string[] } | null}
 */
function parseDisableDirective(text) {
  const match = DISABLE_DIRECTIVE.exec(text);
  if (!match) {
    return null;
  }
  const [head, ...reasonParts] = text
    .slice(match[0].length)
    .split(REASON_SEPARATOR);
  return {
    reason: reasonParts.join(" -- ").trim(),
    // Why: oxlint accepts commas and Unicode whitespace, including U+0085.
    rules: head.split(/[,\p{White_Space}]+/u).filter(Boolean),
  };
}

/**
 * @param {import("eslint").Rule.RuleContext} context
 * @param {(comment: import("estree").Comment, directive: { reason: string, rules: string[] }) => void} report
 */
function forEachDisableDirective(context, report) {
  for (const comment of context.sourceCode.getAllComments()) {
    const directive = parseDisableDirective(comment.value);
    if (directive) {
      report(comment, directive);
    }
  }
}

/** @type {import("eslint").Rule.RuleModule} */
const noGuardDisableRule = {
  create(context) {
    const guardedRules = new Set(
      (context.options[0]?.rules ?? []).map((name) => normalizeRuleName(name)),
    );
    return {
      Program() {
        forEachDisableDirective(context, (comment, directive) => {
          // Why: fatal plugin errors escape disable ranges, so self and blanket
          // disables cannot silence guard validation.
          if (
            directive.rules.length === 0 ||
            directive.rules.some(
              (rule) => normalizeRuleName(rule) === "uba/no-guard-disable",
            )
          ) {
            throw new Error(
              "uba/no-guard-disable: guard validation cannot be disabled by a comment. Name individual rules, or add a reviewed config override.",
            );
          }
          for (const rule of directive.rules) {
            if (guardedRules.has(normalizeRuleName(rule))) {
              context.report({
                data: { rule },
                loc: comment.loc,
                messageId: "guardedRule",
              });
            }
          }
        });
      },
    };
  },
  meta: {
    docs: {
      description:
        "Disallow disable comments for guard rules; exceptions go in a reviewed config override",
    },
    messages: {
      guardedRule:
        "{{rule}} is a guard rule and cannot be disabled with a comment. Fix the code, or add a reviewed override for this file in the lint config.",
    },
    schema: [
      {
        additionalProperties: false,
        properties: { rules: { items: { type: "string" }, type: "array" } },
        type: "object",
      },
    ],
    type: "problem",
  },
};

/** @type {import("eslint").Rule.RuleModule} */
const requireDisableReasonRule = {
  create(context) {
    return {
      Program() {
        forEachDisableDirective(context, (comment, directive) => {
          if (directive.reason === "") {
            context.report({ loc: comment.loc, messageId: "missingReason" });
          }
        });
      },
    };
  },
  meta: {
    docs: { description: "Require a reason on every disable comment" },
    messages: {
      missingReason:
        "Say why the rule does not apply here: add ` -- <reason>` after the rule names.",
    },
    schema: [],
    type: "suggestion",
  },
};

const ubaPlugin = {
  meta: { name: "uba" },
  rules: {
    "jsx-no-leaked-render": jsxNoLeakedRenderRule,
    "no-class": noClassRule,
    "no-guard-disable": noGuardDisableRule,
    "require-disable-reason": requireDisableReasonRule,
    "why-comments": whyCommentsRule,
  },
};

export default ubaPlugin;
