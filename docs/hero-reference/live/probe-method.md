# Live Vectr hero probe method

This artifact describes the fresh live-site evidence captured on 2026-07-28. The
canonical authority is `https://www.vectrfl.com/`. The probe requested
`https://www.vectrfl.com/?trace=1`; the query enables diagnostics already shipped
by the public site and does not alter the canonical URL or measured layout.

## Profiles

| Profile ID | CSS viewport | DPR | Input/media profile |
| --- | ---: | ---: | --- |
| `live-desktop-1440` | 1440×900 | 1 | fine pointer, hover, no touch |
| `live-desktop-1920` | 1920×1080 | 1 | fine pointer, hover, no touch |
| `live-mobile-390` | 390×844 | 1 | coarse pointer, touch, no hover |

The desktop contexts used headless Chrome 150.0.7871.184 on macOS. The mobile
context used the same engine with Playwright mobile/touch emulation and an
Android 13 / Pixel 7 Chrome 149 user-agent string. The resulting engine/UA
combination is exact probe metadata, but it is not a physical-device performance
profile.

## Procedure

1. Create a new isolated browser context for each profile with English locale,
   light color scheme, and no reduced-motion override.
2. Navigate to the diagnostic URL and require HTTP 200.
3. Wait for `document.readyState === "complete"`, `document.fonts.ready`, the
   canvas `is-ready` class, and five additional seconds of settling.
4. Record CSS-pixel `getBoundingClientRect()` values, computed type/layout
   styles, document/visual viewport metrics, media-query input capabilities,
   canvas CSS/backing dimensions, and the public trace values.
5. Locate each active process-step transition by one-CSS-pixel binary search.
   Record both the last pixel before the switch and the first pixel at the
   switch. Sample the trace again after 100 ms; this exposes the damped worker
   camera separately from its target.
6. Record resource URLs and SHA-256 hashes from response bodies. Hashes identify
   the exact decoded bytes audited in this run.

## Evidence labels

- `observed`: measured directly in this probe or in a named reference frame.
- `source-confirmed`: present in an audited source, or established by exact
  source measurements with a cross-profile layout check.
- `inferred`: a derived hypothesis that remains compatible with the evidence.
- `unknown`: not exposed or not measured; implementation must not invent a
  precision value for it.

Run-specific load/reveal timings include network, cache, browser, and machine
effects. They are observations, not authored duration requirements. Likewise,
headless WebGL renderer and hardware fields identify this run but are not valid
production performance budgets.

## Known gaps

- The WebGL trace exposes progress and camera damping, not screen-space bounds
  for buildings, routes, arrows, field contacts, people, or vehicles. Those
  visual landmark bounds remain `unknown` in the live manifest.
- No physical iOS, Android, or tablet run was captured. In particular, the iOS
  asset-selection branch needs its own probe.
- Refresh-rate, battery-saver, low-memory, reduced-motion, context-loss, and
  static-fallback behavior were not measured.
- The Android emulation loaded the desktop scene asset. This must not be
  generalized into a claim that every mobile profile uses a lighter scene.
