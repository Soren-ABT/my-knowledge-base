import { visit } from "unist-util-visit";

/**
 * Converts remark-math output back to raw $$...$$ delimiters
 * so client-side MathJax can process them.
 */
export function rehypeMathPassthrough() {
  return (tree) => {
    // Pass 1: Unwrap <pre> / <div> wrappers containing display math <code>
    visit(tree, "element", (node, index, parent) => {
      if (!parent || index === undefined) return;
      if (node.tagName !== "pre" && node.tagName !== "div") return;
      const mathChild = node.children.find(
        (c) =>
          c.type === "element" &&
          c.tagName === "code" &&
          Array.isArray(c.properties?.className) &&
          c.properties.className.includes("math-display")
      );
      if (!mathChild) return;
      const tex = extractText(mathChild);
      parent.children[index] = renderSpan("math-display", `$$\n${tex}\n$$`);
    });

    // Pass 2: Replace inline math <code> with plain-text spans
    visit(tree, "element", (node, index, parent) => {
      if (!parent || index === undefined) return;
      if (node.tagName !== "code") return;
      if (!Array.isArray(node.properties?.className)) return;
      const cls = node.properties.className;
      if (cls.includes("math-inline")) {
        const tex = extractText(node);
        parent.children[index] = renderSpan("math-inline", `$${tex}$`);
      }
      // Catch any display math <code> that slipped through (not inside <pre>)
      if (cls.includes("math-display")) {
        const tex = extractText(node);
        parent.children[index] = renderSpan("math-display", `$$\n${tex}\n$$`);
      }
    });
  };
}

function renderSpan(className, text) {
  return {
    type: "element",
    tagName: "span",
    properties: { class: className },
    children: [{ type: "text", value: text }],
  };
}

function extractText(node) {
  if (node.type === "text") return node.value;
  if (node.children) return node.children.map(extractText).join("");
  return "";
}
