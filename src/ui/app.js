// The app: services, router, tab bar, and messages.

import { createAuth } from "../lib/auth.js";
import { createScheduleService } from "../lib/schedule.js";
import { createSettings } from "../lib/settings.js";
import { createStore } from "../lib/storage.js";
import { createTripService } from "../lib/trips.js";
import { h, svgIcon } from "./dom.js";
import { ICONS } from "./icons.js";
import { configScreen } from "./screens/config.js";
import { homeScreen } from "./screens/home.js";
import { loginScreen } from "./screens/login.js";
import { profileScreen } from "./screens/profile.js";
import { registerScreen } from "./screens/register.js";
import { scheduleScreen } from "./screens/schedule.js";

const ROUTES = {
  login: { screen: loginScreen, public: true, title: "Entrar" },
  cadastro: { screen: registerScreen, public: true, title: "Cadastro" },
  home: { screen: homeScreen, tab: true, title: "Home" },
  horarios: { screen: scheduleScreen, tab: true, title: "Horários" },
  dados: { screen: profileScreen, tab: true, title: "Dados" },
  config: { screen: configScreen, tab: true, title: "Configuração" },
};

const TABS = [
  { route: "home", label: "Home", icon: ICONS.home },
  { route: "horarios", label: "Horários", icon: ICONS.calendar },
  { route: "dados", label: "Dados", icon: ICONS.user },
  { route: "config", label: "Configuração", icon: ICONS.gear },
];

function safeStorage(kind) {
  try {
    const storage = window[kind];
    storage.setItem("partiufacul:test", "1");
    storage.removeItem("partiufacul:test");
    return storage;
  } catch {
    return undefined; // Private mode can block storage: fall back to memory.
  }
}

export function createApp({ root, tabbar, now = () => new Date() }) {
  const store = createStore(safeStorage("localStorage"));
  const temporary = createStore(safeStorage("sessionStorage"));
  const ctx = {
    now,
    auth: createAuth({ store, temporary, now }),
    schedules: createScheduleService(store),
    trips: createTripService(store),
    settings: createSettings(store),
    user: null,
    navigate: (route) => {
      if (location.hash === `#/${route}`) render();
      else location.hash = `#/${route}`;
    },
    toast,
    refresh: () => render(),
  };

  function toast(message, kind = "info") {
    const node = h("div", { class: `toast toast-${kind}`, role: "status" }, message);
    document.querySelector(".phone").append(node);
    requestAnimationFrame(() => node.classList.add("show"));
    setTimeout(() => {
      node.classList.remove("show");
      setTimeout(() => node.remove(), 300);
    }, 2600);
  }

  function renderTabs(active) {
    tabbar.replaceChildren(
      ...TABS.map((tab) =>
        h("a", { href: `#/${tab.route}`, class: `tab${tab.route === active ? " active" : ""}`, "aria-current": tab.route === active ? "page" : null },
          h("span", { class: "tab-icon" }, svgIcon(tab.icon)),
          h("span", { class: "tab-label" }, tab.label)),
      ),
    );
  }

  function render() {
    ctx.user = ctx.auth.currentUser();
    let name = location.hash.replace(/^#\//, "") || (ctx.user ? "home" : "login");
    if (!ROUTES[name]) name = ctx.user ? "home" : "login";
    const route = ROUTES[name];
    if (!route.public && !ctx.user) return ctx.navigate("login");
    if (route.public && ctx.user) return ctx.navigate("home");

    document.title = `${route.title} · PartiuFacul`;
    root.replaceChildren(route.screen(ctx));
    root.scrollTop = 0;
    root.dataset.route = name;
    tabbar.hidden = !route.tab;
    if (route.tab) renderTabs(name);
    root.querySelector("h1, h2")?.focus?.({ preventScroll: true });
  }

  window.addEventListener("hashchange", render);
  render();
  return ctx;
}
