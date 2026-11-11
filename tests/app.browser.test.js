// Tests the real app in a headless Chrome: the screens, the forms, the
// #PARTIU confirmation, the settings, and the sessions.

import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { findChrome, launchChrome, serveApp } from "./browser.js";

const chromePath = findChrome();

describe("app in the browser", { skip: chromePath ? false : "Chrome is not installed" }, () => {
  let chrome;
  let app;
  let page;

  const student = {
    firstName: "Bia",
    lastName: "Lima",
    studentId: "BIA2026",
    email: "bia@example.com",
    password: "onibus123",
  };

  before(async () => {
    app = await serveApp();
    chrome = await launchChrome(chromePath);
    page = await chrome.newPage();
  });

  after(async () => {
    page?.close();
    await chrome?.close();
    app?.server.close();
  });

  const route = () => page.eval("document.querySelector('#app').dataset.route");

  test("a new visitor sees the login screen without the tab bar", async () => {
    await page.goto(app.url);
    assert.equal(await route(), "login");
    assert.equal(await page.eval("document.querySelector('#tabbar').hidden"), true);
    assert.match(await page.text(), /Manter-me logado/);
  });

  test("private screens send a visitor to the login", async () => {
    await page.goto(`${app.url}#/home`);
    await page.waitFor("document.querySelector('#app').dataset.route === 'login'");
  });

  test("the sign-up form shows an error for each invalid field", async () => {
    await page.goto(`${app.url}#/cadastro`);
    await page.fill("firstName", "<img src=x onerror=alert(1)>");
    await page.fill("email", "not-an-email");
    await page.fill("password", "123");
    await page.submit();
    await page.waitFor("document.querySelector('#error-email').textContent");
    const errors = await page.eval("[...document.querySelectorAll('.field-error')].map((e) => e.textContent).filter(Boolean)");
    assert.equal(errors.length, 5, errors.join(" | "));
    assert.equal(await page.eval("document.querySelectorAll('#app img[src=x]').length"), 0);
    assert.equal(await route(), "cadastro");
  });

  test("signing up logs in and opens the schedule", async () => {
    await page.goto(`${app.url}#/cadastro`);
    for (const [name, value] of Object.entries(student)) await page.fill(name, value);
    await page.submit();
    await page.waitFor("document.querySelector('#app').dataset.route === 'horarios'");
    assert.equal(await page.eval("document.querySelector('#tabbar').hidden"), false);
    assert.match(await page.text(".phone"), /Conta criada/);
  });

  test("the home screen asks for a schedule first", async () => {
    await page.goto(`${app.url}#/home`);
    assert.match(await page.text(), /ainda não tem horários/);
  });

  test("the schedule needs a shift and a boarding point", async () => {
    await page.goto(`${app.url}#/horarios`);
    await page.submit();
    await page.waitFor("document.querySelector('#error-grid').textContent");
    assert.match(await page.text(), /pelo menos um turno/);
    assert.match(await page.text(), /ponto de embarque/i);
  });

  test("registering a schedule shows the next trip with the bus counter", async () => {
    await page.goto(`${app.url}#/horarios`);
    // Every weekday at night, so that a trip always exists.
    for (const day of ["Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira"]) {
      await page.click(`[aria-label="${day}, Noite"]`);
    }
    assert.equal(await page.eval("document.querySelectorAll('.day[aria-pressed=true]').length"), 5);
    await page.eval("(() => { const s = document.querySelector('select'); s.value = 'Praça (Flores)'; return true; })()");
    await page.submit();
    await page.waitFor("document.querySelector('#app').dataset.route === 'home'");
    await page.waitFor("document.querySelector('.counter-badge')");
    const badge = await page.text(".counter-badge");
    const confirmations = Number(await page.eval("document.querySelectorAll('.stats dd')[0].textContent"));
    const buses = Number(await page.eval("document.querySelectorAll('.stats dd')[1].textContent"));
    assert.ok(confirmations > 0, "demo classmates add confirmations");
    assert.equal(buses, Math.ceil(confirmations / 44));
    assert.equal(badge, `x${buses}`);
    assert.match(await page.text(), /Noite · 17:30/);
    assert.match(await page.text(), /Praça \(Flores\)/);
  });

  test("the schedule screen keeps the saved choices", async () => {
    await page.goto(`${app.url}#/horarios`);
    assert.equal(await page.eval("document.querySelectorAll('.day[aria-pressed=true]').length"), 5);
    assert.equal(await page.eval("document.querySelector('select').value"), "Praça (Flores)");
  });

  test("#PARTIU confirms the ride and adds one confirmation", async () => {
    await page.goto(`${app.url}#/home`);
    const before = Number(await page.eval("document.querySelectorAll('.stats dd')[0].textContent"));
    await page.click(".swipe-bus");
    await page.waitFor("document.querySelector('.confirmed')");
    const after = Number(await page.eval("document.querySelectorAll('.stats dd')[0].textContent"));
    assert.equal(after, before + 1);
    assert.match(await page.text(), /Presença confirmada/);
  });

  test("dragging the bus also confirms", async () => {
    await page.clickText("#app button", "Cancelar presença");
    await page.waitFor("document.querySelector('.swipe-bus')");
    await page.eval(`(() => {
      const bus = document.querySelector('.swipe-bus');
      const box = bus.getBoundingClientRect();
      const fire = (type, x) => bus.dispatchEvent(new PointerEvent(type, { bubbles: true, clientX: x, pointerId: 1 }));
      fire('pointerdown', box.left + 10);
      fire('pointermove', box.left + 400);
      fire('pointerup', box.left + 400);
      return true;
    })()`);
    await page.waitFor("document.querySelector('.confirmed')");
  });

  test("a short drag does not confirm", async () => {
    await page.clickText("#app button", "Cancelar presença");
    await page.waitFor("document.querySelector('.swipe-bus')");
    await page.eval(`(() => {
      const bus = document.querySelector('.swipe-bus');
      const box = bus.getBoundingClientRect();
      const fire = (type, x) => bus.dispatchEvent(new PointerEvent(type, { bubbles: true, clientX: x, pointerId: 1 }));
      fire('pointerdown', box.left + 10);
      fire('pointermove', box.left + 30);
      fire('pointerup', box.left + 30);
      return true;
    })()`);
    await new Promise((r) => setTimeout(r, 700));
    assert.equal(await page.eval("Boolean(document.querySelector('.confirmed'))"), false);
  });

  test("turning off the demo classmates shows only real students", async () => {
    await page.click(".swipe-bus");
    await page.waitFor("document.querySelector('.confirmed')");
    await page.goto(`${app.url}#/config`);
    await page.eval("(() => { const s = document.querySelectorAll('[role=switch]')[1]; s.click(); return true; })()");
    await page.goto(`${app.url}#/home`);
    assert.equal(await page.eval("document.querySelectorAll('.stats dd')[0].textContent"), "1");
    assert.equal(await page.text(".counter-badge"), "x1");
    assert.doesNotMatch(await page.text(), /colegas de demonstração/);
  });

  test("the profile updates the name", async () => {
    await page.goto(`${app.url}#/dados`);
    assert.equal(await page.eval("document.querySelector('[name=email]').value"), "bia@example.com");
    await page.fill("firstName", "Beatriz");
    await page.submit();
    await page.waitFor("document.querySelector('.phone').innerText.includes('Dados atualizados')");
    await page.goto(`${app.url}#/config`);
    assert.match(await page.text(), /Olá, Beatriz!/);
  });

  test("the tab bar opens each screen", async () => {
    for (const [label, name] of [["Horários", "horarios"], ["Dados", "dados"], ["Configuração", "config"], ["Home", "home"]]) {
      await page.clickText("#tabbar a", label);
      await page.waitFor(`document.querySelector('#app').dataset.route === '${name}'`);
      assert.equal(await page.eval("document.querySelector('#tabbar [aria-current=page]').textContent"), label);
    }
  });

  test("logging out and in with a wrong password", async () => {
    await page.goto(`${app.url}#/config`);
    await page.clickText("#app button", "Sair");
    await page.waitFor("document.querySelector('#app').dataset.route === 'login'");
    await page.fill("identifier", "bia@example.com");
    await page.fill("password", "errada");
    await page.submit();
    await page.waitFor("document.querySelector('#error-form').textContent");
    assert.match(await page.text(), /incorretos/);
  });

  test("a session without keep me logged in ends in a new tab", async () => {
    await page.fill("identifier", "BIA2026");
    await page.fill("password", "onibus123");
    await page.submit();
    await page.waitFor("document.querySelector('#app').dataset.route === 'home'");
    const other = await chrome.newPage();
    await other.goto(app.url);
    assert.equal(await other.eval("document.querySelector('#app').dataset.route"), "login");
    other.close();
  });

  test("keep me logged in survives a new tab", async () => {
    await page.goto(`${app.url}#/config`);
    await page.clickText("#app button", "Sair");
    await page.waitFor("document.querySelector('#app').dataset.route === 'login'");
    await page.fill("identifier", "bia@example.com");
    await page.fill("password", "onibus123");
    await page.click("[name=remember]");
    await page.submit();
    await page.waitFor("document.querySelector('#app').dataset.route === 'home'");
    const other = await chrome.newPage();
    await other.goto(app.url);
    assert.equal(await other.eval("document.querySelector('#app').dataset.route"), "home");
    other.close();
  });

  test("the password is never stored in the browser", async () => {
    const saved = await page.eval("JSON.stringify(localStorage) + JSON.stringify(sessionStorage)");
    assert.ok(!saved.includes("onibus123"));
    assert.match(saved, /hash/);
  });

  test("deleting the account removes it", async () => {
    await page.goto(`${app.url}#/config`);
    await page.eval("window.confirm = () => true");
    await page.clickText("#app button", "Apagar minha conta");
    await page.waitFor("document.querySelector('#app').dataset.route === 'login'");
    await page.fill("identifier", "bia@example.com");
    await page.fill("password", "onibus123");
    await page.submit();
    await page.waitFor("document.querySelector('#error-form').textContent");
    assert.doesNotMatch(await page.eval("localStorage.getItem('partiufacul:users')"), /bia@example.com/);
  });

  test("the keyboard can confirm after a short drag", async () => {
    // Regression: a short drag left a flag on, and the next click was ignored.
    await page.goto(`${app.url}#/config`);
    await page.eval("window.confirm = () => true");
    await page.goto(app.url);
    await page.clickText("#app button", "conta de demonstração");
    await page.waitFor("document.querySelector('.counter-badge')");
    if (await page.eval("Boolean(document.querySelector('.confirmed'))")) {
      await page.clickText("#app button", "Cancelar presença");
      await page.waitFor("document.querySelector('.swipe-bus')");
    }
    await page.eval(`(() => {
      const bus = document.querySelector('.swipe-bus');
      const box = bus.getBoundingClientRect();
      const fire = (type, x) => bus.dispatchEvent(new PointerEvent(type, { bubbles: true, clientX: x, pointerId: 1 }));
      fire('pointerdown', box.left + 10);
      fire('pointermove', box.left + 30);
      fire('pointerup', box.left + 30);
      return true;
    })()`);
    // A click without a pointer press, like Enter or Space on the keyboard.
    await page.click(".swipe-bus");
    await page.waitFor("document.querySelector('.confirmed')");
    await page.goto(`${app.url}#/config`);
    await page.clickText("#app button", "Sair");
    await page.waitFor("document.querySelector('#app').dataset.route === 'login'");
  });

  test("the demo account opens a ready home screen", async () => {
    await page.goto(app.url);
    await page.clickText("#app button", "conta de demonstração");
    await page.waitFor("document.querySelector('.counter-badge')");
    assert.match(await page.text(), /Informações/);
  });

  test("on a phone the app fills the screen without the frame", async () => {
    const phone = await chrome.newPage({ width: 390, height: 844, mobile: true });
    await phone.goto(app.url);
    assert.equal(await phone.eval("getComputedStyle(document.querySelector('.phone')).borderTopWidth"), "0px");
    assert.equal(await phone.eval("getComputedStyle(document.querySelector('.about')).display"), "none");
    phone.close();
  });

  test("the page had no JavaScript errors", () => {
    assert.deepEqual(page.errors, []);
  });
});
