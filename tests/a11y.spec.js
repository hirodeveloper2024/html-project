const { test, expect } = require("@playwright/test");
const AxeBuilder = require("@axe-core/playwright").default;
const { interactives } = require("./helpers/targets");

// WCAG 2.2 AA — includes the 2.2 additions (e.g. 2.5.8 Target Size Minimum).
const WCAG_22_AA = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

for (const item of interactives) {
  test.describe(item.name, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(item.url, { waitUntil: "load" });
    });

    test("has no automatically detectable WCAG 2.2 AA violations", async ({ page }) => {
      const results = await new AxeBuilder({ page }).withTags(WCAG_22_AA).analyze();

      const summary = results.violations
        .map((v) => {
          const where = v.nodes.slice(0, 3).map((n) => `      ${n.target.join(" ")}`).join("\n");
          return `  [${v.impact}] ${v.id}: ${v.help}\n${where}\n      ${v.helpUrl}`;
        })
        .join("\n\n");

      expect(results.violations, `axe found ${results.violations.length} violation(s):\n\n${summary}`).toEqual([]);
    });

    test("has exactly one h1 and a sensible heading order", async ({ page }) => {
      const headings = await page.evaluate(() =>
        [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")]
          .filter((h) => getComputedStyle(h).display !== "none")
          .map((h) => ({ level: Number(h.tagName[1]), text: h.textContent.trim().slice(0, 40) }))
      );

      const h1s = headings.filter((h) => h.level === 1);
      expect(h1s.length, `expected one <h1>, found ${h1s.length}`).toBe(1);

      for (let i = 1; i < headings.length; i++) {
        const jump = headings[i].level - headings[i - 1].level;
        expect(
          jump,
          `heading level jumps from h${headings[i - 1].level} to h${headings[i].level} at "${headings[i].text}"`
        ).toBeLessThanOrEqual(1);
      }
    });

    test("every interactive control is reachable and labelled", async ({ page }) => {
      const unlabelled = await page.evaluate(() =>
        [...document.querySelectorAll("button, a[href], input, select, textarea, [role=button]")]
          .filter((el) => {
            const cs = getComputedStyle(el);
            if (cs.display === "none" || cs.visibility === "hidden") return false;
            if (el.closest("[aria-hidden=true]")) return false;
            const name =
              el.getAttribute("aria-label") ||
              el.getAttribute("title") ||
              el.textContent.trim() ||
              (el.labels && el.labels.length);
            return !name;
          })
          .map((el) => `${el.tagName.toLowerCase()}#${el.id || "(no id)"}`)
      );
      expect(unlabelled, `controls with no accessible name: ${unlabelled.join(", ")}`).toEqual([]);
    });

    test("keyboard focus is visible on every focusable control", async ({ page }) => {
      const handles = await page.$$("button, a[href], input, select, textarea, [tabindex]:not([tabindex='-1'])");
      const noFocusStyle = [];

      for (const h of handles.slice(0, 25)) {
        const visible = await h.isVisible().catch(() => false);
        if (!visible) continue;
        await h.focus().catch(() => {});
        const info = await h.evaluate((el) => {
          const cs = getComputedStyle(el);
          const hasOutline = cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0;
          const hasRing = cs.boxShadow !== "none";
          const hasBorderShift = cs.borderStyle !== "none";
          return {
            id: el.id || el.className || el.tagName,
            focused: document.activeElement === el,
            styled: hasOutline || hasRing || hasBorderShift,
          };
        });
        if (info.focused && !info.styled) noFocusStyle.push(info.id);
      }

      expect(noFocusStyle, `focused but no visible focus indicator: ${noFocusStyle.join(", ")}`).toEqual([]);
    });

    test("touch targets meet the 24x24 minimum (WCAG 2.2 AA 2.5.8)", async ({ page }) => {
      const small = await page.evaluate(() => {
        const bad = [];
        for (const el of document.querySelectorAll("button, a[href], input, [role=button]")) {
          const cs = getComputedStyle(el);
          if (cs.display === "none" || cs.visibility === "hidden") continue;
          if (el.closest("[aria-hidden=true]")) continue;
          const r = el.getBoundingClientRect();
          if (r.width === 0 || r.height === 0) continue;
          // Inline links in running text are exempt under 2.5.8.
          if (el.tagName === "A" && cs.display.startsWith("inline")) continue;
          if (r.width < 24 || r.height < 24) {
            bad.push(`${el.tagName.toLowerCase()}#${el.id || el.className} = ${Math.round(r.width)}x${Math.round(r.height)}`);
          }
        }
        return [...new Set(bad)].slice(0, 8);
      });
      expect(small, `targets smaller than 24x24:\n${small.join("\n")}`).toEqual([]);
    });
  });
}
