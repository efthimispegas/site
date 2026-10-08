# Pegasoft Concept checkpoint

- **Accepted:** lift/cab/wheels/reference settling, jet crossing/shadow, C01 static/model identity, corner stripes and door markings. Preserve approved inputs.
- **Delivered:** [lift/C01 integration](review/lift-container.html); full-size stacked pickup, connected settling, retraction and backing/reverse arc. Departure camera now holds fixed zoom after contact and follows the chassis; rotating bounds no longer drive framing.
- **Checks:** geometry/contact/static-stack/body exclusions pass at 601 forward + 601 reverse poses. [Camera regression](evidence/lift-container-integration/camera-stability.json): four viewport shapes, zero departure zoom reversals, exact pause/reverse restoration. New normal/quarter/reverse canvas recordings and genuine pause/resume, focus restoration and physical scroll pass. [Packet](evidence/lift-container-integration/review.json).
- **Limits:** prior raster-edge coverage remains unqualified (290/414, below 90%); it belongs to the preserved pre-fix render. No new raster-fidelity qualification. Scale, travel/radius and final framing await user acceptance.
- **Next:** review corrected departure. Revise only this derivative; stop before trailer/deck transfer or website sections.
- **Workspace:** `/Users/whiskey/.codex/worktrees/pegasoft-concept/site`; `codex/pegasoft-concept`. [Handoff](HANDOFF.md).
- **Review:** `http://127.0.0.1:8767/review/lift-container.html#viewer`; run `python3 artifacts/pegasoft-concept/review/integration-server.py`.
