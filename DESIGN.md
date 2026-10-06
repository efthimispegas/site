---
name: Pegasoft
description: Current site and hero design vocabulary, governed by the hero baseline plan
colors:
  hero-sky: "#c8dae5"
  hero-surface: "#fcfcfc"
  hero-ink: "#050419"
  hero-muted: "#5d6479"
  hero-indigo: "#3d4bdb"
  scene-red-route: "#ff4d67"
  scene-blue-glow: "#0e94fb"
  scene-blue-core: "#f4fdff"
  site-paper: "#f8f5ee"
  site-gold: "#c7a45b"
typography:
  hero-display:
    fontFamily: "Roboto, sans-serif"
    fontSize: "93px"
    fontWeight: 500
    lineHeight: 0.929
    letterSpacing: "-5.76px"
  hero-body:
    fontFamily: "Roboto, sans-serif"
    fontSize: "24px"
    lineHeight: 1.2
  site-display:
    fontFamily: "Iowan Old Style, Cormorant Garamond, Georgia, serif"
rounded:
  hero-medium: "12px"
  hero-large: "24px"
  pill: "156px"
spacing:
  hero-xs: "12px"
  hero-sm: "18px"
  hero-md: "20px"
  hero-lg: "24px"
  hero-xl: "40px"
  hero-2xl: "48px"
  hero-3xl: "96px"
  hero-4xl: "128px"
components:
  hero-pill-dark:
    backgroundColor: "{colors.hero-ink}"
    textColor: "{colors.hero-surface}"
    rounded: "{rounded.pill}"
    padding: "0 24px"
    height: "48px"
  hero-pill-light:
    backgroundColor: "{colors.hero-surface}"
    textColor: "{colors.hero-ink}"
    rounded: "{rounded.pill}"
    padding: "0 24px"
    height: "48px"
---

# Design System: Pegasoft

## Overview

**Creative North Star: "A guided industrial energy journey"**

The hero is a scroll-led spatial story: a light industrial city, red activation feeders, blue energy travel, a field pulse, and an arrival mark. Pegasoft identity and copy are intentional exceptions to the Vectr reference. The [hero baseline plan](docs/pegasoft-hero-baseline-plan.md) is the sole authority for visual fidelity, phase status, and acceptance. This document records the current implementation vocabulary; it does not certify that the candidate matches the reference.

The rest of the site uses warm paper, ink, gold, and a serif display voice. Keep those site tokens distinct from the hero's cooler scene and sans typography. **Key characteristics:** source-constrained composition, readable foreground copy, material depth, restrained interface chrome, and motion tied to the journey.

## Colors

The hero UI uses cool sky and porcelain around nearly black text and indigo controls. The 3D scene uses pale structures with distinct red feeders and a blue route whose bright core remains legible against its glow. These are current code values, not approved reference matches.

**The Source Comparison Rule.** Tune palette, core, glow, and surface response against matched reference frames before treating a local color as final.

## Typography

The hero currently uses Roboto for its large two-line title and supporting copy, with a tightly tracked `93px` desktop title. The wider site uses Iowan Old Style/Cormorant for display and Avenir Next/Helvetica for body. Verify exact hero wrapping and clipping at the reference desktop profiles before changing its metrics.

## Layout

The hero is a fixed viewport composition over a scroll journey. Copy is centered above the 3D scene, then yields to scene and flow content as progress advances. The current CSS uses a `456svh` journey and a desktop hero copy width of about `698px`; these are implementation facts. The baseline requires matched source anchors, negative space, neighboring motion, and later separate responsive qualification.

## Elevation & Depth

Depth belongs primarily to the 3D scene: occlusion, pale industrial surfaces, shadows, fog, reflections, and energy core/glow. The current scene uses roughness values in `hero-materials.ts` and a compatibility light rig. The baseline calls for final material and lighting comparison across all scenes; current values are provisional.

## Shapes

The interface uses restrained rounded rectangles and pill actions. Scene silhouettes, route tubes, structures, and arrival marks must follow source geometry rather than generic primitives. Do not change the accepted camera or route knots to compensate for an inaccurate city or material.

## Components

### Hero pill actions

Dark, light, and glass variants share a `48px` height, `24px` horizontal padding, uppercase small labels, and a pill silhouette. Hover introduces indigo where fine-pointer input is available. Keyboard focus must remain visible.

### Loader and scene

The loader owns the viewport until the actual Canvas is ready. Its elliptical contour and core reveal into the settled landing, after which scroll and scene state own the journey. The focal motion is the landing-to-activation handoff; later route and pulse motion must remain continuous and reversible.

### Flow steps

The numbered flow sequence exposes scene progression and supporting copy. Active state must be visually and semantically clear, including the button-to-description relationship.

## Do's and Don'ts

### Do

- **Do** compare normal playback and matched stills to the reference at recording and live desktop profiles.
- **Do** keep Pegasoft copy and accessibility alternatives while matching the source's visible composition and behavior.
- **Do** preserve continuous slow, fast, and reverse motion through each handoff.

### Don't

- **Don't** call a proxy scene, passing lifecycle test, or this token inventory final visual acceptance.
- **Don't** add decorative motion that competes with scroll responsiveness or obscures readiness.
- **Don't** silently promote Phase 16, responsive, accessibility, or performance status from isolated checks.
