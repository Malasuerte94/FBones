# Affine bones, colors and image paths — Spine 4.3.26

This extends the accepted canonical profile; it does not establish arbitrary
project compatibility. The only binary oracle used was original **4.3.26
Professional**. The launcher banner's version is not the selected editor.

## Proven by new controlled import/export comparisons

Own one-region recipes changed one property at a time. Original Spine imported
and exported each new project; the bounded reader then reconstructed its model
and required complete byte-identical reserialization. Our independently written
candidates matched each reference outside identity bytes 12–27, and unchanged
`.spine` copies of those candidates were accepted/exported by original Spine.

Local evidence (ignored): `.local/research/refinements/`, especially
`collection.log`, `candidates.log`, `export-candidates.log`, per-case recipes,
reference/candidate project files and exports. `clean-base` is the one-skeleton
baseline. An earlier failed collector run merged a second skeleton into its own
`base.spine`; that two-skeleton file is not used as a canonical reader fixture.
No pre-existing/personal project was modified and no accepted old suite rerun.

| Case | Record / tag | Original stored change | Bytes |
| --- | --- | --- | --- |
| clean-base | — | Root length 100; one 32×24 region | 749 |
| bone-color | Bone 12 / 17 | RGBA `9b9b9bff` → `22bb66ff` | 749 |
| scale-x | Bone 12 / 13 | float32BE 1 → 1.75 | 749 |
| scale-y | Bone 12 / 14 | float32BE 1 → -0.6 | 749 |
| shear-x | Bone 12 / 23 | float32BE 0 → 17 degrees | 749 |
| shear-y | Bone 12 / 25 | float32BE 0 → -23 degrees | 749 |
| slot-color | Slot 13 / 5 | RGBA `ffffffff` → `4488cc99` | 749 |
| image-folder | Skeleton 11 / 3 | `./images/` → `./asset-library/` | 756 |
| nested-path | Region 43 / 13 | empty → `nested/checker` | 762 |

The nondefault bone/slot colors, all four affine channels, image root and nested
attachment path also occur in the actual original/candidate runtime JSON.
`scaleY` -0.6 is represented as its normal float32 value in the binary; compare
numeric exports with tolerance rather than assuming decimal byte equality.
Default bone color in this controlled 4.3.26 profile is **155/155/155/255**.
Do not substitute a different-version default from a generic format example.

A separate diagnostic `slot-dark` import proves Slot 13 tag 11 is its dark RGBA
and tag 12 changes false→true to enable it. Dark tint is NOT implemented in this
extension. The complete reserialization guard keeps such input inspection-only.

## Typed model and implementation

`Bone` adds `scale_x`, `scale_y`, `shear_x`, `shear_y` and RGBA `color`. Defaults
are 1, 1, 0, 0 and `[155,155,155,255]`, preserving old canonical bytes. Slot adds
RGBA `color`, default `[255;4]`. `RegionProject.images_root` stores the exact
Skeleton 11 tag 3 string; the default remains `./images/`. Attachment paths are
unchanged typed strings and can represent portable nested keys.

The reader retains Color 30 values instead of dropping their components into
an untyped placeholder. All unknown fields/defaults/reference order and suffix
still participate in complete exact reserialization. No custom project tags,
sidecar project container or renamed source template was introduced.
The narrower `decode_minimal` reader rejects a nondefault image root even when
there are no slots: `MinimalProject` has no field to preserve that metadata.
`decode_regions` accepts and retains the same canonical root without loss.

Desktop/native views expose colors as u32 **RGBA big endian**, e.g. `0x22bb66ff`.
Automatic palette selection is an FBones editor preference; it writes explicit
proven colors through one atomic `SetBoneColors` operation. The corresponding
original editor auto-color setting has not been recovered and is not invented.

The image root string is a format fact, not authorization to traverse arbitrary
files. The desktop separately validates chosen folders and portable PNG keys;
unknown/unusable paths must not be silently rewritten to fit the profile.

## Affine math and editing behavior

For the supported normal-inheritance bone mode, local X uses
`rotation + shearX` and scaleX; local Y uses `rotation + 90 + shearY` and scaleY.
The desktop and frontend compose full 2×2 bases with translations. Sprite
placement, skinning, image hit testing, nearest bone-segment weighting and
inverse vertex edits use those matrices. They must not derive world length
from local length or sum rotation angles under nonuniform/sheared parents.

`transformBones` changes the selected top-level bones once, omitting descendants
with selected ancestors. Translate uses world offsets; rotate/scale/shear use
the supplied world pivot; Pose rotates at each selected top bone's own origin.
All changes form one history entry. Length editing projects onto the existing
world X axis and preserves the bone's rotation. Reparenting decomposes the full
relative matrix, preserving world basis/position and stable session IDs.

Inverse operations reject singular/nonfinite matrices. When slot reparenting
would require local shear that a region cannot represent, the native edit
converts it to a canonical rigid quad mesh under the new bone. It preserves
all four world-space image corners rather than approximating the transform;
the conversion participates in the same undo entry and exact codec guard.
The native regression `slot_drag_across_shear_preserves_world_image_as_a_canonical_mesh`
checks the world corners and canonical save/decode. A region can inherit shear
from its bone and is rendered with that full basis.

## Evidence boundaries and unknowns

The public [JSON format documentation](https://en.esotericsoftware.com/spine-json-format)
explains the setup transform/color fields, slot/attachment distinction and image
root/path roles. It is context, not binary-version proof; the controlled 4.3.26
observations above establish the field tags/defaults used here.

Unknown: original auto-color/editor UI flag, general slot editor color unrelated
to image tint, arbitrary inheritance modes and other unmodeled editor metadata.
The new explicit slot color is a runtime light tint, not a proven tree-row-only
annotation. Preserve unsupported data or reject editing rather than guessing.
