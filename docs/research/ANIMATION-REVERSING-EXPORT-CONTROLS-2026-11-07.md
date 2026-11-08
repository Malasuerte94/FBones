# Reversing editor controls in retained runtime exports

New discriminating question,2026-11-07: do exact4.3.26 runtime exports clamp the
stored editor time handles that make B/E curves reverse, making root selection
irrelevant? The answer for the five inspected axes is **no**. No product change
or original/runtime parser batch was run.

The frozen B/E complete identity graphs locate the known reversing segments.
Their already collected runtime reports identify the matching animation, bone,
timeline type, key count and next endpoint. The pinned SkeletonBinary grammar
reads next endpoint, curve byte2, then four raw handle floats per component.
A targeted static search in each retained hash-checked exact4.3.26 `.skel` copy
uses that endpoint/type marker and control **ordinates only** to locate the block;
it never filters on the disputed time controls. Every inspected block is unique.

| Case/axis | Stored first/outgoing/incoming/last editor frames | Exported outgoing/incoming recovered frames |
| --- | --- | --- |
| B Rotate |89 /92 /61.99999237060547 /98 |91.99999809265137 /61.999990940093994 |
| E combined Translate X/Y |0 /11.666670799255371 /2.6666669845581055 /4 |11.666671335697174 /2.666666731238365 |
| E scalar Translate X/Y |0 /11.666670799255371 /0.6666666269302368 /1 |11.666671335697174 /0.6666666269302368 |

The runtime controls retain the reversal and out-of-segment positions. Maximum
time residual from the documented30FPS mapping is6.35782879676583e-8seconds;
maximum ordinate residual is3.814697265625e-6 under the predeclared0.0005bound,
including the retained coordinate scale0.5 for Translate. This refutes both a
universal export clamp and a clamp applied only to these reversing examples.
It does not prove the original editor's sampling, graph tessellation or choice
among mathematical roots. Do not clamp stored handles or invent a first/last-root
rule to admit B/E. Their other profile barriers remain independent.

The [official Graph guide](https://esotericsoftware.com/spine-graph#Curves)
describes Graph curves as runtime approximations and notes visible line segments.
That documentation is unversioned; it does not independently prove exact4.3.26
numeric behavior or authorize replacing the current interpolation policy. The
installed pinned runtime4.3.13 implementation remains secondary evidence. A
future targeted observation must distinguish the original/effective sampling
contract while preserving these source bits.

Private `animation-reversing-export-2026-11-07/inspect-retained-v1.py`,
`result-v1.json` and log retain endpoints, byte offsets, source/tool hashes and
all five component matches. No original names, assets, local absolute paths or
extracted implementation are copied into this aggregate note. Existing A's
monotone-overshoot control proof remains retained separately. Full F105 and
original/platform acceptance stay open.
