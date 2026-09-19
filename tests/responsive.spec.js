const { test, expect } = require("@playwright/test");
const { interactives } = require("./helpers/targets");

/**
 * Runs at every configured breakpoint (375 / 768 / 1440).
 * These assert layout integrity rather than pixel appearance, so they stay
 * useful as the visual design evolves.
 */
for (const item of interactives) {
  test.describe(item.name, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(item.url, { waitUntil: "load" });
    });

    test("does not scroll horizontally", async ({ page }) => {
      // The classic responsive failure: something overflows the viewport.
      const overflow = await page.evaluate(() => {
        const d = document.documentElement;
        return { scrollWidth: d.scrollWidth, clientWidth: d.clientWidth };
      });
      expect(
        overflow.scrollWidth,
        `horizontal overflow: content is ${overflow.scrollWidth}px in a ${overflow.clientWidth}px viewport`
      ).toBeLessThanOrEqual(overflow.clientWidth + 1);
    });

    test("no element spills outside the viewport", async ({ page }) => {
      const spills = await page.evaluate(() => {
        const vw = document.documentElement.clientWidth;
        const bad = [];
        for (const el of document.body.querySelectorAll("*")) {
          const cs = getComputedStyle(el);
          if (cs.display === "none" || cs.visibility === "hidden") continue;
          // Deliberately offscreen patterns (skip links) are fine.
          if (cs.position === "fixed" || cs.position === "absolute") {
            const r = el.getBoundingClientRect();
            if (r.right < 0 || r.left > vw) continue;
          }
          const r = el.getBoundingClientRect();
          if (r.width === 0 || r.height === 0) continue;
          if (r.right > vw + 1) {
            bad.push(`${el.tagName.toLowerCase()}.${el.className || "(no class)"} → right:${Math.round(r.right)} > ${vw}`);
          }
        }
        return bad.slice(0, 8);
      });
      expect(spills, `elements extend past the right edge:\n${spills.join("\n")}`).toEqual([]);
    });

    test("media is responsive and never cropped by object-fit: cover", async ({ page }) => {
      // Educational diagrams must stay whole; `cover` silently crops them.
      const cropped = await page.evaluate(() =>
        [...document.querySelectorAll("img, video, svg")]
          .filter((el) => {
            const cs = getComputedStyle(el);
            return cs.display !== "none" && cs.objectFit === "cover";
          })
          .map((el) => el.id || el.className || el.tagName)
      );
      expect(cropped, `media using object-fit: cover (crops content): ${cropped.join(", ")}`).toEqual([]);
    });

    test("text stays legible", async ({ page }, testInfo) => {
      // Two different standards, because they are different jobs:
      //   running prose  -> 16px on mobile (also avoids iOS zoom-on-focus), 14px up
      //   UI labels      -> 14px floor everywhere; a chip or pill is not prose
      const proseMin = testInfo.project.name === "mobile-375" ? 16 : 14;
      const uiMin = 14;

      const tooSmall = await page.evaluate(
        ({ proseMin, uiMin }) => {
          const PROSE = new Set(["P", "LI", "H1", "H2", "H3", "H4"]);
          const bad = [];
          for (const el of document.querySelectorAll("p, li, span, a, button, h1, h2, h3, h4")) {
            const cs = getComputedStyle(el);
            if (cs.display === "none" || cs.visibility === "hidden") continue;
            if (el.closest("[aria-hidden=true]")) continue;

            // Only measure elements that render their OWN text. Otherwise a
            // wrapper is blamed for the font-size of the child that draws it.
            const ownText = [...el.childNodes]
              .filter((n) => n.nodeType === Node.TEXT_NODE)
              .map((n) => n.textContent.trim())
              .join("");
            if (!ownText) continue;

            // Uppercase tracked micro-labels (eyebrows) are a real convention.
            const isEyebrow =
              cs.textTransform === "uppercase" && parseFloat(cs.letterSpacing) > 0;
            if (isEyebrow) continue;

            const size = parseFloat(cs.fontSize);
            const min = PROSE.has(el.tagName) ? proseMin : uiMin;
            if (size < min) {
              bad.push(
                `${el.tagName.toLowerCase()} "${ownText.slice(0, 28)}" = ${size}px (min ${min})`
              );
            }
          }
          return [...new Set(bad)].slice(0, 8);
        },
        { proseMin, uiMin }
      );

      expect(tooSmall, `text below the legibility floor:\n${tooSmall.join("\n")}`).toEqual([]);
    });
  });
}
