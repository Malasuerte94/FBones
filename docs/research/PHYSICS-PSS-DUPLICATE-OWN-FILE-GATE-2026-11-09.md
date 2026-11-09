# F307: own file-handle metadata alternative

Question: after PSS enumerates a child-reported known file handle but supplies no
name, can a controller-local attribute-only duplicate return its actual NT path?
This changes the provider decision, not Physics math. DATA and UI independently
review ownership before implementation. The consumed first PSS run is retained:
expected handle172 once, name length0, type length10 with unrecorded content;
no interpretation of those ten bytes is established by that result.

Use a fresh own console/temporary C: NTFS file and output directory. Retain the
created-process handle, image/file identity, PID/start and normal child lifetime.
PSS capture remains0xC/context0, one capture,4096entries/15second loop/512KiB
output. Record bounded actual flags and at most16UTF16 type units for the exact
reported file handle, even when snapshot name is absent. Other names stay redacted.
Only if this exact reported handle occurs once and process identity/liveness
still match, make ONE DuplicateHandle call from the retained child handle into
the controller, desired FILE_READ_ATTRIBUTES0x80, inheritFALSE, options0. Never
DUPLICATE_CLOSE_SOURCE or SAME_ACCESS. Require GetFileType==FILE_TYPE_DISK,
GetFinalPathNameByHandleW(VOLUME_NAME_NT) success0<length<capacity, full expected
NT path and volume/file identity equality. Close only the local duplicate and
require successful close. Snapshot name absence remains a separate observation.

No file-content reads, seek, mutation, process-memory reads, OpenProcess,
privilege, injection, original editor or arbitrary handle/name query. The same
watchdog includes metadata calls; native calls are not hard-cancelable. Record
API errors/overrun without forcing either process. Preserve normal child exit,
unchanged sources and exact pins. Reuse unchanged holder/ownership helpers.

Microsoft contracts: [DuplicateHandle](https://learn.microsoft.com/en-us/windows/win32/api/handleapi/nf-handleapi-duplicatehandle)
shares the file object/current position, so no reads/seek are permitted;
[GetFinalPathNameByHandleW](https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-getfinalpathnamebyhandlew)
returns success length excluding NUL, insufficient-buffer length including NUL;
[GetFileType](https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-getfiletype)
distinguishes disk from pipe/character handles. These documented contracts do
not prove actual capability until the own Windows experiment.

A positive proves metadata for this known own open file only. An original has
no child-reported known handle: candidate selection, name privacy and live
handle reuse require a distinct reviewed scenario. Current-open-file metadata
never proves which archive supplied an editor class. No automatic original run
or solver/clock/tolerance change follows from this gate.
