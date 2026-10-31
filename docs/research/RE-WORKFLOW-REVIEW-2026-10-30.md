# Reverse-engineering workflow review — 2026-10-30

User request: reduce time spent on procedures and examine the Adobe-style app
rebuild approach. Three parallel read-only audits covered local DATA tooling,
UI/testing procedure, and primary REA/PhotoCraft sources. No original was
launched, observed, attached to or operated for this review. No product change.

## Findings and decisions

| Finding | Evidence | Decision |
| --- | --- | --- |
| Standing rules accumulated historical state | Local pre-review counts: AGENTS490, STATE1937, TASKS375 lines; repeated superseding releases and PAUSED/ACTIVE paragraphs | Separate standing rules, one current checkpoint and task table from verbatim archives. Current status follows the latest user instruction and active goal, not an old paragraph. |
| GUI protocol preparation exceeds the size of the question | TRANSFORM-MATCH-ACTIVE-SAMPLING-UI-PLAN.md, sections on six PS modules/eight tools, per-click captures/root point records; own minimized-window sidecar | Review a scenario once, reuse a driver, read controls and verify semantic output. Preserve owned-instance checks and immutable raw results, remove routine per-click approval work. This is a revised procedure, not a claim a new driver exists. |
| Existing evidence is valuable | Accepted references/checks linked in current STATE and task files | Two reference agents first reuse accepted findings. Fresh runs answer only an unanswered question. |
| Available decompilation does not recover editor handlers | PHYSICS-CALLER-NEXT-OBSERVATION.md: CFR covers launcher27classes; exact editor payload is non-ZIP | Inspect the actual loader/callsite narrowly if needed; do not mistake launcher code or absent readable names for editor semantics. |
| Some instrumentation routes are already negative | analysis/physics-jvmti-capability-v4-check.json; physics-serviceability-static/check.json under ignored .local/research | Do not retry unchanged JVMTI/VMStruct routes. No guessed offsets. Require a new concrete capability before another observer framework. |
| Ubuntu loop is already implemented | docs/TESTING.md; real native Session host, retained traces, production CSP | Focus existing tests during iteration; complete required integration checks once. Windows for relevant platform checks/delivery, original GUI for unanswered reference interactions. |

The new default is one question → cheapest discriminating evidence → concise
specification → implementation → independent comparison → retained result.
Use a 10–15 minute initial feasibility pass for speculative tools. This is a
planning bound, not permission to abandon required work or mislabel unknowns.
Unanswered questions stay open; unrelated supported work may continue. The
user's current before-timeline scope and two reference-agent requirement remain.

## What the Adobe example actually establishes

PhotoCraft is a likely example, not a confirmed identification of the user's
intended author. Its contributors describe clean-room implementation from
public specifications and observed behavior/look. This does not establish that
Adobe binaries or the suite were decompiled through REA. Its useful practices
are a common command engine, programmatic app control, reusable input corpora,
and separate assessments of feature breadth and behavioral/file fidelity.

Primary sources inspected on 2026-10-30 (live documents, not pinned historical
implementation evidence for any Spine version):

- [PhotoCraft contributor instructions](https://github.com/storytold/photocraft/blob/main/AGENTS.md): orientation, common command engine and implementation boundaries.
- [PhotoCraft parity assessment](https://github.com/storytold/photocraft/blob/main/docs/target-app-parity.md): installed-target inventory and explicit limits on its parity assessment.
- [PhotoCraft README](https://github.com/storytold/photocraft): project status and behavior/readiness limits.
- [PhotoCraft control protocol](https://github.com/storytold/photocraft/blob/main/docs/control-protocol.md): shared command/inspection surface (reviewed by the reference agent).
- [REA desktop inspection](https://github.com/morluto/rea/blob/main/docs/desktop-applications.md): bounded static installation inspection and retained evidence; does not run the target.
- [REA guided workflows](https://github.com/morluto/rea/blob/main/docs/mcp-prompts.md): targeted investigation and evidence distinctions (reviewed by the reference agent).

REA's provider orchestration may be useful for an identified task; installing
it alone is not evidence of faster or more accurate Spine reconstruction.
No installation, global configuration, activation or tooling retry was needed.

## Checkpoint preservation

Verbatim pre-review snapshots in `archive/`:

- AGENTS-2026-10-30-before-workflow-review.md — SHA256 ba0396b20c60f6f9b435c4f445a77c724bb2656c17bffe0c953bcdfd5f857872.
- STATE-2026-10-30-before-workflow-review.md — SHA256 a33c752f8b46e0a24c50b14f246b197cf8077dfba86958aa08f007a31be73298.
- TASKS-2026-10-30-before-workflow-review.md — SHA256 48ece93681177ef8906660faea4996ee9e2fccc637b21b559466bd233f5a4c78.

Old process ledgers, helpers, pins, predictions and failed observations remain
unchanged. New procedure does not silently alter an old frozen helper. Next
original collection needs a fresh run record and a reviewed implementation of
the simplified scenario; never reuse consumed ownership/launch receipts.
