# MCP schema checkout EOL — UI/tooling gate

Coordinator-provided hosted evidence: Windows jobs134127709364/134127720325 fail
the generated-schema drift check; the other four schema checks pass. This audit
inspected the current sources/workflow, not a fresh Windows interaction run.

Direct source observation: `scripts/generate-mcp-schema.mjs --check` compares
the checked-in text to `JSON.stringify(value,null,2)+'\n'` with exact string
equality. `tests/mcp-schema.test.mjs` invokes that check, then independently
checks variants/contracts. The desktop workflow checks out the Windows matrix
normally and runs the same JavaScript suite. No repository-wide `.gitattributes`
pins these two files. Current local copies are LF; Git's Windows CRLF checkout
can therefore change string equality while leaving the parsed JSON unchanged.

UI decision before coding: normalize **actual CRLF line endings only** to LF on
the checked-in side of this tooling comparison. Retain exact comparison after
that normalization. Do not parse/compare arbitrary JSON semantically, trim
whitespace, skip the test or change the emitted schema/contracts to hide drift.
Escaped string sequences such as `\\r\\n` are content and must remain untouched.
Lone CR, changed values, missing fields, extra spaces and noncanonical content
must still fail. Do not alter global Git settings or the hosted product UI.

This change affects developer/CI checkout portability only. It requires no
control/layout/locale change, native Session/persistence change, new renderer
initialization or CSP permission. Existing23-tool/86-edit schema coverage and
all input validators remain intact. Verify equivalent LF/CRLF inputs pass and
a meaningful drift still fails; then run the actual schema tests and fresh
hosted checks. Existing failed runs stay historical; publish any corrected
release under a new immutable tag rather than rewriting the prior one.
