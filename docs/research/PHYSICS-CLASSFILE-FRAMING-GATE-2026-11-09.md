# F307: static unknown-length class framing

Question before any generic original-memory tool: can an own parser identify the
exact endpoint and resolved metadata of the first class in a bounded prefix that
also contains unrelated trailing bytes? Known1764-byte searches do not prove it.

DATA/UI first reuse the recovered own captures, strict independent class parser,
Java17 classfile specification and current loader evidence. The new C core has
no process APIs. Input and every read are bounded to1MiB; cursor arithmetic,
constant-pool tags/references/long-double holes and declared attribute lengths
must fail closed. Unknown attribute bodies may remain bounded opaque framing
data; this is not bytecode verification. Return consumed length, resolved class
name and class/member references; hash only the exact consumed slice.

Before further tooling, both actual own captures must frame to1764bytes and
retain their accepted hash. Trailing junk, extra magic or a concatenated class
must stop at the first endpoint. Exercise truncated pools/attributes, invalid
tags/references, oversized attributes and the byte bound. Independently run the
already frozen strict DATA parser and pinned javap on exact slices. Never guess
an endpoint or skip malformed data to find a more convenient magic.

The exact installed Windows loader statically names Editor and EditorErrors;
Physics/Skeleton/export class names remain hypotheses. Success here proves
static framing only, not original class identity or executed caller order.
No process launch/read, generic original scan, decompilation, solver change or
expanded collection is authorized by this parser test. A later original-owned
metadata scenario needs its own precise source/identity/selection/budget review.
