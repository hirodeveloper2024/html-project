const { test, expect } = require("@playwright/test");
const { interactives } = require("./helpers/targets");

/**
 * Runs at every breakpoint with prefers-reduced-motion emulated.
 *
 * The emulation is set here rather than via a project `use` option, because
 * the option is not reliably forwarded to the context in this Playwright
 * version — page.emulateMedia() is explicit and always applies.
 *
 * The standard here is not "nothing moves" — it is that the content remains
 * fully reachable without motion. An interactive that hides its payload
 * behind a scroll animation becomes unusable when that animation is off.
 */
for (const item of interactives) {
  test.describe(item.name, () => {
    test.beforeEach(async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto(item.url, { waitUntil: "load" });
    });

    test("honours prefers-reduced-motion", async ({ page }) => {
      const prefers = await page.evaluate(
        () => window.matchMedia("(prefers-reduced-motion: reduce)").matches
      );
      expect(prefers, "browser should report reduced motion for these tests").toBe(true);
    });

    test("no long-running infinite animations", async ({ page }) => {
      await page.waitForTimeout(300);
      const animating = await page.evaluate(() => {
        const bad = [];
        for (const el of document.querySelectorAll("*")) {
          const cs = getComputedStyle(el);
          if (cs.display === "none" || cs.visibility === "hidden") continue;
          if (cs.animationName !== "none" && cs.animationIterationCount === "infinite") {
            bad.push(`${el.tagName.toLowerCase()}.${el.className || "(no class)"} → ${cs.animationName}`);
          }
        }
        return [...new Set(bad)].slice(0, 8);
      });
      expect(
        animating,
        `infinite animations still running under reduced motion:\n${animating.join("\n")}`
      ).toEqual([]);
    });

    test("primary content is reachable without motion", async ({ page }) => {
      // Whatever the interactive teaches must be present in the DOM and
      // visible, not gated behind a scroll-driven reveal.
      const h1 = page.locator("h1").first();
      await expect(h1).toBeVisible();

      const visibleText = await page.evaluate(() => document.body.innerText.trim().length);
      expect(visibleText, "page renders essentially no visible text").toBeGreaterThan(120);
    });
  });
}
