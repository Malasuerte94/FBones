# Known string forms independent saved-data proof — 2026-11-07

The [DATA gate](ANIMATION-STRING-FORM-DATA-GATE-2026-11-07.md) now has independent
checks of the coordinator's keyed and renamed production-store / real Rust Session
artifacts. No original/runtime batch, browser or renderer ran for these checks.

The independently parsed source has2531 payload bytes. The keyed2536-byte artifact
adds exactly one linear TranslateX key on bone1, frame31, value7 with unused+0
transport padding. Images root `./source-images` becomes `./images/`; audio is
unchanged. No unkeyed working pose is included in the expected saved model.
The renamed2600-byte artifact additionally changes only bone1 to the own64-character
D fixture name, detaching its former shared text from slot0.

The complete expected raw graph matches in both phases:229 original f32 values,
field/tag/collection order, generic/domain identities and all unrelated data.
Independent byte inspection also checks lexical bodies, not just decoded text:
slot0's A×64 and bone3's B×64 keep explicit UTF8 length form; bone4's old C×64 keeps
terminated ASCII; attachment0's red name/path retain one shared UTF8-length body.
The renamed bone1 becomes independent canonical terminated ASCII while slot0
retains A×64. The rewritten image root becomes canonical; unrelated source markers
are preserved. CRC64, compressed framing/length and complete trailer validate.

A separate runner constructs the expected typed project from the source and the
pinned command receipt. It requires the entire expected model, every payload byte
and complete compressed envelope to match each saved file. Both pass, including
alias/encoding metadata after normalization. Source bytes are unchanged. All seven
PNG hashes match the original source and unkeyed/keyed/renamed portable folders.

| Artifact | SHA256 |
| --- | --- |
| keyed | `c0cddabc24d4aae2cb48b33d22c1083f7aac23bc32624c7bb49c1df246564382` |
| renamed | `4b379a561e6ecc647d5f754beb115cde9273faac366f06fe7b2822bf6edfddfb` |

Native host SHA256:
`23772a787d0e8dddaff76f3dfbf43887bd000ce9bc5f66e323fc10b33d948152`.
Final post-format format-source manifest SHA256:
`1e124a106726026bdb66a2d0b43e0fa5c595a2ae2d78e21268c6875c18b259ac`.
Ignored `animation-string-form-2026-11-07/independent-data-v1` retains raw checks,
source graphs, receipt-correlated intent and the separate expected-model runner.
`animation-string-form-data-2026-11-07` pins source/tools/checks and this note;
prior consumed manifests remain unchanged. Native history/resource actions and
UI/platform behavior are separate integration evidence, not inferred here.

Four admitted actual-source payloads remain exact and E remains guarded. The
[declaration DATA gate](ANIMATION-CONSTRAINT-DECLARATIONS-DATA-GATE-2026-11-07.md)
has a separate ignored static feasibility result; neither it nor this lexical
preservation change grants reversing-time sampling or original acceptance.
