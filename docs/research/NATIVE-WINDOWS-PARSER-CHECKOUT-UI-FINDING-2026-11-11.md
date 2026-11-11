# Windows core: preserve strict parser bytes at checkout

Pre-code finding for the fresh v2 harness. Actual hosted run43007410854 stopped at10:54:03.5027096Z in own-minimal-checkpoint.py line41: the raw parse-project.py SHA assertion failed. The package-member static premeasurement passed, but no installer or FBones app was launched. This is a source-input failure, not a native Open/update failure.

The exact raw parser digest was not retained by that failed run. Windows checkout CRLF conversion is a source-supported explanation, not an observed byte-level diagnosis yet. The smallest new discriminator is a scoped scripts/native-windows-upgrade/.gitattributes containing `parse-project.py text eol=lf`, plus a pre-check receipt of raw SHA/byte/LF/CRLF counts and GITHUB_SHA. Preserve the strict expected parser59f49f8a digest and all parser/checker body bytes; do not normalize bytes at runtime or weaken the assertion. The next actual raw receipt must establish whether this fixes the input.

No target/provider operation occurred in this review; root owns execution. Existing failed receipts remain immutable.
