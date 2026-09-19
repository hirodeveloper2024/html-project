// @ts-check
const { defineConfig, devices } = require("@playwright/test");

const PORT = Number(process.env.PORT || 4173);

/**
 * Three required breakpoints. Mobile and tablet are real touch contexts
 * (hasTouch, isMobile), because touch-target and hover-dependency bugs only
 * surface when the browser reports a coarse pointer.
 *
 * Reduced motion is not a project here — `tests/reduced-motion.spec.js` calls
 * page.emulateMedia() itself, so it is exercised at every breakpoint.
 */
module.exports = defineConfig({
  testDir: "./tests",
  outputDir: "./test-results",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : [["list"]],

  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },

  projects: [
    {
      name: "mobile-375",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 375, height: 812 },
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: "tablet-768",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 768, height: 1024 },
        deviceScaleFactor: 2,
        hasTouch: true,
      },
    },
    {
      name: "desktop-1440",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
      },
    },
  ],

  webServer: {
    command: `node tools/serve.js --port ${PORT}`,
    url: `http://localhost:${PORT}/`,
    reuseExistingServer: !process.env.CI,
    timeout: 20_000,
  },
});
