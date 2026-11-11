// A tiny helper to build DOM elements. Text always goes through text
// nodes, so the data of a student can never become HTML.

export function h(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props ?? {})) {
    if (value === undefined || value === null || value === false) continue;
    if (key === "class") node.className = value;
    else if (key === "dataset") Object.assign(node.dataset, value);
    else if (key.startsWith("on") && typeof value === "function") node.addEventListener(key.slice(2).toLowerCase(), value);
    else if (key === "value") node.value = value;
    else if (key === "checked") node.checked = Boolean(value);
    else node.setAttribute(key, value === true ? "" : String(value));
  }
  append(node, children);
  return node;
}

function append(node, children) {
  for (const child of children.flat(Infinity)) {
    if (child === null || child === undefined || child === false) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
}

/** Parses trusted SVG markup from this app into an element. */
export function svgIcon(markup, label) {
  const template = document.createElement("template");
  template.innerHTML = markup.trim();
  const icon = template.content.firstElementChild;
  icon.setAttribute("aria-hidden", label ? "false" : "true");
  if (label) icon.setAttribute("aria-label", label);
  icon.classList.add("icon");
  return icon;
}
