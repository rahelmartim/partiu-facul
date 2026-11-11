import { formatShortDate } from "../../lib/dates.js";
import { nextTrip } from "../../lib/schedule.js";
import { autoConfirm } from "../../lib/trips.js";
import { h, svgIcon } from "../dom.js";
import { ICONS } from "../icons.js";
import { swipeToConfirm } from "../swipe.js";

export function homeScreen(ctx) {
  const { user } = ctx;
  const schedule = ctx.schedules.get(user.id);
  const settings = ctx.settings.get(user.id);
  const now = ctx.now();
  const trip = schedule ? nextTrip(schedule, now) : null;

  if (!trip) {
    return h("section", { class: "screen-home" },
      h("div", { class: "card empty" },
        h("h1", { class: "card-title", tabindex: "-1" }, "Informações"),
        h("img", { class: "counter-img", src: "assets/img/bus-counter.png", alt: "" }),
        h("p", {}, "Você ainda não tem horários. Registre os dias e turnos da sua faculdade para confirmar o ônibus."),
        h("a", { class: "pill", href: "#/horarios" }, "Registrar horários"),
      ));
  }

  if (settings.autoConfirm && autoConfirm(ctx.trips, user.id, trip, schedule.boardingPoint, now)) {
    setTimeout(() => ctx.toast("Auto confirmação: presença confirmada.", "success"), 300);
  }

  const summary = ctx.trips.summary(trip.key, { includeDemo: settings.demoClassmates });
  const confirmed = ctx.trips.isConfirmed(user.id, trip.key);

  const info = h("div", { class: "card" },
    h("h1", { class: "card-title", tabindex: "-1" }, "Informações"),
    h("div", { class: "counter" },
      h("img", { class: "counter-img", src: "assets/img/bus-counter.png", alt: "" }),
      h("span", { class: "counter-badge", "aria-label": `${summary.buses} ônibus` }, `x${summary.buses}`)),
    h("dl", { class: "stats" },
      h("div", {}, h("dt", {}, "Número de confirmações"), h("dd", {}, String(summary.confirmations))),
      h("div", {}, h("dt", {}, "Número de transportes"), h("dd", {}, String(summary.buses))),
      h("div", {}, h("dt", {}, "Lugares livres"), h("dd", {}, String(summary.seatsLeft))),
    ),
    h("p", { class: "trip" },
      svgIcon(ICONS.clock), ` ${formatShortDate(trip.date)} · ${trip.shift.label} · ${trip.shift.departure}`),
    h("p", { class: "trip" }, svgIcon(ICONS.pin), ` ${schedule.boardingPoint}`),
  );

  const action = confirmed
    ? h("div", { class: "confirmed" },
        h("p", { class: "confirmed-title" }, svgIcon(ICONS.check), " Presença confirmada!"),
        h("button", {
          class: "link",
          type: "button",
          onclick: () => {
            const result = ctx.trips.cancel(user.id, trip.key, ctx.now());
            ctx.toast(result.ok ? "Presença cancelada." : result.error, result.ok ? "info" : "error");
            ctx.refresh();
          },
        }, "Cancelar presença"))
    : h("div", { class: "confirm" },
        h("p", { class: "confirm-hint" }, "Confirme sua presença"),
        swipeToConfirm({
          onConfirm: () => {
            const result = ctx.trips.confirm(user.id, trip.key, schedule.boardingPoint, ctx.now());
            ctx.toast(result.ok ? "#PARTIU! Presença confirmada." : result.error, result.ok ? "success" : "error");
            ctx.refresh();
          },
        }));

  return h("section", { class: "screen-home" }, info, action,
    settings.demoClassmates ? h("p", { class: "note" }, "Os números incluem colegas de demonstração. Você pode desligar isso em Configuração.") : null);
}
