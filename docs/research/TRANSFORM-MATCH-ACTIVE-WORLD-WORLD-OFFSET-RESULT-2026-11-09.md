# Active World/World Offset: actual result and predictor omission

ONE original4.3.26 Offset Match and ONE Save were observed on a fresh direct own
741B64451233 input, with no canonical Save/Properties/repeated Match. Own27984/
start18:12:45.9881611Z/HWND8785932 ends through bound normal close/retained exit0
at18:28:49.8953982Z. Source World/Target World, Xmix0.5/others0, reflected root,
four bones/two constraints, driver-before-primary and first/second target order
are retained. Saved804B SHA256 is
`60f82258d45efff2e5401c4a9c0b0cd26d13d84bf62f5785969cae27a7ba4e1b`.

The frozen22-lane classifier returns **preservation PASS, sampling UNCLASSIFIED**:
zero complete candidates fit the unchanged0.0005 bound. The measured translation
contradicts its direct world-difference candidates. Nothing in the frozen51-pin
DATA source, prediction or classifier was changed or fitted after observation.

| Field | Actual saved f32 | Raw u32 bits |
| --- | ---: | ---: |
| Rotate |35.61198425292969|1108243116|
| X |38.860252380371094|1109094630|
| Y |33.59319305419922|1107713902|
| ScaleX |0.07110118865966797|1032953216|
| ScaleY |0.0744815468788147|1033406920|
| ShearY |72.5790023803711|1116809331|

Independent full parse/CRC/raw comparison verifies32 authored bone bits, ordered
graph, driver, primary unrelated fields and48null endpoints. Bone/constraint tag0
3→5, header/source/editor metadata also normalize; these are separately retained
and their meaning/cause is not inferred. Only primary six Offset scalars and its
tag0 change within that raw constraint. Dirty→clean captures, four stable reads,
exactly one Match/Save and owned normal lifecycle verify. Modeled preservation
does not mean all file bytes are unchanged.

A **separate post-observation hypothesis** identifies the omitted branch. Existing
product [transform_match.rs](../../src-tauri/src/transform_match.rs) already uses
inverse source world transform on target world position when both spaces are
World. No product correction is justified. The newly prepared numeric predictors
had omitted that existing branch. Reusing accepted old zero-mix World/World
Offset on identical32-bit geometry gives measured translation
60.43446350097656/8.684280395507812; inverse-source calculations give
60.434471130371094/8.684282302856445 for the fixed f64 path and
60.43446731567383/8.684281349182129 for the fixed f32 path. Direct world differences
do not account for those accepted old values.

Applying that explicitly retrospective inverse-source-vector hypothesis to the
already frozen authored/excluded/full/selected-only stages and ordered targets
selects only all-except-selected/first target under the same bound. Both fixed
math paths round X/Y to the exact newly observed bits. Remaining Shear error is
0.00048065185546875, and other angular/scale residuals stay visible. This is
post-observation support, not a relabeled predeclared classification or exact
math proof. The original frozen verdict remains UNCLASSIFIED.

Private run is `finish-three-2026-11-09/world-world-offset-1`: frozen classifier
report37b6c254b344cdef5a46597efc8a2f0dc9fa12b13595670f869e7844fffe50e4;
independent raw/ownership report6f72056866e9a0b43cd05fcc29493ad4ceb9e5afd43fb7bfec0434c812481fee;
separate inverse-frame hypothesis412a5a19486aaa0c5d426b9979d146c134784fd1040b575f59589837cb0027b0.
No native Session run, product math change, widened bound, original repeat or new
CLI compatibility acceptance was performed by DATA. Properties on its separate
fresh branch, Additive, Physics, suffix scheduling, exact precision and broader
compatibility remain open. Independent original Save of this own-source profile
is a bounded observation, not broad format compatibility.
