// Form helpers shared by the screens.

import { h, svgIcon } from "./dom.js";
import { ICONS } from "./icons.js";

/** A text field in the style of the original app: placeholder and underline. */
export function field({ name, label, type = "text", value = "", autocomplete, maxlength = 120, inputmode }) {
  const input = h("input", { name, type, value, placeholder: label, "aria-label": label, autocomplete, maxlength, inputmode, id: `field-${name}` });
  const error = h("span", { class: "field-error", id: `error-${name}`, role: "alert" });
  input.setAttribute("aria-describedby", error.id);
  const parts = [input];
  if (type === "password") {
    const toggle = h("button", { type: "button", class: "field-toggle", "aria-label": "Mostrar senha" }, svgIcon(ICONS.eye));
    toggle.addEventListener("click", () => {
      const show = input.type === "password";
      input.type = show ? "text" : "password";
      toggle.replaceChildren(svgIcon(show ? ICONS.eyeOff : ICONS.eye));
      toggle.setAttribute("aria-label", show ? "Esconder senha" : "Mostrar senha");
    });
    parts.push(toggle);
  }
  return h("div", { class: "field" }, h("div", { class: "field-row" }, ...parts), error);
}

/** Shows the messages of an { field: message } object next to the fields. */
export function showErrors(form, errors = {}) {
  for (const node of form.querySelectorAll(".field-error")) node.textContent = "";
  for (const input of form.querySelectorAll("input, select")) input.removeAttribute("aria-invalid");
  for (const [name, message] of Object.entries(errors)) {
    const target = form.querySelector(`#error-${name}`);
    if (target) target.textContent = message;
    form.querySelector(`[name="${name}"]`)?.setAttribute("aria-invalid", "true");
  }
  form.querySelector("[aria-invalid='true']")?.focus();
}

export function formValues(form) {
  return Object.fromEntries(new FormData(form).entries());
}

export function pill(label, props = {}) {
  return h("button", { class: "pill", type: "submit", ...props }, label);
}

/** Disables a submit button while an async action runs. */
export async function busy(button, action) {
  button.disabled = true;
  button.setAttribute("aria-busy", "true");
  try {
    return await action();
  } finally {
    button.disabled = false;
    button.removeAttribute("aria-busy");
  }
}
