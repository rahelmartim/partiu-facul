import { createApp } from "./ui/app.js";
import { h, svgIcon } from "./ui/dom.js";
import { ICONS } from "./ui/icons.js";

// Status bar of the phone frame: the real time, like on a phone.
function startStatusBar() {
  const bar = document.querySelector(".status-bar");
  const time = h("span", { class: "status-time" });
  bar.replaceChildren(time, h("span", { class: "status-icons", "aria-hidden": "true" },
    svgIcon(ICONS.wifi), svgIcon(ICONS.signal), svgIcon(ICONS.battery)));
  const tick = () => {
    time.textContent = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  };
  tick();
  setInterval(tick, 15_000);
}

startStatusBar();
createApp({ root: document.querySelector("#app"), tabbar: document.querySelector("#tabbar") });

if ("serviceWorker" in navigator && location.protocol !== "file:") {
  navigator.serviceWorker.register("sw.js").catch(() => {
    // Offline support is optional.
  });
}
