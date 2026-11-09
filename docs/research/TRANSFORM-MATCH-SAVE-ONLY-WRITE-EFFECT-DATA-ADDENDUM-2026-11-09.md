# Save-only precision: distinguish storage preservation from a clean no-op

This pre-code addendum qualifies the
[Save-only hypothesis](TRANSFORM-MATCH-WORLD-LOCAL-SAVE-ONLY-PRECISION-DATA-HYPOTHESIS-2026-11-09.md).
An ordinary Save on a clean document can be a no-op. Submitted Save/click and
unchanged48 numeric bits alone cannot exclude load/save normalization.

Retain current before/after source-copy hashes, lengths and read-only
LastWriteTimeUtc/FILETIME ticks using existing snapshot/file metadata providers.
No watcher, second Save, dirtying field, new provider or original replay is added.
If bytes change, file mutation is proved and numeric bit preservation can be
assessed in that actual saved output. If bytes and timestamp are unchanged, label
SAVE_EFFECT_UNOBSERVED; do not infer a universal normalization negative. Changed
timestamp with identical bytes is METADATA_EFFECT_ONLY, not proof of full
serialization or a different numeric result. Timestamp alone never overrules
exact byte/typed comparisons. Clock granularity and retained metadata are limits.

Classify actual primary24 nullable endpoints plus24 runtime scalars separately:
exact48-bit preservation; endpoint changes with span-consistent runtime values;
runtime-only changes; endpoint/runtime relation inconsistency; or endpoint
presence changes. Keep exact deltas and raw unrelated-record changes, never fit
four-decimal rounding or choose a post-observation mask. Changed primary endpoint
presence is a measured pipeline effect, not automatically a numeric-match success.

Even observed saved-byte mutation cannot separate load-time from save-time
normalization or reveal unseen internal state. Exact numeric preservation in a
rewritten file bounds that saved output, not every internal path or all projects.
The direct853B native input and one clean Save-only scope remain unchanged.
