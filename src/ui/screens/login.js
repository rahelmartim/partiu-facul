import { BOARDING_POINTS, emptyGrid } from "../../lib/schedule.js";
import { h } from "../dom.js";
import { busy, field, formValues, pill, showErrors } from "../forms.js";

export const DEMO_ACCOUNT = {
  firstName: "Estudante",
  lastName: "Demonstração",
  studentId: "DEMO2018",
  email: "demo@partiufacul.app",
  password: "partiu123",
};

async function enterDemo(ctx) {
  let result = await ctx.auth.login(DEMO_ACCOUNT.email, DEMO_ACCOUNT.password);
  if (!result.ok) {
    const created = await ctx.auth.register(DEMO_ACCOUNT);
    if (!created.ok) return ctx.toast("Não foi possível criar a conta de demonstração.", "error");
    const grid = emptyGrid();
    for (const day of Object.keys(grid)) grid[day].noite = true;
    grid.ter.manha = grid.qui.manha = true;
    ctx.schedules.save(created.user.id, { grid, boardingPoint: BOARDING_POINTS[0] });
    result = await ctx.auth.login(DEMO_ACCOUNT.email, DEMO_ACCOUNT.password);
  }
  ctx.navigate("home");
}

export function loginScreen(ctx) {
  const form = h("form", { class: "form", novalidate: true },
    field({ name: "identifier", label: "E-mail ou ID universitário", autocomplete: "username" }),
    field({ name: "password", label: "Senha", type: "password", autocomplete: "current-password" }),
    h("label", { class: "check" }, h("input", { type: "checkbox", name: "remember" }), h("span", {}, "Manter-me logado")),
    h("p", { class: "form-error", id: "error-form", role: "alert" }),
    pill("Entrar"),
  );
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const values = formValues(form);
    const result = await busy(form.querySelector(".pill"), () =>
      ctx.auth.login(values.identifier, values.password, { remember: values.remember === "on" }),
    );
    if (!result.ok) return showErrors(form, { form: result.error });
    ctx.navigate("home");
  });

  return h("section", { class: "screen-auth" },
    h("img", { class: "logo", src: "assets/img/bus-logo.png", alt: "PartiuFacul" }),
    h("h1", { class: "visually-hidden", tabindex: "-1" }, "Entrar no PartiuFacul"),
    form,
    h("a", { class: "link", href: "#/cadastro" }, "Cadastrar-se"),
    h("button", { class: "link link-small", type: "button", onclick: () => enterDemo(ctx) }, "Entrar com a conta de demonstração"),
  );
}
