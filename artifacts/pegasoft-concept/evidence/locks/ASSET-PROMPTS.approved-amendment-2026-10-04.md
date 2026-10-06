# Pegasoft approved asset concepts and prompts

Status: APPROVED AND LOCKED by the user on 3 October 2026, with the official jet static-transition amendment authorized on 4 October 2026. J01 and the complete jet static family are generated and approved; other asset-family prompts remain unsubmitted. This approval locks the concepts, prompts and approval order; generated static assets, interactive 3D models, videos and sections retain their separate final-review gates. Changes to this approved book require explicit user approval. See [approval-lock.json](evidence/approval-lock.json) for the approved snapshot and SHA-256 integrity record.

## Shared direction and character

The recurring character is the supplied black private jet and the silver container, not a generated person. One container carries the idea through every transport stage. Preserve identity across camera views and handoffs.

Material anchor: deep black lacquer and carbon, brushed silver/titanium, a restrained sky-blue rim, pale champagne-blue practical light, navy atmospheric depth. Natural photographic details, controlled commercial lighting, clean silhouette. No orange, champagne-gold or purple spill. No new logos, readable incidental text, aircraft registration, generated UI or watermarks. Apply Pegasoft branding externally after the approved image so it remains crisp and identical.

The first aircraft edit preserves the reference photo's aircraft silhouette, fuselage/window proportions, rear-mounted twin engines, tail configuration, wing shape and stance. A new overhead view must portray that same aircraft, with the gear retracted and cabin door closed for flight. The open door and lowered stairs belong only to the ground reference edit.

## J01 — private jet lighting anchor, first approval batch

**Reference:** `docs/references/darkjet.jpg`. **Endpoint proposal:** `openai/gpt-image-2.5/sunburst/edit`. **Output:** one landscape opaque PNG, high quality, proposed 1920×1408 to retain nearly the source aspect ratio. Do not crop away the aircraft or fabricate new aircraft features. This is an identity/lighting approval image, not the flying website sprite.

**Draft prompt:**

> Edit the supplied photograph of the black private jet. Preserve the exact recognizable aircraft design, proportions, number and arrangement of cabin windows, cockpit shape, twin rear engines, T-tail, wing geometry, open door, deployed airstairs, landing gear, original camera position and overall framing. Keep its deep black polished fuselage and believable airport hangar setting. Replace all champagne-gold or amber cabin illumination, doorway light, stair lights, metal glints and decorative warm highlights with subtle pale champagne-blue light, approximately #B9E7FF, supported by restrained sky-blue #7BCBFF reflections. Cool the warm sunset/hangar spill to a neutral blue-hour atmosphere so there is no orange lighting left on the plane. Use broad soft illumination and fine reflections in black lacquer, not neon outlines. Preserve rich shadow detail, brushed titanium hardware and a premium editorial photographic finish. The sky stays dramatic and naturally clouded. No people, no new text, logos or registration marks, no different aircraft, no extra engines, wings or windows. Keep the full aircraft visible with comfortable edge clearance.

**Accept only if:** silhouette matches the supplied photo; warm lighting is removed without flattening the black paint; interior still feels like lit space; door/stairs/engines remain structurally credible. Show the source and output side by side.

## J02 — overhead jet for the crossing

**Depends on approved J01.** Image 2.5 edit/reference workflow. One transparent PNG, aircraft approximately horizontal with nose right, complete wings/tail, flight gear retracted, closed door. Request a valid 2560×1440 landscape canvas, no baked shadow.

> Using the approved private jet as the identity reference, render the identical aircraft in a strict straight-down orthographic overhead view, nose pointing to the right. Preserve its long slender black fuselage, exact wing sweep and proportions, two rear-mounted engines and T-tail silhouette. It is in flight: door closed, airstairs stowed, landing gear fully retracted. Deep black lacquer with realistic neutral/titanium highlights and restrained pale-blue edge reflections, no warm metallic glints. Center the complete aircraft on a transparent canvas; keep all wing tips, nose and tail within the frame with generous margin. Even lighting from upper left and coherent physical reflections, clean sharp alpha edges, high-end photographic product rendering. No ocean, clouds, runway, perspective tilt, camera roll, crop, motion blur, text, registration, logos, embedded shadow or extra aircraft parts.

