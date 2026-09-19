const fs = require("fs");
const path = require("path");

const REPO_ROOT = path.resolve(__dirname, "..", "..");

// Folders that are not interactives.
const IGNORED = new Set([
  "node_modules", "tests", "tools", "assets", "public",
  "test-results", "playwright-report", ".git", ".claude", ".github",
]);

/**
 * Project convention: each interactive is its own top-level folder with an
 * `index.html` entry point (e.g. `wind-turbine/index.html`). New interactives
 * are picked up automatically — no test file needs editing.
 *
 * Override for a one-off run:
 *   INTERACTIVES="wind-turbine,another" npm test
 */
function discoverInteractives() {
  const override = process.env.INTERACTIVES;
  if (override) {
    return override
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((name) => ({ name, url: `/${name}/index.html` }));
  }

  return fs
    .readdirSync(REPO_ROOT, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith(".") && !IGNORED.has(d.name))
    .filter((d) => fs.existsSync(path.join(REPO_ROOT, d.name, "index.html")))
    .map((d) => ({ name: d.name, url: `/${d.name}/index.html` }));
}

const interactives = discoverInteractives();

if (interactives.length === 0) {
  console.warn(
    "[tests] No interactives found. Expected <folder>/index.html at the repo root."
  );
}

module.exports = { interactives, REPO_ROOT };
