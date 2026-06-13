import { h } from "hastscript";
import { visit } from "unist-util-visit";

export function rehypeMermaid() {
  return (tree) => {
    visit(tree, "element", (node) => {
      if (node.tagName === "div" && node.properties?.className?.includes("mermaid-container")) {
        const code = node.properties["data-mermaid-code"] || "";
        const id = `mermaid-${Math.random().toString(36).slice(-6)}`;

        node.tagName = "div";
        node.properties = { class: "mermaid-diagram-container" };
        node.children = [
          h("div", { class: "mermaid-wrapper", id }, [
            h("div", { class: "mermaid", "data-mermaid-code": code }, code),
          ]),
        ];
      }
    });
  };
}
