import { visit } from "unist-util-visit";

/**
 * Runs AFTER remark-math. Rewrites math node data so mdast-util-to-hast
 * renders display math as <p class="math-display">$$...$$</p> and
 * inline math as <span class="math-inline">$...$</span> — raw delimiters
 * that client-side MathJax can process.
 */
export function remarkMathRestore() {
  return (tree) => {
    visit(tree, "math", (node) => {
      node.data = {
        hName: "p",
        hProperties: { className: ["math-display"] },
        hChildren: [
          { type: "text", value: `$$\n${node.value}\n$$` },
        ],
      };
    });

    visit(tree, "inlineMath", (node) => {
      node.data = {
        hName: "span",
        hProperties: { className: ["math-inline"] },
        hChildren: [
          { type: "text", value: `$${node.value}$` },
        ],
      };
    });
  };
}
