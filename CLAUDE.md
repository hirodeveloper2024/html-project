# Educational HTML Interactives

Self-contained, premium-feeling learning interactives. Each one teaches a single
concept and must survive being dropped into an LMS (Articulate Rise, SCORM, a
plain `<iframe>`) as static files.

## Architecture

One interactive = one folder at the repo root:

```
<interactive-name>/
├── index.html          entry point (links css/ and js/)
├── standalone.html     generated: index.html with CSS+JS inlined
├── css/style.css
├── js/app.js
└── assets/             video, images, audio
```

Rules that follow from "must run as static files in an LMS":

- **No build step, no framework, no bundler.** Vanilla HTML/CSS/JS. Do not
  convert a working interactive into a React/Vite/Next project. If a task seems
  to need a framework, it almost certainly does not.
- **No backend, no database, no API keys** in the page. Everything ships in the
  folder.
- **Relative asset paths only** (`assets/foo.mp4`, never `/assets/foo.mp4`), so
  the folder works from any subdirectory.
- `standalone.html` is **generated, never hand-edited**. Regenerate it after
  changing `index.html`, `css/style.css` or `js/app.js`.

### Libraries

Default to zero dependencies. Reach for a library only when the experience
genuinely requires it, and say why in a comment:

- **GSAP** — only for complex timeline choreography that hand-written
  CSS/`requestAnimationFrame` cannot express cleanly (overlapping tweens,
  scrubbed multi-stage sequences). A fade, a slide, or a single scroll-linked
  value does **not** need GSAP.
- **Three.js** — only for genuine real-time 3D (a model the learner orbits or
  manipulates). A pre-rendered video, image sequence, or SVG is lighter, sharper
  and more reliable for anything non-interactive. Prefer it.

Load either from a CDN with SRI, or vendor it into `assets/`. Never add a
bundler to accommodate a library.

## Accessibility — WCAG 2.2 AA

This is a hard requirement, not a polish pass. `npm test` enforces much of it.

- **Semantic HTML first.** Real `<button>`, `<nav>`, `<section>`, `<figure>`,
  `<h1>`–`<h6>` in order with exactly one `<h1>`. A `<div>` with a click handler
  is a bug. ARIA supplements semantics; it never replaces them.
- **Keyboard.** Everything operable by mouse or touch is operable by keyboard.
  Logical tab order, no traps, `Esc` closes any overlay, focus moves into a
  dialog on open and returns to the trigger on close. Every focusable control
  has a clearly visible `:focus-visible` style — never `outline: none` without a
  replacement.
- **Touch targets** are at least 24x24 CSS px (2.5.8); aim for 44x44 on primary
  controls. Keep a control's hit area independent of its label, or dense markers
  will steal each other's taps.
- **Contrast** at least 4.5:1 for text, 3:1 for UI boundaries and graphical
  objects. Verify computed values — a low-alpha token that looks fine on one
  surface often fails on another.
- **Never rely on colour, hover, or motion alone** to convey meaning. Hover
  states need a focus equivalent; touch devices have no hover.
- Respect `prefers-reduced-motion` (below) and keep text resizable to 200%.

## Responsive

Design for **375 / 768 / 1440** and everything between; `npm test` runs all three.

- Mobile-first; fluid type via `clamp()`; layout via flex/grid with `gap`.
- **No horizontal scrolling at any width.** Nothing may spill past the viewport.
- Diagrams and media must never be cropped — `object-fit: contain`, never
  `cover`, for anything the learner is meant to read. Letterboxing is correct;
  silently cutting off the subject is not.
- Panels become bottom sheets on mobile, not shrunken desktop modals.
- Mind mobile viewport height: prefer `dvh` over `vh` where the URL bar matters.

## Motion

Motion should explain something — reveal structure, show cause and effect,
maintain spatial continuity. Decoration that merely signals "this is animated"
is noise; cut it.

- Transitions 150–400ms with an intentional easing curve. Ease-out for entrances.
  Nothing that makes the learner wait.
- Animate `transform` and `opacity`. Avoid animating layout properties.
- Drive scroll-linked work through `requestAnimationFrame`, never on every
  scroll event.
- **Scroll-scrubbed video must be encoded all-intra** (a keyframe on every
  frame). With sparse keyframes the browser decodes from the last keyframe on
  every seek and the picture appears frozen. Verify: `stss` absent, or a
  keyframe count equal to the frame count.

### `prefers-reduced-motion`

Provide a genuinely simplified experience, not the same page with faster
animations:

- No scroll-jacking, no parallax, no infinite/looping animation.
- **All content reachable without motion.** If the payload sits behind a
  scroll-driven reveal, expose it directly — a learner with reduced motion must
  not lose the lesson.
- Offer an explicit control (a play button) rather than autoplaying.

## Visual design

Premium and editorial. Every interactive should look like it was designed for
its subject, not assembled from a component library.

**Do:**
- Derive the palette and type from the subject matter. Pick deliberate neutrals
  (a grey biased toward the accent reads as chosen; pure `#808080` reads as
  default).
- Establish a type scale and stay on it. Pair a display face with a readable
  body face. Generous whitespace, `text-wrap: balance` on headings, ~65
  characters per line of running text.
- Let one element be the hero — usually the thing being taught — and keep
  everything around it quiet.
- Define colour as CSS custom properties on `:root` so contrast is fixable in
  one place.

**Do not** — these read instantly as generic AI output:
- Dashboard-chrome aesthetics: stat-tile grids, KPI rows, sidebar + card layout,
  or a "control panel" frame around content that is not a control panel.
- Purple-to-blue gradient heroes; `#F4F1EA` cream with a terracotta accent;
  near-black with one acid-green pop.
- Emoji as section markers or icons. Decorative icons next to every heading.
- `border-radius` and a drop shadow on every element by reflex.
- Numbered eyebrows (01 / 02 / 03) on content that is not actually a sequence.
- Centring everything, or filling space with meaningless flourish.

Text is design material: write plainly, name things as a learner would, and cut
any sentence that does not teach.

## Testing

```bash
npm test                 # all specs, all three breakpoints
npm run test:mobile      # 375 only   (also :tablet, :desktop)
npm run test:a11y        # axe + keyboard + touch targets
npm run serve            # static preview on :4173
```

Specs live in `tests/` and auto-discover any `<folder>/index.html`, so a new
interactive is covered the moment it exists — no test file needs editing.

- `a11y.spec.js` — axe-core against WCAG 2.2 AA, heading order, accessible
  names, visible focus, 24x24 targets
- `responsive.spec.js` — overflow, element spill, media cropping, legibility
- `reduced-motion.spec.js` — reduced-motion behaviour at every breakpoint

Automated checks catch roughly half of real accessibility problems. Before
calling an interactive done, also tab through it start to finish, and confirm it
is usable with reduced motion on.

**Fix the page, not the test.** These thresholds encode the product standard; if
one seems wrong, change it deliberately and say why.
