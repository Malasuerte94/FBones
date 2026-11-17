# Release footer version — UI gate

Direct current-source inspection: `src/App.vue` places `t('appVersion')` at the
right edge of the24px `editor-status` footer, in a `shrink-0` span. The adjacent
interaction hint flexes and truncates. `src/i18n.ts` still hardcodes English
`Version 0.9.6`; Romanian has no own appVersion entry and falls back to English.
`package.json` now identifies application0.10.0. Thus the footer is stale text,
not a live installed-version query. This is independent of prior accepted
Windows0.9.6 footer observations, which remain evidence for their exact builds.

The actual current mascot Setup and Graph captures were viewed: the stale footer
appears at the bottom-right. Deriving the footer label from a statically imported
`package.json` version corrects that display without relocating controls or
changing document/renderer state. Preserve the existing i18n key and provide
English `Version …` and Romanian `Versiunea …` labels. The extra digit in0.10.0
and short Romanian prefix fit the shrink-wrapped footer; the neighboring hint
already truncates if needed. Keep a narrow-width check within ordinary UI
regression evidence. JSON is a build-time module, not an external runtime fetch,
and adds no CSP permission or reference-editor parity claim.

Before publication, rebuild the production frontend, check both locale labels
against the application package version, and recapture all three real README
screenshots. A native Current/installed registry version remains a different
fact from this bundled build label.

Camera-only capture finding: the old full-canvas frame puts the mascot's feet
behind the real floating shared transform HUD, particularly in Animate. Keep
the full application untouched and adjust only the automation's ordinary view
preferences/camera: timeline360px,130px reserved for the bottom overlay, frame
the source bounds inside the remaining height with60px aggregate margin. No
pixel editing, pasted art or product layout change is authorized or needed.
