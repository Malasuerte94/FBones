# F307 — Windows loader boundary, static evidence

2026-10-30. This identifies a concrete inspection boundary; it does not recover
Physics methods, an export schedule or a working original observer. Existing
negative JVMTI/VMStruct/trace results remain unchanged. No product math changed.

## Direct file evidence

The installed Windows launcher archive is SHA256
`e109b3916e0075756963a78ee2edc7345fe3e3dbea962ea4fb84f6ebeaf73a28`.
It contains27 classes; none is byte-identical to its same-name counterpart in
the previously inspected Linux archive3b3fe92e. This establishes platform/file
provenance, not semantic differences or invalidity of properly scoped Linux
findings. File-only checks confirm installed Windows copies match the workspace.
The exact editor package remains4.3.26/4adf8cff; it was not unpacked or executed.

Targeted javap/CFR of the Windows launcher identifies URLClassLoader construction
and subsequent class-returning and reflection-shaped dynamic calls. Their URL,
actual editor class names and reflected entry method remain undecoded. Archive
helper reflection is not proof that an editor-class-loading override was found.

The exact bundled java.dllc0d54a92 exports the native ClassLoader defineClass1
bridge. Its direct call at RVA18d7 passes through thunk145df/import17728 to
jvm.dll!JVM_DefineClassWithSource; the pinned JVM export is RVA35b330. DATA
independently verified the PE mapping, hashes and argument setup. This is an
identified code boundary, unlike guessed VM object offsets. Which definition
variant handles editor classes is still unknown.

Commands: Linux javap17 `-c -p -classpath` on the pinned Windows archive, selected
CFR0.152 classes, and objdump `-p`/`-d -Mintel` on pinned DLL copies. Raw private
hashes/disassembly and copied/decompiled original material remain ignored under
`.local/research/f307-windows-loader-static/`; none is distributable.

## Next capability gate

The public OpenJDK17.0.6 header supplies a seven-argument definition signature;
[Microsoft's x64 ABI](https://learn.microsoft.com/en-us/cpp/build/x64-calling-convention?view=msvc-170)
explains register/stack parameter placement. These are primary references,
not a vendor-build identity or proof of runtime arguments. The exact native
bridge's argument setup is additional local evidence. Any tool must still prove
actual capture of a known own class buffer, length, magic and byte hash.

Paired DATA/UI reviews permit a bounded **own console toy only** feasibility
check, using a fresh created debug process and the identified exported boundary.
No attach to existing processes, object walking, guessed offsets, byte patching,
editor launch or original class capture is authorized by that toy result.
[Debugger lifecycle documentation](https://learn.microsoft.com/en-us/windows/win32/api/winbase/nf-winbase-debugsetprocesskillonexit)
requires explicit non-killing cleanup; UI/global input and user processes are
outside this check. A banner/request is insufficient: require a real boundary
hit, known argument bytes and normal toy/VM destruction/exit evidence.

Even successful own-toy capture would enable only the next reviewed loading
inspection. Recovering definitions and observing executed Physics update/render
order are separate gates. Keep F307 active and production tolerances unchanged.
