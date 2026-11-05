# Pegasoft motion contract

Use this with [layout-contract.md](layout-contract.md), the approved shared components, and Taste + Impeccable + Emil guidance. New pages inherit the same character through purpose, pacing and feedback; they do not replay the homepage's cinematic journey.

## Ownership and intensity

| Surface                                   | Motion language                                                                           | Boundary                                                                                                                                                                          |
| ----------------------------------------- | ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Homepage story                            | Orchestrated aperture/reveal, parallax, scroll-driven object handovers and camera framing | Existing loader presets, chapter clocks, mobile staging, reverse-scroll mapping and reduced-motion paths remain authoritative. Do not replace their timing with interface tokens. |
| Navigation and controls                   | Immediate state; short, interruptible feedback                                            | Reuse the shared header/menu and CTA owners. No text scrambling, automatic carousel, bounce or entrance stagger for repeated editorial actions.                                   |
| Articles, privacy and other reading pages | Stationary, immediately readable content                                                  | No full opening loader or scroll-reveal gate between editorial routes. Direct entry, history navigation and scripting failure must retain content.                                |

The homepage's vocabulary includes Pulse, Reveal, Stagger, Rotate, Parallax, Scroll-driven animation, Number ticker, Orchestration, Continuity transition, Translate, Perspective, Slide in, Crossfade, Mask, Marquee, 3D tilt / Flip, Fade in / Fade out and Interruptible animation. Name an effect precisely before proposing it; its presence in the homepage is not permission to add it elsewhere.

## Shared interface tokens

`src/ui-theme.css` owns the following additive roles:

| Token               | Value                            | Intended use                                                                |
| ------------------- | -------------------------------- | --------------------------------------------------------------------------- |
| `--motion-feedback` | 120ms                            | Pointer press feedback                                                      |
| `--motion-change`   | 180ms                            | Small color/border state changes                                            |
| `--motion-enter`    | 220ms                            | Optional, purposeful small entrance; never a delay before content is usable |
| `--motion-ease-out` | `cubic-bezier(0.23, 1, 0.32, 1)` | Responsive settling for an interface element                                |

Filtering, sorting, result counts, keyboard navigation and contents disclosure update immediately. Do not animate result-list layout or document height. Optional entrance travel is limited to 8px and needs a stated orientation purpose; it is not a default for cards. Repeated actions must retarget/cancel from the visible state rather than queue. Do not use `transition: all`.

Prefer transform/opacity for movement. Pointer hover effects require `(hover: hover) and (pointer: fine)`; focus is immediate and visible. Reduced motion removes travel, scale, bounce and autoplay while preserving clear focus, selected state, readable content and useful color/opacity feedback. Do not hide content or use an indiscriminate global animation kill.

## Reading-page layout and navigation

- Reuse shared fonts, palette, CTA hierarchy, page/panel insets and banner styles. Bento groups related controls; prose stays unboxed.
- Editorial headers use the existing shell dimensions and adaptive owner, with a readable paper surface. Reserve actual header height plus a 32px gap; do not resize the header or recenter the approved desktop reading grid.
- Mobile category and sort controls form one labelled group with native selects, a result count and an explicit reset. Filtering preserves focus, sort and URL context without forced scrolling. Back/Forward restores the same model.
- Mobile contents uses native disclosure; desktop keeps the established contents column. Anchor IDs remain stable and headings land clear of navigation. Source metadata remains after prose and before tags.
- Keep native browser controls, page scroll, zoom and text selection. Do not treat a reading page as a full-screen app shell.

## Acceptance

Check EN/EL, light/dark, narrow/mobile/tablet/desktop, keyboard, rapid reversal, direct links, history recovery, empty/invalid states, reduced motion and native-browser viewport changes. State which evidence is source inspection, browser rendering or physical-device testing; a build or an emulated viewport is not a performance or physical acceptance claim. Keep review material local. Feature/design approval does not authorize a release or deployment.
