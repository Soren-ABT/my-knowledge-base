import { visit } from "unist-util-visit";

const GITHUB_ALERT_RE = /^\s*\[!(?<type>\w+)\]\s*$/;
const GITHUB_ALERT_TYPES = ["NOTE", "TIP", "IMPORTANT", "WARNING", "CAUTION"];
const TYPE_MAP = {
  NOTE: "note",
  TIP: "tip",
  IMPORTANT: "important",
  WARNING: "warning",
  CAUTION: "caution",
};

export function remarkFixGithubAdmonitions() {
  return (tree) => {
    visit(tree, "blockquote", (node, index, parent) => {
      if (!parent || index === undefined) return;

      const firstChild = node.children[0];
      if (firstChild?.type !== "paragraph") return;

      const firstText = firstChild.children[0];
      if (firstText?.type !== "text") return;

      const firstLine = firstText.value.split("\n")[0];
      const match = firstLine.match(GITHUB_ALERT_RE);
      const type = match?.groups?.type?.toUpperCase();
      if (!GITHUB_ALERT_TYPES.includes(type)) return;

      const directiveName = TYPE_MAP[type];
      if (!directiveName) return;

      const textChildren =
        firstText.value.split("\n").length > 1
          ? [{ type: "text", value: firstText.value.split("\n").slice(1).join("\n") }]
          : [];

      const paragraphChildren = [...textChildren, ...firstChild.children.slice(1)];

      parent.children[index] = {
        type: "containerDirective",
        name: directiveName,
        children: [
          ...(paragraphChildren.length > 0 ? [{ type: "paragraph", children: paragraphChildren }] : []),
          ...node.children.slice(1),
        ],
      };
    });
  };
}
