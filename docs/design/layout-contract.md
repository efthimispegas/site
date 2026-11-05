# Core UI layout contract

All page entry points must import `apps/pegasoft-concept/src/core-layout.css`. It owns page gutters, panel insets, section spacing and card/control radii. Existing editorial variable names alias these roles; new pages must use the core roles rather than copy values.

| Role            | Desktop                     | Mobile, up to 760px |
| --------------- | --------------------------- | ------------------- |
| Page inset      | twice the fluid grid gutter | 20px                |
| Panel inset     | 24px                        | 16px                |
| Section spacing | 48px                        | 32px                |
| Card radius     | 24px                        | 24px                |
| Control radius  | 8px                         | 8px                 |

Use `.layout-container`, `.layout-section` and `.layout-panel` for new ordinary content. Reuse existing component markup and selectors for banners, cards, navigation and actions; nesting a component in an article must not override its geometry or typography. Article prose rules target `.article-section`, not arbitrary sections with IDs.

Homepage ordinary sections, footer, testimonial card interiors and Insights/article widgets consume the same roles. Cinematic camera framing, pinned scene offsets, chapter heights and scroll timing are not ordinary section padding: their controllers retain ownership. Do not move a reading column or resize the approved header to satisfy this contract. Responsive grids can change column counts while retaining inset roles.

The cookie notice and footer segmented selector own their dimensions. General panel/section rules must not scale the notice or paint selection backgrounds on the selector buttons; the selector track owns the inset active pill.

Colours, typography and CTA hierarchy remain owned by the existing theme and action styles. Selected navigation must follow route identity, clear on home/history restoration, use theme-aware ink, and retain a non-colour indicator through the existing bold type role. Selected menu links do not use underlines; keyboard focus rings remain visible. Hover/focus and visited history do not constitute selection.

For changes, verify EN/EL, light/dark, forward/back navigation, panel reuse, narrow-screen wrapping and horizontal overflow. A build alone does not establish rendered/device acceptance. Keep evidence local and out of published source.

Decorative section/heading ordinals and repeated brand-plus-index labels are omitted. Keep numeric content when it conveys data, result counts, carousel position or an actual necessary sequence. Internal numbered anchor IDs are implementation details and remain stable.
