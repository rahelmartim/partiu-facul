import { h, svgIcon } from "../dom.js";
import { ICONS } from "../icons.js";

function toggle(ctx, key, title, description) {
  const settings = ctx.settings.get(ctx.user.id);
  const input = h("input", { type: "checkbox", role: "switch", checked: settings[key], "aria-describedby": `desc-${key}` });
  input.addEventListener("change", () => {
    ctx.settings.set(ctx.user.id, { [key]: input.checked });
    ctx.toast(`${title}: ${input.checked ? "ligado" : "desligado"}.`);
  });
  return h("label", { class: "setting" },
    h("span", { class: "setting-text" }, h("strong", {}, title), h("small", { id: `desc-${key}` }, description)),
    input, h("span", { class: "switch", "aria-hidden": "true" }));
}

export function configScreen(ctx) {
  const { user } = ctx;
  const logout = () => {
    ctx.auth.logout();
    ctx.navigate("login");
  };
  const remove = () => {
    if (!window.confirm("Apagar a sua conta, os horários e as confirmações deste aparelho? Isso não pode ser desfeito.")) return;
    ctx.trips.removeUser(user.id);
    ctx.schedules.remove(user.id);
    ctx.settings.remove(user.id);
    ctx.auth.deleteAccount(user.id);
    ctx.toast("Conta apagada.");
    ctx.navigate("login");
  };
  return h("section", { class: "screen-config" },
    h("div", { class: "card" },
      h("h1", { class: "card-title", tabindex: "-1" }, "Configuração"),
      h("p", { class: "hello" }, `Olá, ${user.firstName}!`),
      toggle(ctx, "autoConfirm", "Auto confirmação", "Confirma a próxima viagem quando você abre o app."),
      toggle(ctx, "demoClassmates", "Colegas de demonstração", "Soma outros estudantes simulados às confirmações."),
    ),
    h("button", { class: "pill pill-dark", type: "button", onclick: logout }, svgIcon(ICONS.logout), " Sair"),
    h("button", { class: "link link-danger", type: "button", onclick: remove }, svgIcon(ICONS.trash), " Apagar minha conta"),
    h("p", { class: "note" }, "Os seus dados ficam só neste aparelho, no armazenamento do navegador. A senha é guardada como hash PBKDF2."),
  );
}