**Code motion:** left→right translation, reference-derived oversize, slight depth cue only if observed. Independent silhouette shadow offset/blur. Trust mask tied to the aircraft's actual wing/fuselage and tail landmarks. No generated video chooses this trajectory.

**Optional J03:** strict right-facing side cutout, same aircraft and flight state, only if needed for an approved continuity view. Do not generate automatically.

## L01/L02 — lift vehicle and articulating parts

Image 2.5 stills, high quality, transparent backgrounds, same machine across a side view and front view. The lift is a realistic heavy reach stacker with graphite boom, carbon chassis, steel-blue body and black tires. Boom text is composited as “Pegasoft Solutions” later. Black/blue styling must leave working geometry legible.

> A realistic industrial reach stacker for handling a 40-foot shipping container, photographed as an isolated commercial product. Black carbon chassis, steel-blue cab/body panels, dark graphite telescoping boom, brushed titanium joints, realistic large black tires. [VIEW: strict side view facing right, boom raised toward the upper right / strict front view, boom extended centrally.] Complete vehicle with margin on transparent background, even cool studio light, readable mechanical joints and believable load-bearing proportions. Preserve one machine design across views. No container attached for this body plate, no ground shadow, no text, brand, logos, warm paint accents, background or people.

Once the body is approved, request matching isolated boom and spreader layers from the same reference if clean part extraction is needed. Do not generate independent random arm designs. Preserve caution marking function with neutral contrasting markings rather than decorative gold trim.

**Motion:** approach stack → align spreader → attach silver box → raise → camera/view pivot → lower onto truck → detach/retract. Attachment locks must precede lifting and load transfer must precede release. Review at rest, mid-lift and handoff, including reverse scroll.

## C01–C05 — persistent container

Image 2.5: one silver 40-foot corrugated high-cube container, delivered as separate end/side/roof plates. Two supporting container end plates: navy and steel blue. Keep the principal silver container's corner fittings, seams, proportions and corrugation pattern consistent. No generated labels; controlled markings are external.

> The same premium silver 40-foot high-cube ISO shipping container, brushed metal corrugated walls, consistent corner castings and believable steel hardware. [VIEW: straight-on closed door end / strict right-facing long side / strict straight-down roof.] Isolated on transparency with comfortable margin, crisp realistic edges and restrained blue-tinted specular light. Maintain identical dimensions and structural details across views. No text, serial number, logo, baked shadow, yellow/gold glow, dents that change between views or scene background.

**Motion:** a single project identity retained through lift, trailer and deck. Additional containers remain static scenery, never replace the silver anchor. Container scale and screen center must correspond across scene cuts/pivots.

## T01–T03 — truck

Image 2.5: right-facing black tractor/chassis without a cargo box, strict overhead tractor/chassis, and one approved wheel plate if needed. Derive views from the approved design.

> A premium modern black semi-truck tractor with a container-compatible trailer chassis, no container mounted. [VIEW: strict side view facing right / strict straight-down view with cab at the lower end.] Graphite body, restrained cool-blue practical reflections, realistic black tires, neutral brushed-metal fittings and authentic chassis proportions. Isolated transparent commercial product image; complete silhouette and clear attachment surfaces, no warm trim, text, logo, people, background, baked shadow or motion blur. Match the approved tractor design exactly across views.

**Motion:** arrive from right → receive the silver box → depart toward the reference's road transition; rotate separate wheels in side view; transition to top-view assets → follow reference road curve → central vertical lane. Speed readout should reflect normalized scroll movement, not a fabricated speed guarantee.

## S01 — freight ship

Image 2.5, high-quality top-down cutout. A ship with a dark graphite/steel-blue hull; orderly deck grid in silver, navy and blue. Bow faces the bottom of the canvas, matching the reference direction. Leave one precise silver anchor deck position under the central road handoff. No baked wake.

