# Transform Match: data and persistence audit, 4.3.26

Recorded 2026-10-29 before dependent implementation. The paired UI audit will
inspect the two original Match controls. Eight new original actions are now
independently decoded below. Aggregate:
`analysis/transform-match-reference-check.json`. All originals are owned fixtures;
the data worker ran zero original commands and sent zero original inputs.

## Proven existing evidence, reused

- `FEATURE-DATA-4.3.26.md` documents Transform65's six offsets, six independent
  mixes, localSource/localTarget/Additive/Clamp and From134–139/To140–145 records.
  Each From carries an offset; each destination carries offset/max/scale.
- `analysis/constraint-solvers-check.json` contains the accepted37 static
  mapping/space/order cases. Reuse those; they did not invoke Match.
- `FEATURE-UI-4.3.26.md` records the exact4.3.26 own inspector: **two** Match
  controls, one in the Offset foldout and one in Properties. Its cross-channel
  source-X/destination-Rotate ranges were observed but neither Match was used.
- The canonical model can already represent offset/range changes and rejects
  unsupported payloads by complete reserialization equality. There is no proven
  separate persistent Match flag or operation record.

## Documented, version unpinned and incomplete for 4.3

The official [Transform Match guide](https://en.esotericsoftware.com/spine-transform-constraints#Match),
read 2026-10-29, describes matching offsets to the **first constrained bone's**
current transform, with zero mixes useful during setup. Its surrounding page
describes one Local/Relative and a target, rather than the exact4.3 inspector's
Source/Targets, independent spaces and two Match controls. It therefore does
not settle the new Properties Match, cross-property/range behavior or every
4.3 offset-space detail. Do not import an older-version algorithm from that
page or treat its patch-unpinned text as exact4.3.26 proof.

## New own discriminator proposal

Use authored, noncoincident source/firstTarget/secondTarget bones with distinct
rotation, translation, scale and shear. Put them under an affine parent so
world values differ from local values. Set all mixes to0, preserving authored
poses while the button computes values. Keep all six old constraint offsets
nonzero and all old source/destination ranges distinct; an unchanged field is
then distinguishable from a default zero.

Collect separate copies for **Offset Match** and **Properties Match**, never
chain them. Each requires an actual pre-action saved stage, capture/button
identity, completed action and stable after stage. The data worker independently
checks every six-offset/mix/space flag and every From/To offset/max/scale, plus
bone channels, source, ordered targets and other constraints.

Minimal discriminating cases:

1. LocalSource=true/LocalTarget=true, identity channel mappings, two targets.
   The two targets have deliberately different transforms; reversing target
   order in a separate new copy tests which target is matched.
2. Both spaces world, with a reflected/nonuniform affine parent. This separates
   source-local translation offset from a simple world-coordinate difference
   and distinguishes reflected angular sign/decomposition choices.
3. Mixed spaces plus X→Rotate and ScaleY→ScaleX, nontrivial source offset and
   destination offset/max/scale, Clamp=true. This distinguishes adjusting
   constraint offsets, source origins, destination origins, scales and endpoints.
4. A later ordered constraint or partial mix can discriminate matching authored
   setup, the evaluated pose before this constraint, or its final displayed
   result. Start with zero mixes for arithmetic clarity before this extension.

Own input generation can use the existing canonical scene recipe helper;
it is not an original invocation. No original CLI may run without coordination
with the sole UI reference operator. Existing user/original projects and
windows remain excluded.

The first discriminator is now prepared privately at
`.local/research/transform-match-data/match-local.spine`,674 bytes, SHA256
`58162c071e37fdf481390d65b8014b13c2fc46cc69a277f51412632874020b11`.
It has both Local flags, six identity mappings, all six mixes0, old offsets
`[7,11,-13,.2,-.1,19]`, two differently posed targets and an affine parent.
`fixture.json` records the own source hash and zero original commands. Own
generation used `scene-check --generate` with codec round-trip equality.
Preparation alone is not original opening or a Match observation.

## Proven new Offset Match, local/local

The original SaveAs baseline preserves all authored bone and typed constraint
fields. Its SHA256 is
`dc891728fed4179584ad776950d2b6145ef71baf0d1770ae6ccfde6e3d8dabd1`.
The separate actual Offset Match action changes only six offsets, leaving
four bones' authored channels/world matrices, six mixes0, mappings, flags,
source and target order unchanged:

```text
before: [7,11,-13,.200000003,-.100000001,19]
after:  [-56,57,42,-.3000000715,.4999999404,-28]
```

These are float32 firstTarget-minus-source local channels. Before SHA256
`00cbec4e4758c2118c58814e3ed98cd6097c41d829be3d0a3ffe10a0063a3b36`;
after `7e669c43d59f7f570ec2696f8ad21a948d9ce7a21f416b6ebba6b5360bb34f5b`.
This does not yet establish unmapped-channel behavior.

A separate reversed-target local fixture preserves the actual ordered target
list `[secondTarget,firstTarget]` through original SaveAs. Its Offset Match
changes only offsets to `[49,-53,22,.2999999523,-.1999999881,-8]`, exactly the
second target minus source local channels. This directly establishes use of
the first **ordered** target, independent of skeleton/name order. Before SHA256
`4cfc15b0ed82c0ab5d9ac9240f744ecd250aa75a69984446290041fa1c7b866e`;
after `2aeebd66c3ce275765639602ddf252a3f4648d48ac86ba486b430491e2e549ac`.

## Proven new Properties Match and field31 structure

A separate fresh-baseline Properties Match has before SHA256
`d14a11498c9b163407fc32e5698a8b08d78c31a7de95b39dfdaad893b95b8079`
and after SHA256
`8cc9c9ce6f3c60d337606fed2a73b6347823200d237b9c357c7e1cc698310efb`.
All bones, global offsets, mixes, flags, source and target order stay unchanged.
The mapping and a previously zero-only buffer change together:

| Channel | From start | To start | To end |
| --- | --- | --- | --- |
| Rotate | 31 | -25 | -24 |
| X | 2 | 70 | 71 |
| Y | 6 | 35 | 36 |
| ScaleX | 1.200000048 | .899999976 | 1.899999976 |
| ScaleY | .800000012 | 1.299999952 | 2.299999952 |
| ShearY | -73 | -101 | -100 |

From ends are approximately start+1. Most destination scales remain1;
ScaleY becomes1.000000119 because the actual float32 spans differ. Source X/Y
are authored source minus old global X/Y offsets; other channels do not simply
subtract global offsets. The shear range is raw local shearY minus90 in this
case. These are observations, not a universal matching formula.

**Important corrected format conclusion:** Transform65 tag31 is not six zero
float32 values. The new actual payload proves a generic array reference followed
by varuint25, representing24 nullable float32 entries. Each entry is0 for None,
or1 followed by the four float32 bytes. All earlier24 zero bytes were24 absent
entries. The order is Rotate/X/Y/ScaleX/ScaleY/ShearY, four values per channel:
From start, From end, To start, To end. The original controls show those same
endpoints. Ordinary From/To records still hold the runtime offset/max/scale.
Do not discard tag31, copy it as opaque bytes or relax complete reserialization
equality. A future typed extension must model and validate every nullable value;
the current production zero-only guard is correct until that extension exists.

Independent research reader:

```sh
python3 .local/research/transform-match-data/read-data.py <own-before-or-after.spine>
```

## Proven new world/reflected observations

Both world-space flags and a reflected affine parent distinguish this new case
from the local example. Offset Match changes only offsets to
`[35.6119843,60.4344635,8.6842804,.0711011887,.0744815469,72.5790024]`.
Translation agrees with the source-world inverse applied to the first target's
world origin, rather than a plain world-space subtraction. Before SHA256
`69878904ea353241592923ebe66681c28a70b6a30ba5d7e705e63456826cb701`;
after `8ec9cefd32761844fc5ab78f9f5f0f5708ac597940b77c3540b3d3f3283ee656`.

Properties Match separately updates mappings/tag31, preserving bones/global
offsets/mixes/flags. Source From values in channel order are approximately
`[-171.675995,-13.567300,-9.947110,-1.265710,.998110,135.609543]`;
destination starts are
`[-136.063995,-73.150963,-27.014441,-1.194610,1.072600,208.188049]`.
World ScaleX is signed negative here. Endpoints appear rounded to about five
decimal places and their differing spans produce nonunit mapping scales.
Exact rounding/decomposition has not been established by these samples.
Before SHA256
`12dbc0c881bc7bf5e20b65bedad9c3ea17367b26f0dceb3406067ca67a50c1dc`;
after `1cab596b662171a1aa9bf38ab61680f4036db3d2eec331a02e7cead4ebfd69d4`.

The separate reversed-target Properties action also uses the first ordered
target: unchanged source ranges map to destination starts
`[80,-40,15,1.5,.600000024,-81]`, with endpoints approximately+1. Only mapping
and nullable range entries change; bone/global-offset/mix/flag values remain
identical. Before is the same immutable reversed baseline
`4cfc15b0ed82c0ab5d9ac9240f744ecd250aa75a69984446290041fa1c7b866e`;
after `3bf196dd0bfa717d5a12eaada2c081f148a8c26c1436b429ece62f8cad469ad2`.
An earlier attempted click after a window resize was discarded, with no
accepted after file; it is not counted as a Match observation or product bug.

## Proven sparse cross-property/mixed-space actions

The new source has World source and Local target, Clamp=true, six nonzero global
offsets, mixes0, X→Rotate+Y and ScaleY→ScaleX. The old destination spans are103,
70 and2.3; source/destination scales differ, including negative scales. Original
baseline is725 bytes, SHA256
`4d2a11816f2480908c0bbe68f341e13ef720a99a221648840db2223e29db3703`.

Offset Match changes **all six** global offsets, even though unmapped controls
are hidden, to
`[-72.3305359,43.2956390,41.0471115,-.669401169,.548195124,-141.082001]`.
Here translation is target-local minus source-world coordinates, unlike the
source-matrix inverse used in the world/world example. The mixed shear also
reveals that local range values use the observed shearY-minus90 convention;
that difference cancels in local/local and cannot be ignored across spaces.
Only offsets change. After SHA256:
`846283a2e6a5094847f3e53ff75f76268c315af305060ed7b170c8c90785581d`.

Properties Match is a separate baseline action, after SHA256
`d51ce3118b31f25c26ce9a3d690290d1655ad7a66978612d1a6bafeb1b4db7dd`.
It preserves existing source/destination links, global offsets, mixes, flags
and every bone. It moves range starts while retaining the old displayed spans,
rather than resetting every range to width1:

| Side/channel | New start | New end |
| --- | --- | --- |
| Source X | 15.7043600 | 60.4869995 |
| Source ScaleY | .751800001 | -2.31489992 |
| Destination Rotate | -25 | 78 |
| Destination Y | 35 | 105 |
| Destination ScaleX | .899999976 | 3.20000005 |

Mapping scales are recomputed from actual endpoint spans. X→Rotate becomes
2.29999852; X→Y becomes **positive**1.56310570 despite its old scale−.4;
ScaleY→ScaleX becomes−.749991894. The source X range is shared, using the
range represented by its first ordered destination (Rotate in this source).
An inconsistent second destination's former scale therefore does not survive.
The sample establishes this ordering outcome, not arbitrary route-reordering
behavior.

Tag31 now contains **partial nullable** ranges: only mapped source starts/ends
and mapped destination starts/ends are populated. Unmapped positions remain
None. This independently confirms the24 nullable-entry model, not a fixed
all-nonzero float buffer. Preserve both the range state and runtime From/To
values in any canonical codec extension.

## Unknown; implementation gate closed

Reverse mixed-space direction (Local source/World target), angular branch
wrapping, additive constraints, singular transforms, partial mixes, evaluated
constraints and range-rounding/decomposition precision remain unknown. The
bounded sparse Clamp=true case above is proven; arbitrary range editing and
route reorder behavior are not. A button implemented from subtraction alone
would be an assumption. These examples establish two distinct actions and the
nullable range representation, not proprietary numeric parity or every formula.

The paired worker next rotates to the coordinator's manual-lock/vertex probes;
there is no permission to rerun these eight accepted actions merely for more
comfortable automation. Recompute the existing independent report without
launching the original:

```sh
python3 .local/research/transform-match-data/check.py
```
No native or frontend product change is authorized by this memo alone.
