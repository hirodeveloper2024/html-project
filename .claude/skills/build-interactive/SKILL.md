---
name: build-interactive
description: Build, restyle, or review an educational HTML interactive in this repo — scroll-driven explainers, hotspot diagrams, steppers, simulations. Use when creating a new interactive folder, changing an existing one's design or behaviour, or checking one against the project's accessibility, responsive, motion and visual standards before shipping.
---

# Building an interactive

Standards live in `CLAUDE.md` — read it first. This is the working process.

## 1. Before writing code

Pin down three things:

- **The one idea** this interactive teaches. If you cannot state it in a
  sentence, the scope is wrong.
- **The hero** — the single visual doing the teaching (a video, diagram, model).
  Everything else is support.
- **The interaction verb** — scroll, click, drag, step. Pick one. Two competing
  interaction models in one piece is the most common failure.

Then sketch a design plan in 3 lines: palette (4–6 named hex values drawn from
the subject), type (display + body pairing, with a scale), layout (one or two
sentences). Build from the plan. If any line reads like something you would
produce for any other subject, redo that line.

## 2. Scaffold

```
<name>/
├── index.html      links ../css and ../js by relative path
├── css/style.css   tokens on :root first, then layout, then components
├── js/app.js       one IIFE, no globals
└── assets/
```

Start from the semantics: write the HTML with real headings, buttons and
landmarks and confirm it reads correctly with CSS disabled. Style after.

## 3. While building

- Colour, spacing and type come from `:root` custom properties. No literal hex
  values in component rules — a contrast fix should be a one-line change.
- Give the hit area of any marker or control a fixed size independent of its
  label. Labels that participate in layout will overlap and steal taps.
- Any state the JS toggles should be a class, so CSS owns appearance.
- Watch specificity: a single-class rule that sets `display` will override
  `[hidden]`. Add `.thing[hidden] { display: none }` when both are in play.
- Media the learner must read: `object-fit: contain`, never `cover`.

## 4. Media

- Scroll-scrubbed video **must be all-intra**. Check and re-encode:
  ```bash
  # keyframe count must equal frame count (or stss must be absent)
  ffmpeg -i in.mp4 -an -c:v libx264 -preset slow -crf 20 \
         -g 1 -keyint_min 1 -sc_threshold 0 \
         -pix_fmt yuv420p -movflags +faststart out.mp4
  ```
- Never attach a media listener without first checking current state —
  `loadedmetadata` may already have fired:
  ```js
  if (video.readyState >= 1) onMeta(); else video.addEventListener('loadedmetadata', onMeta);
  ```
- A video that has never been seeked or played paints nothing. Nudge
  `currentTime` once to force a first frame.
- Always render a poster or still underneath, so a failed load degrades to an
  image rather than an empty box.

## 5. Positioning overlays on media

Hotspots go in a layer sized to the *rendered* media rectangle, not the
container — with `object-fit: contain` those differ by the letterbox bars.
Compute the rect from `videoWidth/videoHeight` versus the container, set the
layer to it, and recompute on `resize`.

Measure hotspot coordinates against the **actual media frame**, never a
differently-framed reference image. Verify by overlaying the markers on a real
extracted frame and looking at it before calling it done.

## 6. Before shipping

```bash
npm test
```

Then, by hand — the tests cannot see these:

- Tab from the top to the bottom. Every stop visible, order logical, `Esc`
  closes overlays, focus returns sensibly.
- Turn reduced motion on. Is the whole lesson still reachable?
- Read it at 375px. Is anything cropped, cramped, or reliant on hover?
- Squint at it. Does it look designed for this subject, or like a generic
  template? If the latter, the palette and type are the place to fix it.

Regenerate `standalone.html` after any change to `index.html`, `css/` or `js/`.
