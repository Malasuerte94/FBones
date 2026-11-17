# F313 — AI MCP server

User request: expose all currently available editor functionality to AI clients,
including auto trace, meshes and physics, with quick configuration near File and
documentation intended for AI agents. This is an explicit FBones addition.

Preimplementation evidence:
[DATA](../research/MCP-DATA-GATE-2026-11-17.md),
[UI](../research/MCP-UI-GATE-2026-11-17.md).

Implementation surfaces:

- Native shared-Session dispatcher and authenticated loopback Streamable HTTP,
  opt-in Start/Stop, persistent per-profile connection/reset, native menu, no e2e host/fixtures in the product server.
- Generated machine schemas for all 86 deserializable RigEdit variants, 36 nested
  input definitions and 23 tools, with drift checks and native validation.
- Project lifecycle/file operations, resource data/import/placement, trace preview
  and apply, evaluation, runtime export and the complete existing edit enum.
- Readable project/schema/guide resources, an image-rigging prompt and real viewport PNG capture with native document/revision guards.
- Compact MCP header UI, copyable settings, explicit AI control state, manual
  authoring lock, Setup draft flush/validation, final-state refresh before unlock.
- Optional Node stdio adapter for clients without direct HTTP transport.
- [AI usage guide](../MCP.md).

Acceptance must include actual protocol/client lifecycle, revision conflicts,
Undo/Redo, trace/mesh/Physics nonbaking and binary/resource Save/Close/Open, plus
production-CSP UI start/stop and visible external changes. Schema coverage alone
does not prove each operation through an external client. Retain all existing
native supported-profile and reference fidelity limitations. Windows/macOS
builds/connection gestures and installer publication require their own evidence.

Current verification and the next reproducible action live in STATE. Keep this
task ACTIVE until the complete integration audit supports delivery.

User follow-up2026-11-17 authorizes commit, push and a new release after completion,
MCP-first public/developer docs and three replacement README screenshots from a
private Ubuntu copy of the supplied real project. Original source files and raw
art stay private; only authorized rendered editor screenshots are published.