> A photorealistic modern container cargo ship in a strict vertical aerial overhead view, bow pointing toward the bottom edge, full stern-to-bow silhouette visible. Graphite hull, steel-blue deck fittings, orderly rows of silver, deep-navy and restrained blue ISO containers. Authentic ship structure with fine railings and a credible bridge. Match the approved hero silver container at the central aligned deck position; identical roof shape and metal color. Isolated transparent background, no water, wake or cloud, no shadows baked into the background, no perspective tilt, labels, logos, text, people or bright rainbow containers. Cool natural commercial lighting and readable dark details.

**Motion:** close deck enters beneath road → align silver container → ship remains on axis → continuous coded pullback → text groups reveal at reference landmarks → clouds occlude ship. Wake stays attached to stern as camera scale changes.

## O01 / V01 — ocean and wake atmosphere

Image 2.5 generates an approved deep-blue water plate. Seedance 2.5 animates that approved plate in an 8-second 720p preview with no audio. Ship and UI are absent from this video so their trajectories remain controlled.

**Still prompt:**

> Strict top-down aerial ocean texture, deep midnight navy and blue, natural small wave interference and subtle cool specular highlights, realistic water surface with no horizon, coastline, boat, wake, foam graphic, text or objects. Broad even illumination, photographic realism, low-frequency visual detail suitable beneath legible white editorial text, clean continuous composition.

**Video prompt:**

> Hold the overhead camera completely fixed. Animate only the natural blue ocean surface from the approved starting image: restrained wavelets and coherent subtle reflected light, slow physically plausible movement. Maintain the exact navy/blue palette, illumination, spatial scale and water-only composition throughout eight seconds. No camera zoom, dolly, pan, tilt, cuts, vessel, land, text or newly introduced objects. End with the same calm surface density and lighting as the first frame, suitable for testing a loop; do not force a visible reset.

**Accept only if:** no camera drift, no introduced objects, no color drift or obvious temporal reset. Seamlessness is a review outcome, not a promise from the prompt. Wake can use a separate generated texture plate or coded particles after section approval.

## K01–K03 / V02 — clouds and foggy atmosphere

Image 2.5: three separate overhead cloud masses with realistic vapor edges and transparency, two coming from top and bottom left view and one foggy slightly bigger coming from the bottom/right-bottom view. Seedance 2.5 optional 8-second atmosphere preview from an approved full cloud plate; composite masks remain still/coded layers because the video endpoint does not promise alpha output.

> Three naturally irregular high-altitude cloud masses seen from directly above, pale cool white and silver-blue, realistic soft vapor edges and subtle internal volume. Isolated on a transparent canvas with large clear margins and no cut-off feathering. Consistent soft upper-left illumination, photographic aerial realism, no sky gradient, sun, aircraft, ocean, ground, text or purple/gold tones. [Variation: wide left-edge mass / broken lower-right mass / small wispy foreground mass.] Match the same cloud scale and lighting across all variations.

**Video prompt:**

> A locked straight-down aerial camera looking at the approved cool cloud field. Only the cloud vapor evolves gently, maintaining its overall forms and spacing. Eight seconds of subtle physically plausible drift and soft volume change, with unchanged pale-blue/silver light and navy gaps. No camera rise, zoom, tilt, cut, jet, ship, text or sudden new cloud bank. End at the same density and illumination as the start.

**Code motion:** depth-layer parallax and occlusion follow scroll; jet and camera movement are separate. No arbitrary inserted transition or cut.

## E01 / E02 / E03–E05 — small editorial assets

- **E01:** sculptural aerial roadway detail, cool gray concrete and charcoal tarmac, no text/logos; retain the reference's small landscape preview location near the outcome statement. Metaphor for connected systems, not a Pegasoft facility claim.
- **E02:** unoccupied architectural technology studio, carbon/titanium details, pale-blue practical light, measured composition; used only as a clearly conceptual footer preview unless a real office photo is supplied.
- **E03–E05, only after editorial approval:** three abstract material/system stills for product systems, purposeful AI and digital craft. Photographic surfaces and clean compositions; no fabricated dashboards or readable UI. Hover swaps follow reference timing.

