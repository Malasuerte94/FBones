# F307: requested small-heap own fixture

Before implementation, DATA/UI independently accept this changed-input question:
does requesting a64MiB maximum heap allow the own classfile scan to finish its
readable-region inventory within the existing512MiB/15s/64prefix limits?

V2 actually read512MiB without errors, then hit its byte cap with zero known
class candidates. Its last visited private region was about1GiB and only
partially read. That region is not proved to be the Java heap, and V2 is not
whole-process classfile-absence evidence. All original/V1/V2 inputs stay frozen.

The [Java17 command specification](https://docs.oracle.com/en/java/javase/17/docs/specs/man/java.html)
documents `-Xmx` as a requested maximum heap size. It does not prove that this
vendor runtime honors it or bound native/metaspace allocations.

One fresh own host adds only `-Xmx64m`, retaining the class, ordinary FindClass,
known sink, no agent and normal bounded hold/destruction. Before loading the
own class, standard read-only JNI Runtime.maxMemory supplies the reported value;
require a successful, positive value no greater than64MiB or record a refusal.
it neither reads nor plants classfile bytes. Fix the old diagnostic banner's
count==3 shortcut to explicit agent0, because the third option is now heap size.
The scanner and all its budgets/selection/lifecycle rules remain unchanged.

Require actual coverage/stop reason, query completion, read failures and any
omitted ranges before interpreting a negative. A positive still requires exact
complete independently parsed own bytes and normal exit, and proves only this
own requested configuration. No collection grid, expanded scan budget, original
launch, recovered Physics method or solver change follows automatically.
