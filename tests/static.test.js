// Checks that the files of the app reference each other correctly.

import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { test } from "node:test";

const ROOT = resolve(import.meta.dirname, "..");
const read = (path) => readFileSync(join(ROOT, path), "utf8");

function filesIn(folder) {
  return readdirSync(join(ROOT, folder)).flatMap((name) => {
    const path = join(folder, name);
    return statSync(join(ROOT, path)).isDirectory() ? filesIn(path) : [path];
  });
}

const shell = () => [...read("sw.js").matchAll(/^\s+"([^"]+)",?$/gm)].map((m) => m[1]);

test("every file in the offline cache exists", () => {
  for (const file of shell()) {
    if (file === "./") continue;
    assert.ok(existsSync(join(ROOT, file)), `sw.js caches a missing file: ${file}`);
  }
});

test("every module and image of the app is in the offline cache", () => {
  const cached = new Set(shell());
  for (const file of [...filesIn("src"), ...filesIn("assets")]) {
    assert.ok(cached.has(file), `add ${file} to SHELL in sw.js`);
  }
});

test("every import points to an existing file", () => {
  for (const file of filesIn("src").filter((f) => f.endsWith(".js"))) {
    for (const [, path] of read(file).matchAll(/from "(\.[^"]+)"/g)) {
      const target = relative(ROOT, resolve(ROOT, dirname(file), path));
      assert.ok(existsSync(join(ROOT, target)), `${file} imports a missing file: ${path}`);
    }
  }
});

test("every file that index.html loads exists", () => {
  for (const [, path] of read("index.html").matchAll(/(?:src|href)="([^"#:]+)"/g)) {
    assert.ok(existsSync(join(ROOT, path)), `index.html loads a missing file: ${path}`);
  }
});

test("every image path in the code and the CSS exists", () => {
  const sources = filesIn("src").map(read).join("\n");
  for (const [, path] of sources.matchAll(/assets\/img\/[\w.-]+/g).map((m) => [null, m[0]])) {
    assert.ok(existsSync(join(ROOT, path)), `missing image: ${path}`);
  }
});

test("the manifest is valid and its icons exist", () => {
  const manifest = JSON.parse(read("manifest.webmanifest"));
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.start_url, "./");
  assert.ok(manifest.icons.some((icon) => icon.sizes === "512x512"));
  for (const icon of manifest.icons) assert.ok(existsSync(join(ROOT, icon.src)), icon.src);
});

test("the code does not use innerHTML with data", () => {
  for (const file of filesIn("src").filter((f) => f.endsWith(".js"))) {
    const uses = [...read(file).matchAll(/innerHTML\s*=/g)];
    // dom.js parses the trusted SVG icons of the app, and nothing else.
    if (file.endsWith("dom.js")) assert.equal(uses.length, 1);
    else assert.equal(uses.length, 0, `${file} sets innerHTML`);
  }
});
