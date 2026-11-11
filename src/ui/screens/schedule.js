import { DAYS, SHIFTS } from "../../lib/dates.js";
import { BOARDING_POINTS, emptyGrid, normalizeSchedule, validateSchedule } from "../../lib/schedule.js";
import { h } from "../dom.js";
import { pill, showErrors } from "../forms.js";

export function scheduleScreen(ctx) {
  const saved = ctx.schedules.get(ctx.user.id) ?? { grid: emptyGrid(), boardingPoint: "" };
  const state = normalizeSchedule(saved);

  const rows = SHIFTS.map((shift) =>
    h("fieldset", { class: "shift" },
      h("legend", {}, h("span", {}, shift.label), h("small", {}, ` · ônibus às ${shift.departure}`)),
      h("div", { class: "days" },
        ...DAYS.map((day) => {
          const button = h("button", {
            type: "button",
            class: "day",
            "aria-pressed": String(state.grid[day.key][shift.key]),
            "aria-label": `${day.name}, ${shift.label}`,
          }, day.label);
          button.addEventListener("click", () => {
            state.grid[day.key][shift.key] = !state.grid[day.key][shift.key];
            button.setAttribute("aria-pressed", String(state.grid[day.key][shift.key]));
          });
          return button;
        }))));

  const select = h("select", { name: "boardingPoint", "aria-label": "Ponto de embarque", id: "field-boardingPoint", "aria-describedby": "error-boardingPoint" },
    h("option", { value: "" }, "Ponto de embarque"),
    ...BOARDING_POINTS.map((point) => h("option", { value: point, selected: point === state.boardingPoint }, point)));
  select.value = state.boardingPoint;

  const form = h("form", { class: "form form-wide", novalidate: true },
    h("div", { class: "card" },
      h("h1", { class: "card-title", tabindex: "-1" }, "Horários"),
      ...rows,
      h("span", { class: "field-error", id: "error-grid", role: "alert" })),
    h("div", { class: "select" }, select),
    h("span", { class: "field-error", id: "error-boardingPoint", role: "alert" }),
    pill("Registrar"),
  );
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    state.boardingPoint = select.value;
    const errors = validateSchedule(state);
    if (Object.keys(errors).length) return showErrors(form, errors);
    ctx.schedules.save(ctx.user.id, state);
    ctx.toast("Horários registrados!", "success");
    ctx.navigate("home");
  });
  return h("section", { class: "screen-schedule" }, form);
}
