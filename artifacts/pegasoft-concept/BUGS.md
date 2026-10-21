# Pegasoft Concept bugs

GitHub issues are the canonical issue records; this index links defects and their verification from the local review checkpoint.

| Issue | Status | Area | Reported | Verification |
|---|---|---|---|---|
| [#24 — Desktop hero clips “Engineered”](https://github.com/efthimispegas/site/issues/24) | Closed · Approved · Project Done | English hero headline / desktop | 21 October 2026 | Reproduced and fixed locally; [verification](evidence/bugs/20261021/24/verification.json), [before](evidence/bugs/20261021/24/before-1501x750.jpg), [after](evidence/bugs/20261021/24/after-1501x750.jpg) |

The English desktop reveal mask now allows the full descender without moving the headline or changing its font/timing. Four desktop sizes, unchanged Greek/mobile styling, and genuine forward/reverse scrolling were checked. Nx build, lint, provenance checks and33 tests pass. [Approval readback](evidence/bugs/20261021/24/project.approved.json) confirms Closed and Done; [user approval](evidence/bugs/20261021/24/user-approval.json) records personal acceptance. The user’s screenshot remains attached to the GitHub issue; the originally supplied local path was unavailable when recorded.

The fix is uncommitted on `codex/pegasoft-concept` and not deployed. Personal visual review of this fix is approved. Physical-device qualification and all section wording remain separate pending gates.