**Base editorial prompt:**

> Premium technology editorial photography, [approved subject], carbon black, graphite and brushed titanium with restrained sky-blue light, coherent cool grading, strong architectural composition, clean negative space, no decorative neon, people, invented product screens, readable text, logo or watermark. One photographic visual idea rather than a collage. Landscape frame.

## Site script and sound

No site narration or soundtrack is proposed. Reference walkthrough speech is instruction evidence, not a playback track. Narrative chapter copy is in [PROPOSAL.md](PROPOSAL.md). Seedance `generate_audio=false`; audio is not required for the requested visual choreography.

## Approval order

**Mandatory static-first gate:** Every named asset in this file must first be generated with Image 2.5 and presented for explicit static-asset approval. This includes J01–J03, L01/L02 and their component layers, C01–C05, T01–T03, S01, O01 and any wake plate, K01–K03, E01–E05, and the starting/ending plates needed for V01/V02. Conditional assets require a decision on inclusion; if included, they follow the same gate. A video, coded motion preview or interactive model does not replace approval of the static images.

**Approved jet gate:** J01, all ten flight-view stills and the wider separate J02 shadow are approved on carbon and porcelain. Use the existing J02 overhead PNG, independent shadow and a synchronized reversible scroll mask for the jet-to-trust crossing. Review that rendered transition for approval before website assembly. Preserve the additional approved views; use them only where an approved continuity view needs them. No further jet assets are scheduled.

**Mandatory asset-family gate for lift, containers, truck and ship:** Generate these families from all positions using Image 2.5 before model production. The approved view set must cover front, rear, left, right, top, underside and three-quarter views, plus every pose/configuration and isolated component required by the choreography. Preserve the same geometry, materials, proportions and lighting across the entire family. After approval of these static views, produce an interactive 3D model of that family and present it for final approval before website use. The review must support orbit/rotation, zoom and inspection of all sides and required moving parts; a slideshow of flat images is insufficient.

1. Approve the visual direction, typography, narrative, each asset concept/prompt and the complete static-view plan. Existing acceptance of porcelain chapters and the written hero instructions remains in effect. This file update does not authorize generation.
2. Generate J01 with Image 2.5 as the first lighting/identity anchor. Show the source and output for explicit static approval before generating its derived views.
3. Complete and review each physical asset family separately, in order: jet → lift → containers → truck → ship. Generate its named plates, all-position views and required component/configuration images with Image 2.5 from the approved identity anchor. Present the complete static set for approval and verify consistent identity, geometry and usable mattes.
4. For lift, containers, truck and ship, after the family's static set is approved, confirm the proposed 3D production method and any additional model/provider with the user, then produce and show its interactive 3D model for final approval. Image 2.5 supplies the approved images; it does not supply a mesh through the image endpoint. Do not silently substitute a model or treat static-view approval as approval of the interactive model. Complete this gate for these four families before using them in a section. The jet follows the approved static-transition gate above.
5. Generate and review the remaining named atmosphere and editorial assets with Image 2.5: O01/wake, K01–K03, E01–E05 and all V01/V02 source plates. Obtain static approval of every included asset before animation. Resolve conditional asset inclusion explicitly rather than silently omitting named assets.
6. Only after the corresponding static assets and video prompt are approved, generate the applicable Seedance 2.5 atmosphere previews. Inspect them locally with watch, report defects and show the results for final video approval.
7. Build each section draft using approved static assets, approved interactive asset-family models and approved videos as applicable. Show normal rendered playback, scroll reversibility, section transitions and interaction evidence for final section review.
8. Assemble the full website only after the required static, interactive 3D, video and section approvals. Do not automatically spend on variants, regenerate rejected families in a loop, switch endpoint families or begin full assembly from concept approval alone.
