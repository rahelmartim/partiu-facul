import { h } from "../dom.js";
import { busy, formValues, pill, showErrors } from "../forms.js";
import { profileFields } from "./register.js";

export function profileScreen(ctx) {
  const confirmed = ctx.trips.history(ctx.user.id).length;
  const form = h("form", { class: "form", novalidate: true },
    h("h1", { class: "form-title", tabindex: "-1" }, "Dados pessoais"),
    ...profileFields(ctx.user, { passwordLabel: "Nova senha (opcional)" }),
    pill("Atualizar"),
  );
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const result = await busy(form.querySelector(".pill"), () => ctx.auth.updateProfile(ctx.user.id, formValues(form)));
    if (!result.ok) return showErrors(form, result.errors);
    ctx.toast("Dados atualizados!", "success");
    ctx.refresh();
  });
  return h("section", { class: "screen-auth screen-profile" },
    h("img", { class: "logo", src: "assets/img/bus-logo.png", alt: "" }),
    form,
    h("p", { class: "note" }, `Viagens confirmadas: ${confirmed}`),
  );
}
