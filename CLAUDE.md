# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

A single static Hebrew (RTL) page listing the Rakefet community WhatsApp groups as overlapping tilted circles. Clicking a circle opens a modal with the group's description and a join link. The circles are drawn in 3D with Babylon.js (loaded from a pinned jsDelivr URL), with a plain DOM/CSS fallback. No build step, no package manager, no tests.

## Running

Serve the folder over HTTP — opening `index.html` as a file won't run the scripts in the Claude browser pane. `.claude/launch.json` defines `kehila-links`, which runs `python -m http.server 8080 --bind 127.0.0.1`. There is nothing to build or lint.

Browsers cache the local scripts aggressively. The `<script>` tags in `index.html` carry `?v=N`; bump it whenever `circles-3d.js` or `community-circles.js` changes, or you (and returning visitors) will run the old copy.

## Structure

- `index.html` — markup, all CSS (inline `<style>`), the modal skeleton, and script tags (Babylon, then `circles-3d.js`, then `community-circles.js`). UI text is Hebrew; keep `lang="he" dir="rtl"`.
- `community-circles.js` — the `circlesData` array (the content: `title`, `text`, `link` per group), the modal (`showPopup`), and the DOM fallback (`startDomCircles`). Its last lines try `Circles3D.start(...)` and fall back to DOM circles if it returns false (no WebGL, or the Babylon script failed to load).
- `circles-3d.js` — the Babylon scene: one canvas replacing the grid, a disc + torus ring + text label per circle, layout, picking, hover/focus highlight.
- `tilted_3d_ring.svg` — ring artwork used only by the DOM fallback (`.circle::before`).
- `groupnames.xlsx` — source list of group names; git-ignored, not used at runtime.

## Things that span files

- **Two renderers, one layout**: the DOM fallback uses a CSS grid with `auto-fit` columns narrower than the circles (`--circle-size` minus `--overlap` / `--row-overlap`), forced to 2 columns under 420px. `circles-3d.js` reproduces that grid in JS (`DESKTOP` / `MOBILE` constants mirror the CSS variables, RTL fill order, same column count). Change sizes in both places.
- **Checkerboard coloring**: both renderers color by `(row + col) % 2`. The DOM version needs `applyCheckerboard()` to find rows by `offsetTop`; the 3D version knows row/col from its own layout. In the DOM version tone-a (blue) sits in front of tone-b (orange) via CSS `z-index`. In 3D the rings interlock like chain links instead: each ring's plane is tilted in depth along the diagonal, in opposite directions per tone (`CHAIN_SLOPE` / `CHAIN_AXIS` in `circles-3d.js`), so the linking relies on neighbors always having opposite tones. Labels and shadows stay flat (not tilted).
- **3D camera**: orthographic with 1 world unit = 1 CSS pixel, world y pointing up (a CSS `top` becomes world `-top`). The canvas is opaque white so the 50% fills blend like the CSS `rgba()` fills; the page background must stay white.
- **3D accessibility**: invisible `.circle-focus-target` buttons are positioned over each circle. They provide tab order, screen-reader names and Enter-to-open; focusing one highlights its circle. Babylon would otherwise make the canvas focusable (`tabindex="1"`) and focus it on click, so `circles-3d.js` sets `engine.canvasTabIndex = -1` and `preventDefaultOnPointerDown = false`.
- **`link` field = group managers**: despite its name, `link` in `circlesData` holds the group managers' names (currently still the placeholder `"מנהלי הקבוצה, צריך להשלים"`; some `text` values are likewise `"תיאור הקבוצה, צריך להשלים"`). `showPopup()` shows it as plain text, `מנהלי הקבוצה: <link>`, in `#modalManagers`, and hides that line when `link` is empty.

## Deployment

Published with GitHub Pages from `main` at https://nimrodh.github.io/kehila_links/. Work happens on `develop` (pushed to GitHub, no separate deploy) and is merged into `main` to publish.

The site is intentionally hidden from search engines. What protects it:

- `<meta name="robots" content="noindex, nofollow, noarchive">` in `index.html` — keep it. It's the only real protection, because GitHub Pages can't send `X-Robots-Tag` headers.
- `_config.yml` excludes everything the page doesn't need (README, CLAUDE.md, `.claude/`, unused image) from the Pages build. Without it Jekyll publishes `CLAUDE.md` as an indexable `CLAUDE.html`. Any new Markdown or HTML file added to the repo is published unless it's excluded there or carries its own noindex meta tag.
- `robots.txt` here has no effect: crawlers only read `https://nimrodh.github.io/robots.txt`, not `/kehila_links/robots.txt`.
