# Pegasoft Concept — website implementation plan

## Authority and scope

- Use this file as the main implementation plan for the entire Pegasoft Concept website. Update its instructions when the user changes an agreed decision; do not append approval history or audit reports here.
- Use [CURRENT.md](CURRENT.md) only for the active checkpoint, checks, blocker and exact resume action. Keep prompts in the locked [ASSET-PROMPTS.md](ASSET-PROMPTS.md), content slots in [content-plan.json](content-plan.json), and evidence in the existing generation/evidence folders. Keep these consumers consistent with this plan.
- Build the new app at `apps/pegasoft-concept`. Keep preparation, generated assets and review artifacts in `artifacts/pegasoft-concept`.
- Preserve unrelated work. Do not reuse the existing `apps/pegasoft` implementation or apply the other apps’ `docs/` guidelines to this project.
- Implement the home page, contact route, navigation, cookie flow and responsive interactions. Confirm additional page destinations before implementing them.

## Resume action

- Preserve the [approved 3D lift](generation/lift-family/model-draft/model-carbon-unified.glb) and its [acceptance/hash](generation/lift-family/model-approval.json). Keep the baseline read-only; produce mechanical derivatives in separate files.
- Retain the accepted full-length closed boom, joint coverage, rear hoses, three steps per side, landings, metallic rails and door grips. Preserve the agreed carbon color and [approved lift surface](generation/lift-family/material-surface-approval.json): #11151B, metalness 0.35, roughness 0.50, zero emission and subtle neutral grain.
- Use the [connected-component attachment map](generation/lift-family/model-draft/attachment-ownership.json) for spreader hardware. Preserve every mapped component intact; do not revert to wider spatial cuts. Retain the [approved attachment repair](generation/lift-family/attachment-repair-approval.json) and its locked source snapshot. [Attachment integrity checks](evidence/lift-attachment-repair-checks.json) pass; full mechanical travel and exact inscription are [user-approved](generation/lift-family/full-mechanics-approval.json).
- Qualify every lift body section and standalone mechanical part for solid, continuous exterior geometry before further motion approval: chassis/rear body, cab, wheel wells, tires/rims, boom, sleeves/rods, spreader, hoses, steps, landings, rails and handles. Preserve genuine joint clearances and sliding cavities; close their walls and exposed ends. Do not hide missing geometry with double-sided rendering or cosmetic overlays.
- Retain the [user-approved localized amendment](generation/lift-family/solid-amendment-approval.json) and its read-only snapshot. Preserve original faces, silhouette, material roles, pivots and attachment ownership, plus accepted fillings and rear-panel infill, except the expressly authorized upper-cab facade amendment below. Do not reconstruct the whole lift or replace complete components. No paid job is authorized.
- Keep fenders, blue panels, chassis and entry hardware stationary during wheel rotation. Use complete closed tire, rim and hub volumes at each original axle. Keep tread, both sidewalls and inner faces solid through a full turn. Positive scroll must roll clockwise in the exterior review view; reverse scroll must roll counterclockwise. Stop rotation when chassis travel stops.
- Define explicit spreader pickup/contact points and attach the diagnostic payload to that frame. Its top must visibly meet the pickup mechanism, centered below it and outside the lift body; verify contact through hinge, extension and balance. Do not use a deliberate floating clearance. Keep its accent visible on both backgrounds; no production container asset is approved by this proxy.
- Preserve the [approved full mechanics and inscription](generation/lift-family/full-mechanics-approval.json) and its read-only source snapshot. Keep the accepted rig review unchanged. Build reference-motion derivatives in separate files; recheck every additional travel pose.
- Assess rigid-part separation under the [approved method](generation/lift-family/model-method-approval.json). Separate chassis, wheels, boom sections, hydraulics and spreader; verify the derived rest pose against the locked model before adding motion.
- Author constrained joints and endpoint-driven hydraulics/hoses only after separation is qualified. Preserve pivot centers, section overlap and continuous attachment. Stop and present approaches if qualification requires substantial machine reconstruction or another paid job.
- Present actual mechanical controls and normal playback for articulation review. The static model is already approved; this gate assesses the new mechanics.
- Retain exact **PEGASOFT Solutions** lettering in **Manrope upright 650**, **#B9E7FF**, on the right exterior main boom face only. Keep it attached to the main boom through travel; preserve accepted geometry/material identity. Retain the full-rig inscription approval. Use the diagnostic load proxy until the separate container is approved.
- Review the [lift/camera and brief settling draft](review/lift-motion.html?revision=20261005-physical-cab#viewer) at normal and quarter speed, in close-up, with pause/resume, reverse and physical page scroll. Use the [measured calibration](evidence/lift-reference-calibration/calibration.json) and [rig checks](evidence/lift-motion-checks.json); obtain separate rendered-motion approval before continuing.
- Keep the wheel/load corrections in the separate motion derivative: use the [amended ownership map](generation/lift-family/model-draft/wheel-ownership-motion-amended.json), retain the original map, use [closed wheel volumes](review/lift-wheels.js) with real rubber/steel surfaces and the shared carbon hub recipe; retain the original fragmented wheel meshes hidden as comparison inputs. Seat the proxy roof at actual pickup surfaces. Do not rebuild the rest of the lift. Require [closed-volume and scroll-direction checks](evidence/lift-wheel-volume-checks.json), [integrity checks](evidence/lift-integrity-checks.json) and rendered rotation/contact review before acceptance.
- Use the approved focused cab amendment in [lift-cab.js](review/lift-cab.js). Keep one coherent framed volume, actual transparent panes and a solid seat, steering column/wheel, console and pedals. Use approved L01/family silhouettes and the [real Kalmar EGO interior reference](evidence/lift-cab-reference/reference.json). Do not merge side/front pictures or bake interior imagery into glass.
- Remove only the affected upper-cab facade and its misassigned faces/cab-derived caps. Preserve the original roof, blue lower shell, access hardware, genuine hydraulic surfaces and all other lift parts. Keep the original GLB and accepted rig locked; apply the amendment only in the motion derivative.
- Obtain visual approval of the [cab and solid-wheel draft](review/lift-motion.html?revision=20261006-solid-wheels#viewer), wheel rotation and proxy attachment. Inspect continuous orbit, both surfaces and the later reference camera trajectory; require [cab scope checks](evidence/lift-cab-checks.json), motion/contact checks and [complete evidence](evidence/lift-motion-review.json). Do not advance to the container gate before acceptance.
- Reuse 14 accepted motion inputs; generate no overhead, underside or unnecessary assets. Preserve all prior GLBs, static plates and evidence. No paid retries or replacements are authorized.

## Execution and approval order

- Finish each physical family in order: jet → lift → containers → truck → ship. Reuse accepted assets rather than reopening completed static gates.
- Before every remaining asset/family batch, read the global color contract, include its exact carbon clause in the reviewed prompt and specify each material role. Review unspecified non-carbon paints/finishes before generation.
- Before each remaining family batch, agree its motion use, model method and minimum necessary input manifest. Explain the need for each selected image, pose or component.
- Generate only those required inputs with Image 2.5; assess and present them for explicit static approval before model production. Do not generate overhead/top/roof-only, underside, unused angles, speculative parts or surplus variants.
- Produce lift/container/truck/ship interactive models only under their agreed method. Present orbit, zoom and required moving-part inspection for final model approval. The jet follows its settled static-image route.
- Require coherent volumetric construction for future model families. Use actual clear glazing and a consistent interior where visible through required camera trajectories; no merged image facades.
- Require solid geometry for every body and standalone component in each mechanical family. Audit complete components across material partitions, distinguish physical openings from defects, and inspect visible exteriors/interiors through the required motion. Static appearance and source-face conservation alone do not qualify a moving model.
- Select atmosphere and editorial assets only for an agreed section need. Obtain static approval first and separate prompt/output approval for any video.
- Calibrate the relevant motion contract, build a reviewable section draft, show normal playback and interactions, then obtain final section approval.
- Scaffold the new app through the Nx generator workflow after section build approval. Use the workspace package manager and Nx targets for applicable checks.
- Assemble the full home/contact experience only after its required asset, model, video and section gates pass. Obtain final website review before public release.
- Respect the current usage allowance. The credit exception covers lift-family review; confirm an extension before production outside that allowance.

## Reference and fidelity requirements

- Use [United Carriers](https://unitedcarriers.com/) as the main layout, section order, scroll choreography, reveal, pinning, zoom, cursor and transition reference.
- Use [NexDash](https://www.nexdash.com/#contact) for typography direction and contact-page hierarchy; use [Sharplink](https://www.sharplink.com/about) for the blue accent direction.
- Follow the supplied walkthrough instructions and the written hero requirements below. Reuse local transcripts and the [motion viewer](review/motion.html); inspect only the event window needed for the current section.
- Target the reference’s timing, movement and overlapping entrances/exits. Measure and compare rendered behavior before claiming a match.
- Replace every reference content and media slot with approved Pegasoft material. Preserve the reference’s layout and interactions while presenting a technology company.

## Visual system

- Convey a luxurious, cinematic technology company through black lacquer, carbon, brushed titanium, restrained blue light, strong negative space and large upright typography.
- Carry one silver container through strategy → design → engineering → delivery → scale. Keep the lift, truck, ship and private jet as the agreed visual metaphors.
- Use `#05070A` black for hero depth; `#11151B` carbon for services, editorial, CTA and footer; `#061E3B` deep blue for ocean and shadows.
- Use `#147DFF` Pegasoft blue for CTAs, network routes and active states; `#7BCBFF` sky blue for rim light; `#B9E7FF` champagne blue for soft practical light and metal highlights.
- Use `#EDF2F7` cool porcelain for metrics, lift, road, trust, FAQ and contact; `#F5F8FC` for primary text on dark surfaces. Preserve the reference’s dark/light chapter contrast.
- Apply the [global material-color contract](material-color-contract.json) to every future asset, generator prompt, model and repair: jet, lift, containers, truck, freight ship and editorial/architectural imagery.
- Resolve all painted “carbon”, “carbon black”, “dark graphite”, “graphite boom/hull/casing” descriptions in the locked asset book to the agreed `#11151B`. Graphite is a material description, not an extra palette token. Use no separate grey-blue graphite paint hex.
- Treat `#202A36` and `#26303C` in prior repair GLBs/manifests as unapproved draft values. Preserve original evidence; replace those carbon assignments in the next reviewed output. Do not recolor or regenerate already approved images by default.
- Preserve distinct blue paint, silver/titanium, rubber and glass roles. Keep scene/background colors separate from painted carbon. Follow the container’s silver identity and separately selected navy/blue variants; do not convert them to carbon.
- Review physical properties by material role: glossy jet lacquer, satin carbon structural paint, brushed metal and rubber need different finishes. Parts intended to share a carbon finish must share its settings and texture density. Base-color alignment does not approve new roughness, metalness, grain or coat settings.
- Keep generated champagne-blue lighting within this palette. Remove warm champagne-gold, orange and purple spill; preserve the accepted lift’s functional safety markings.
- Use upright Manrope 600–700 for display headlines/numerals, around −0.045em headline tracking; DM Sans 400–500 for body, navigation and forms; IBM Plex Mono 400 for small technical labels.
- Use the existing licensed files in [review/fonts](review/fonts/). Preserve their license notices. Avoid italics; keep body tracking natural and wider tracking confined to short uppercase labels.
- Apply production lettering and branding outside generated imagery so it stays crisp and consistent.

## Home-page sequence

- **Loader → hero:** reproduce concentric radar lines, terminal pulse, zoom/aperture transition and staggered content entry. Build the rotating dotted 3D globe and raised connection arcs as live graphics with Pegasoft accents.
- **Hero navigation:** use a taller transparent menu; keep the logo’s reference size inside its left side and horizontal links inside the center-right. Preserve exact reference link rollovers and CTA effects with blue accents. Use About, Expertise, Industries, Insights, Careers and Contact; confirm destinations.
- **Hero copy:** use “Every idea. Engineered to matter.” and “Strategy, design and engineering, carried through by one accountable team.” in review drafts. CTAs: “Talk with us” and “Our services”.
- **Outcome / metrics:** use “We build technology. We own the outcome.” Preserve the pinned statement, atmospheric hero exit, metric composition, value animation and circular progress cursor. Request real metrics; use approved qualitative labels in drafts until supplied.
- **Lift / build:** approach the silver container, attach and raise it; pivot from container-end/front view to side for the truck handoff. Keep the container connected throughout the pivot; include the brief spreader/load settling swing after attachment and lift-off.
- **Services / deliver:** retain the split chapter with the side-view vehicle above it. Use “Everything your product needs. One team.” Review the six planned capabilities: Product strategy, UX/UI design, Web engineering, Mobile applications, AI & automation, Cloud & platform engineering.
- **Road / dependability:** use “Precision at every milestone.” Keep the three-column chapter, central road, pinned left heading and advancing right blocks: Visible progress, Integrated delivery, Ongoing evolution. Pivot the truck camera overhead and follow the curved-to-vertical road path.
- **Ship / scale:** align the same container with the entering ship deck; pull back continuously while revealing heading and capability groups. Use “Built to work at scale.” Review the planned pillars: One accountable team, Clear project visibility, Engineered foundations, Transparent scope, Fast decisions.
- **Clouds → jet → trust:** occlude the receding ship with layered clouds; cross the oversized black private jet left→right with its independent shadow and coupled trust reveal. Use “Trusted to build what comes next.” with genuine approved testimonials only.
- **Partners:** preserve the ordered logo grid; request supplied, authorized relationships and logos before populating it.
- **Insights:** preserve article rows, changing hover previews and atmospheric entrance. Use “What’s next in technology.” Review drafts on connected product systems, purposeful AI and digital craft; obtain final editorial approval before publishing.
- **FAQ:** preserve the spacious accordion. Cover scope, process, collaboration, timelines, ownership and support with approved answers.
- **Closing CTA:** use “Ready to build what’s next?” Restore concentric rings, the blue cursor CTA and trailing afterimages; reproduce the header-to-section CTA handoff. Provide keyboard and touch access to Contact.
- **Footer:** preserve the industries/services selector, changing marquee, office/map block and particle wordmark that disperses on hover and reforms. Use “Pegasoft Solutions”; remove the reference award label and populate company details only after approval.

## Contact and cookies

- Build the contact route with NexDash’s large statement, two-column introduction/form hierarchy, underline fields and Pegasoft typography/palette.
- Use General, Company owner, Investor and Careers tabs with audience-specific fields. Confirm the planned field sets before implementation: General—name, email, optional company, message; Company owner—name, business email, company/website, project goals; Investor—name, email, firm, investment interest; Careers—name, email, portfolio/LinkedIn, discipline, introduction.
- Preserve shared entered values across tab changes. Confirm validation, privacy wording, recipient and submission endpoint; show success only after a real successful submission.
- Reproduce the wide floating cookie panel: copy left, settings/reject/accept controls right, rounded carbon surface and blue active controls.
- Implement persistent preferences, settings modal and footer reopening. Describe and control the actual tracker categories; verify each consent state.

## Asset and motion requirements

- **Jet:** reuse the approved black private-jet family, J02 overhead transparent cutout and separate silhouette shadow. Do not produce a jet mesh, video or new views. Bind translation/scale, shadow and trust mask to one reversible physical-scroll progress.
- **Jet shadow:** preserve X **+19.18 px**, Y **−13.22 px**, width **113.05%**, height **109.2%**, blur **3.31 px**, opacity **30.27%**. Keep offsets/blur constant in displayed scene pixels as the jet scales; restore this preset on reset. Preserve the existing review editor’s measurement, transform and copy controls. Use [approved settings](generation/jet-family/shadow-measurements-approval.json).
- **Lift:** reuse L01 and the accepted 14 motion references. Preserve the exact external **PEGASOFT Solutions** Manrope inscription and champagne-blue treatment using [branding placements](generation/lift-family/branding-placements.json). Keep chassis/wheels, hinge, nested boom sections, hydraulic rams and spreader independently controllable; include the joint freedom needed for the brief loaded settling swing, with a balanced resting pose.
- **Lift handoff:** drive align → attach → lift → camera pivot → lower onto trailer support → release → retract from one reversible timeline. Transfer container ownership only when support is established. Use working-pose stills to guide the rig, not as a crossfade substitute for articulation.
- **Step 02 / lift and camera pivot:** after attachment and initial lift-off, add the small pendulum-like settling movement of the spreader/load. Keep the container rigidly connected to the spreader; let the assembly oscillate briefly toward balance without slipping, detaching or looping continuously. Preserve this attachment through the camera pivot; calibrate the sway/pivot overlap rather than imposing a new pause.
- **Settling review:** retain the measured local-Z projected tilt curve (about 1.3° peak) from the fixed-camera lift sequence. Drive it from the same reversible scroll phase as attachment and lift; use no free-running oscillator. Retain the immediate lift-to-pivot boundary and reference camera-roll keyframes. Show repeating attachment → lift-off → swing → balance at normal/slow speed, with pause/resume and reverse restoration. Use continuous native/ordered playback and dense edge tracking rather than sparse stills. Treat inferred camera yaw and final framing as draft values until visual approval with the production container; generate no extra stills for this movement.
- **Containers:** build one persistent silver 40-foot container identity. Select only necessary end/side/oblique inputs and supporting colors. Keep dimensions, roof proportions, material and world pose consistent across lift, truck and ship.
- **Truck:** select only necessary model inputs/components. Implement right-side entry, load support, wheel rotation, side-to-overhead camera pivot and coded road-path movement. Render overhead views from the model.
- **Ship:** select only necessary model inputs. Render aligned deck placement from the model, keep the scene axis continuous and control pullback deterministically. Anchor wake to the stern; keep atmosphere independent of ship/camera movement.
- **Ocean/clouds:** generate only the selected necessary plates. Control cloud depth/parallax and occlusion in code; keep jet/ship trajectories out of atmospheric videos.
- **Editorial/footer images:** generate only approved section/content selections. Keep conceptual imagery distinct from actual Pegasoft facilities or products.
- **Globe, loader, road, icons and particle lettering:** implement as live/procedural graphics with editable interaction and scroll relationships.

## Generation controls

- Use fal Image 2.5 for required static creation/refinement: `openai/gpt-image-2.5/sunburst/text-to-image` or `openai/gpt-image-2.5/sunburst/edit`.
- Use fal Seedance 2.5 for approved video work: `bytedance/seedance-2.5/image-to-video`. Start agreed atmospheric previews at 8 seconds/720p, H.264, `generate_audio=false`; confirm configuration and allowance before final-resolution jobs.
- Inspect current provider schemas, availability and pricing before paid production. Select valid dimensions and transparency for the intended layer; preserve complete silhouettes and clean alpha edges.
- Follow the locked prompts and approval order. Preserve request IDs, exact inputs, output hashes and accepted originals in the owning generation folder.
- Present generated outputs for final user review before section/full-site use. Do not automatically spend on variants or corrections.
- If a requested model is unavailable, stop and suggest an alternative for approval. Confirm any new 3D production method/provider; do not silently substitute it.
- Inspect generated videos with watch’s local engine before output review. Add no site narration or soundtrack.

## Motion reconstruction and calibration

- Reuse [motion contracts](evidence/motion/motion-contracts.json), [native-frame evidence](evidence/motion/motion-manifest.json) and [live geometry](evidence/motion/live-geometry.json). Do not repeat the full walkthrough audit for a local decision.
- Locate fast changes through low-resolution native-frame screening with source presentation timestamps, then inspect focused source-cadence clips, slow playback, frame steps and relevant object crops. Do not rely on increased uniform sampling or interpolated frames.
- Separate elapsed-time loader/globe motion, physical-scroll transport/camera/reveals and pointer-driven hover/cursor response. Do not use recording duration or region-change energy as a tween/easing specification.
- Before implementing an event, measure start/end, normalized position/scale, opacity, view change, occlusion, attachment/release, pin interval and easing. Keep unmeasured contract values unset; identify uncertainty instead of inventing measurements.
- Use real forward/reverse scrolling and rendered rectangles/transforms/masks. Sample smaller steps at transition boundaries and compare matching settled scroll positions; inspect frame response where lag matters.
- Calibrate loader rings, central/outer pulse disks, aperture, zoom and headline overlap independently. Calibrate globe entry/exit and reference rollover response.
- Inspect the short lift-off settling motion through continuous native-cadence playback and focused slow/repeating playback, not increased uniform frame sampling. Distinguish joint/load swing from boom translation and camera movement; leave unsettled measurements unset.
- Fit vehicle/container geometry and progress before atmosphere. Track the same container through every handoff; align road-to-deck roof shape and camera center.
- Fit the jet trust mask to the private jet’s actual wing, fuselage and tail landmarks. Check entry, full crossing, shadow visibility and complete exit.
- Compare normal playback and aligned rendered frames at the same viewport, elapsed loader time or actual scroll landmark. Check velocity/scale continuity, clipping, overlapping reveals and reverse restoration before final section review.

## Content completion and website acceptance

- Replace every slot in [content-plan.json](content-plan.json): headings/body, metrics, globe/map labels, services, quotes/portraits, partner marks, articles/metadata, FAQ, CTAs/links, form states, contact/legal/social details, cookies and media/branding.
- Treat the working copy above as review copy until final content approval. Request actual company facts, office/headquarters data, metrics, testimonials, relationships and submission destination; keep missing material visibly pending in review drafts.
- Do not invent company claims, clients, awards, payments, facilities or product screenshots. Do not retain reference company content, identities, links or recipients in the product.
- Before full-site approval, search source/content for leftovers and inspect all rendered routes, menus, responsive layouts and interaction states. Verify every destination and form/cookie message against real behavior.
- Verify normal playback, relevant boundaries, forward/reverse scroll, hover/cursor response, particle restoration, accordion behavior, form tabs/submission and cookie persistence/reopening.
- Review the source aspect ratio, normal laptop and mobile layouts. Check keyboard access, touch behavior and reduced-motion fallbacks; preserve a coherent journey without pointer-only access.
- Run checks appropriate to each changed slice. Inspect rendered output; source/build success does not replace visual or interaction acceptance.
- Present each completed slice for user approval. Record implementation, checks, rendered verification and user acceptance separately in the checkpoint/evidence.
- Release only when every content slot is approved or explicitly omitted and the required asset, model, motion, section and full-site reviews are complete.
