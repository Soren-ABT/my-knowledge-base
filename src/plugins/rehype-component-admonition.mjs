import { h } from "hastscript";

export function AdmonitionComponent(properties, children, type) {
  if (!Array.isArray(children) || children.length === 0) {
    return h("div", { class: "hidden" }, "Invalid admonition directive.");
  }

  let label = null;
  if (properties?.["has-directive-label"]) {
    label = children[0];
    children = children.slice(1);
    label.tagName = "div";
  }

  const icons = {
    note: "&#9432;",
    tip: "&#9889;",
    important: "&#9888;",
    caution: "&#128736;",
    warning: "&#128293;",
  };

  const titles = {
    note: "NOTE",
    tip: "TIP",
    important: "IMPORTANT",
    caution: "CAUTION",
    warning: "WARNING",
  };

  return h("blockquote", { class: `admonition admonition-${type}` }, [
    h("div", { class: "admonition-header" }, [
      h("span", { class: "admonition-icon" }, icons[type] || ""),
      h("span", { class: "admonition-title" }, label ? label : titles[type]),
    ]),
    h("div", { class: "admonition-content" }, children),
  ]);
}
