# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

A single static Hebrew (RTL) page listing the Rakefet community WhatsApp groups as overlapping tilted circles. Clicking a circle opens a modal with the group's description and a join link. No build step, no dependencies, no tests, no package manager.

## Running

Open `index.html` directly in a browser (the VS Code launch config "Open community circles" does this in Edge). There is nothing to build or lint.

## Structure

- `index.html` — markup, all CSS (inline `<style>`), and the modal skeleton. UI text is Hebrew; keep `lang="he" dir="rtl"`.
- `community-circles.js` — the `circlesData` array (the content: `title`, `text`, `link` per group) plus rendering, the modal, and the checkerboard logic.
- `tilted_3d_ring.svg` — ring artwork layered over each circle's fill via `.circle::before`.
- `groupnames.xlsx` — source list of group names; git-ignored, not used at runtime.

## Things that span files

- **Layout**: `#circlesContainer` is a CSS grid with `auto-fit` columns narrower than the circles (`--circle-size` minus `--overlap` / `--row-overlap`), which is what makes circles overlap. Under 420px the grid is forced to 2 columns.
- **Checkerboard coloring**: because the column count changes with viewport width, CSS alone can't alternate colors. `applyCheckerboard()` groups rendered circles into rows by `offsetTop` and assigns `.tone-a` / `.tone-b` by `(row + col) % 2`; it re-runs on resize (debounced). Those classes in `index.html` control fill color, rotation direction, and z-index stacking — change CSS and JS together.
- **Links**: most `link` values in `circlesData` are still the placeholder `"פתח קישור"` rather than real URLs. `showPopup()` hides the link only when `link` is empty, so a placeholder produces a broken href.

## Deployment

Published with GitHub Pages from `main` at https://nimrodh.github.io/kehila_links/. There is no `develop` branch or separate development deploy.

The site is intentionally hidden from search engines (`robots.txt` disallows all; `<meta name="robots" content="noindex, nofollow, noarchive">`). Keep both.
