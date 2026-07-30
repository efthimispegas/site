# Pegasoft Nx Monorepo Kickstart Plan

## Summary

- Create the Nx v22 monorepo inside existing `/Users/whiskey/Work/site`.
- Build Pegasoft as a Greece/EU-based English-language digital product studio for **design and delivery quality digital product solutions**.
- Primary goal: convert qualified visitors into booked project calls via Cal.com/Calendly.
- Design direction: **Mythic precision**. A cinematic but disciplined website with a memorable React Three Fiber “Pegasus Engine” hero, strong editorial content, and static/reduced-motion fallbacks.

## Key Changes

- Bootstrap with Next.js App Router, `pnpm`, Vitest, Playwright, GitHub Actions, and Vercel-ready settings.
- Create libraries for `brand-system`, `content`, and `experience` so design tokens, content models, and 3D/motion code stay cleanly separated.
- Messaging should emphasize three Pegasoft promises: high-craft product design, reliable delivery execution, and production-quality digital systems.
- Launch pages: `/`, `/work`, `/work/[slug]`, `/services`, `/studio`, `/contact`, `/privacy`, `/robots.txt`, `/sitemap.xml`, and `/llms.txt`.
- Use clearly labeled “Concept Lab” studies until real client work is available. No fake clients, metrics, testimonials, or awards.

## Interfaces

- Environment variables: `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_BOOKING_URL`, `NEXT_PUBLIC_CONTACT_EMAIL`, optional `NEXT_PUBLIC_ANALYTICS_DOMAIN`.
- Typed content models:
  - `ServiceOffering`: slug, title, summary, deliveryQualityProof, deliverables, idealFor, outcomes.
  - `ConceptStudy`: slug, title, label fixed to `Concept Lab`, challenge, solution, deliveryNotes, artifacts, tags.
  - `FAQItem`: question, answer, topic, citationReady.
- SEO/GEO foundation: canonical metadata, sitemap, robots policy, Organization/ProfessionalService schema, Open Graph image route, and `llms.txt`.
- Initial market: Greece/EU English, with GDPR-conscious analytics/forms and EU trust cues.

## CI, Deploy, Security

- Initialize git locally and plan for a private GitHub repo named `pegasoft-site`.
- Since `gh` is not installed locally, use the GitHub connector or add a CLI install step before repo automation.
- GitHub Actions should run install, format check, lint, unit tests, build, Playwright E2E, dependency audit, and failed-test artifact upload.
- Deploy first to Vercel with preview deployments, production promotion, and rollback via Vercel.
- Add security headers, dependency monitoring, CSP verification, and no-secret frontend booking flow.

## Test Plan

- Unit: content factories, metadata helpers, CTA rendering, reduced-motion hooks, WebGL fallback logic.
- E2E: homepage H1/CTA, keyboard navigation, mobile no-overflow, `/work` concept labeling, booking link, SEO routes.
- Accessibility: axe serious/critical clean, visible focus, heading order, contrast, alt text, reduced motion.
- 3D: canvas nonblank on desktop/mobile, graceful fallback when WebGL or motion is unavailable, no console errors.
- Performance: production build passes, lazy 3D chunk confirmed, Lighthouse targets LCP `<2.5s`, CLS `<0.1`.

## Assumptions

- Pegasoft v1 identity will be invented, but grounded around “design and delivery quality digital product solutions.”
- Booking uses an external Cal.com/Calendly URL instead of a custom backend form for v1.
