// The "#PARTIU" control: drag the bus to the right to confirm. The bus is
// also a button, so Enter, Space, or a tap confirm too.

import { h, svgIcon } from "./dom.js";
import { ICONS } from "./icons.js";

const THRESHOLD = 0.6;

export function swipeToConfirm({ label = "#PARTIU", onConfirm }) {
  const bus = h("button", { class: "swipe-bus", type: "button", "aria-label": `Arrastar o ônibus para confirmar: ${label}` },
    h("img", { src: "assets/img/bus.png", alt: "", draggable: "false" }));
  const track = h("div", { class: "swipe-track" }, h("span", { class: "swipe-label" }, label), svgIcon(ICONS.check));
  const root = h("div", { class: "swipe" }, track, bus);

  let startX = 0;
  let dx = 0;
  let dragging = false;
  let moved = false;
  let ignoreClick = false;
  const maxDistance = () => Math.max(track.offsetWidth - 40, 1);

  const finish = () => {
    root.classList.add("driving");
    bus.style.transform = "";
    bus.disabled = true;
    setTimeout(() => onConfirm?.(), 450);
  };

  bus.addEventListener("pointerdown", (event) => {
    dragging = true;
    moved = false;
    startX = event.clientX;
    dx = 0;
    bus.setPointerCapture?.(event.pointerId);
    root.classList.add("dragging");
  });
  bus.addEventListener("pointermove", (event) => {
    if (!dragging) return;
    dx = Math.min(Math.max(event.clientX - startX, 0), maxDistance());
    if (dx > 4) moved = true;
    bus.style.transform = `translateX(${dx}px)`;
    track.style.setProperty("--progress", String(dx / maxDistance()));
  });
  const release = () => {
    if (!dragging) return;
    dragging = false;
    root.classList.remove("dragging");
    // The browser sends a click right after a drag. Ignore only that click:
    // a later tap or key press must still work.
    if (moved) {
      ignoreClick = true;
      setTimeout(() => {
        ignoreClick = false;
      }, 0);
    }
    if (dx / maxDistance() >= THRESHOLD) {
      finish();
    } else {
      bus.style.transform = "";
      track.style.setProperty("--progress", "0");
    }
  };
  bus.addEventListener("pointerup", release);
  bus.addEventListener("pointercancel", release);
  // A tap or the keyboard (Enter, Space) send a click without a drag.
  bus.addEventListener("click", () => {
    if (!ignoreClick && !bus.disabled) finish();
  });
  return root;
}
