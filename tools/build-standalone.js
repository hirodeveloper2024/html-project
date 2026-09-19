#!/usr/bin/env node
/**
 * Regenerates <interactive>/standalone.html by inlining css/style.css and
 * js/app.js into index.html. Assets stay external and relatively linked.
 *
 *   node tools/build-standalone.js            # every interactive
 *   node tools/build-standalone.js wind-turbine
 *
 * standalone.html is generated output — never edit it by hand.
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const IGNORED = new Set([
  "node_modules", "tests", "tools", "assets", "public",
  "test-results", "playwright-report", ".git", ".claude", ".github",
]);

function interactives() {
  const named = process.argv.slice(2);
  if (named.length) return named;
  return fs
    .readdirSync(ROOT, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith(".") && !IGNORED.has(d.name))
    .filter((d) => fs.existsSync(path.join(ROOT, d.name, "index.html")))
    .map((d) => d.name);
}

let built = 0;
for (const name of interactives()) {
  const dir = path.join(ROOT, name);
  const indexPath = path.join(dir, "index.html");
  const cssPath = path.join(dir, "css", "style.css");
  const jsPath = path.join(dir, "js", "app.js");

  if (!fs.existsSync(indexPath)) {
    console.warn(`skip ${name}: no index.html`);
    continue;
  }

  let html = fs.readFileSync(indexPath, "utf8");

  if (fs.existsSync(cssPath)) {
    const css = fs.readFileSync(cssPath, "utf8");
    html = html.replace(
      /<link[^>]+href="css\/style\.css"[^>]*>/,
      `<style>\n${css}\n</style>`
    );
  }
  if (fs.existsSync(jsPath)) {
    const js = fs.readFileSync(jsPath, "utf8");
    html = html.replace(
      /<script[^>]+src="js\/app\.js"[^>]*><\/script>/,
      `<script>\n${js}\n</script>`
    );
  }

  const out = path.join(dir, "standalone.html");
  fs.writeFileSync(out, html);
  console.log(`built ${path.relative(ROOT, out)}`);
  built++;
}

if (!built) {
  console.warn("No interactives found.");
  process.exit(1);
}
