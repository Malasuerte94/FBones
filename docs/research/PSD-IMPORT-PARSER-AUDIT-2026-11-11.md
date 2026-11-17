# PSD import: parser and build feasibility audit

Source-only audit, before product implementation. This implements no importer and makes no Spine/Photoshop gesture or visual-parity claim. The agreed first profile is an FBones import policy: **PSD version1, 8-bit RGB, flat ordinary normal-blend raster layers, RAW or PackBits compression**. Unsupported appearance-changing structures must reject the whole import before mutation; there is no silent flattening.

## Decision

Use a small owned bounded Rust parser, the already pinned `png =0.18.1`, and existing immutable `ImageAsset`. No new dependency is needed. Neither evaluated PSD decoder is in Cargo.lock or either installed registry cache. No package was downloaded, installed or built for this audit. Upstream source was inspected through the read-only GitHub connector; its package version label is not proof that a downloaded crates.io archive is byte-identical.

The [Adobe PSD specification](https://www.adobe.com/devnet-apps/photoshop/fileformatashtml/) defines big-endian length-delimited sections, signed layer rectangles, per-channel lengths, layer flags/opacity and RAW/RLE/ZIP compression codes. It also distinguishes layer records from the merged composite. Version2/PSB, non-RGB or non8-bit data and compression2/3 are outside this first profile. This is a deliberate support bound, not a PSD-wide limitation.

| Candidate | Source-backed finding | Decision |
| --- | --- | --- |
| [`psd`0.3.5](https://github.com/chinedufn/psd/blob/master/Cargo.toml) | MIT/Apache-2.0, thiserror1 dependency. Its cursor directly slices untrusted declared ranges; Unicode conversion and several pixel paths unwrap. Layer RGBA is placed in document-sized coordinates. Its own flattening code explicitly defers blend-mode handling. | Do not feed untrusted import files directly to it. A sufficient structural preflight would duplicate much of the required small parser. |
| [`tinypsd`0.1.0](https://github.com/varnholt/tinypsd/blob/main/rust/Cargo.toml) | MIT, Rust1.85+, no dependencies, forbids unsafe. Exposes local RGBA, signed bounds, flags, blend/group/mask metadata. Parser has per-image pixel checks, but deliberately tolerates malformed layer-extra data and ignores unrecognized tagged blocks. It does not provide the required whole-document aggregate budget or strict unsupported-feature audit. | Promising broader future candidate, not a drop-in strict v1 gate. Its newly inspected decoder/ZIP paths need separate package pinning and validation before adoption. |

Reviewed upstream Git blob identifiers, reproducible through the repository's Git blobs API: psd lib `5823a16f8933efe3509196e158ffc1ac3b906775`, channel `f5cefc2606d6dd21a68ab1ca0c005d224f3f2553`, sections cursor `11642aebb93c1b64983385ed1bbdc731f8755a41`, layer `5461f66f4e4effa1f82cab976a96afce7332211a`; tinypsd lib `4ad4a19003c4c0b41cca8f23b87a53f1e62a3ace`, parser `7e49199cb449b60aae9a686bfa43b3ae083f0851`, reader `5b9cbd8de92ab4a24a082eb5247bb2e71dbeafce`. These identify inspected source snapshots, not vendored product code or a crates.io checksum.

## Parser contract

`psd::read(&Path) -> Result<PsdDocument, AppError>` bounds a regular-file read to64MiB; `psd::parse(&[u8])` performs the same pure checks. `PsdDocument { width:u32, height:u32, layers:Vec<PsdLayer> }`; each layer has `name:String`, `left/top:i32`, `width/height:u32`, `visible:bool`, `opacity:u8`, `image:Arc<ImageAsset>`. Layers are bottom-to-top. DATA independently corroborated raw wire order from [psd.js's parser](https://github.com/meltingice/psd.js/blob/master/lib/psd/layer_mask.coffee), whose public API reverses that wire order; retain an overlapping-color test rather than infer order from layer names.

Decode local straight RGBA, encode PNG with the existing encoder, then use `ImageAsset::from_bytes` and its dimension/CRC/PNG-size validation. Opacity stays separate and must not also multiply pixel alpha; hidden layers are retained. The raw hidden flag0x02 means `visible=false`, independently tested, rather than copying a prose label or a third-party inversion. Preserve off-canvas signed left/top; compute exclusive right-left/bottom-top in i64 and validate before narrowing. The Scene adapter owns center/y-axis conversion and stable IDs/history.

Proposed bounds for the paired implementation: max128 raster layers, document/layer sides≤4096, aggregate layer RGBA≤128MiB before pixel allocations, existing per-PNG≤16MiB, bounded name/tag/channel counts. Validate *all* record/channel lengths and aggregate sizes before decoding; exact RAW plane lengths and each independently framed PackBits row must produce the declared width. Handle PackBits -128 as a no-op without unbounded output. Reject truncation, overflow, duplicate/missing RGB channels and unsupported channel IDs. Composite bytes are structurally bounded; they are not substituted for layers.

Reject groups/section-divider tags, clipping, layer masks, vector masks, text, smart objects, adjustments, effects, non-normal blending and non-default appearance-affecting blending ranges. Unicode `luni` names use strict bounded UTF-16; legacy names are not filesystem paths. Audit a closed allowlist of common inert metadata (e.g. layer IDs/color labels/locks/reference points) and validate each accepted block's shape. Unknown tagged data must reject initially, with an actionable unsupported message, rather than being silently dropped. Specific allowlist and handling of optional fill opacity must be recorded in the implementation/tests; a fill opacity other than255 cannot be ignored.

## Fixtures and checks

Final narrow resource audit: the Adobe specification names DisplayInfo resource
IDs1007/1077 but refers their channel-kind layout to SDK AppendixA. Adobe's
[Spot-color guidance](https://helpx.adobe.com/photoshop/using/printing-spot-colors.html)
documents document-level Spot channels and preview color/solidity; these do not
belong to individual layer RGBA. The parser never confuses document alpha with
layer channel−1, but a global Spot overlay could be omitted by a layer-only
import (inference, not a reproduced Photoshop observation). Before the narrow
fix, choose the explicit FBones policy of refusing nonempty1007/1077 resources;
do not guess undocumented kind offsets. This also conservatively refuses benign
alpha-channel DisplayInfo. Empty blocks remain harmless. Existing UI refusal
and whole-import atomicity apply; no original gesture/parity claim follows.

Use an owned tiny independent PSD fixture encoder only in tests, not another `.fbones` writer or an original template. Cover RAW and PackBits channels, signed negative bounds, overlapping bottom/top colors, Unicode and duplicate names, hidden flag, opacity separate from alpha, padding, missing alpha→255, exact malformed lengths, RLE under/overflow/no-op and every unsupported-structure refusal. Keep document parse immutable; DATA's Session transaction supplies one history action and atomic resource/scene changes. Browser real-Session import/save/reopen can later reuse that fixture. Test-produced pixels/geometry and independently decoded `.fbones` fields are distinct evidence; no Photoshop rasterization or Spine gesture has yet been observed.

## Build and disk route

Reuse project-local `.tools/cargo`, the existing default/scene-editing/e2e-host feature profile and normal `target/debug` naming. The cached host exists and is about238MB; changing parser/Session sources requires rebuilding it before real-Session UI checks. Do not use stale `--no-build` output as new-source evidence. `cargo test -p fbones-desktop --lib --offline --features e2e-host`, one job and incremental disabled, avoids unnecessary standalone app/bin variants; root owns required checks.

Read-only inventory: debug deps≈7.6GiB, build≈1.4GiB, incremental empty≈4KiB. After reading protection ledgers, no Linux process mapped files beneath the own debug target. Older same-feature test variants are unmapped and have no pathname references found, but no deletion was performed or required. Current host/library artifacts and required evidence stay preserved. Linux free space is not host-G availability; Linux deletion does not guarantee recovery on the known non-sparse host VHDX.

Root identified a20GiB tmpfs and≈35GiB available RAM. A preserved-mtime copy of existing dependency/build/fingerprint caches into an owned tmpfs target offers a bounded route without Cargo outputs on G. Target relocation may invalidate caches; reuse remains unmeasured. Keep one compile job and monitor capacity; do not claim OS swap is impossible. No copy, compiler, native app, original process or cache deletion was performed by this audit. Source-only browsing left no disposable package/build backlog.
