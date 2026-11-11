import { h } from "../dom.js";
import { busy, field, formValues, pill, showErrors } from "../forms.js";

export function profileFields(user = {}, { passwordLabel = "Senha" } = {}) {
  return [
    field({ name: "firstName", label: "Nome", value: user.firstName, autocomplete: "given-name", maxlength: 60 }),
    field({ name: "lastName", label: "Sobrenome", value: user.lastName, autocomplete: "family-name", maxlength: 60 }),
    field({ name: "studentId", label: "ID Universitário", value: user.studentId, autocomplete: "off", maxlength: 20 }),
    field({ name: "email", label: "E-mail", type: "email", value: user.email, autocomplete: "email", inputmode: "email" }),
    field({ name: "password", label: passwordLabel, type: "password", autocomplete: "new-password", maxlength: 128 }),
  ];
}

export function registerScreen(ctx) {
  const form = h("form", { class: "form", novalidate: true },
    h("h1", { class: "form-title", tabindex: "-1" }, "Cadastro"),
    ...profileFields(),
    pill("Cadastrar"),
  );
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const values = formValues(form);
    const result = await busy(form.querySelector(".pill"), async () => {
      const created = await ctx.auth.register(values);
      if (created.ok) await ctx.auth.login(values.email, values.password);
      return created;
    });
    if (!result.ok) return showErrors(form, result.errors);
    ctx.toast("Conta criada! Agora registre os seus horários.", "success");
    ctx.navigate("horarios");
  });

  return h("section", { class: "screen-auth" },
    h("img", { class: "logo", src: "assets/img/bus-logo.png", alt: "PartiuFacul" }),
    form,
    h("a", { class: "link", href: "#/login" }, "Já tenho uma conta"),
  );
}
