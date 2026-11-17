# Screenshot provenance

These are unedited FBones **0.10.0** captures from November 17, 2026 using a real
user-authorized character project:71 bones,26 slots,32 default-skin attachments
and14 animations. They use the production frontend/CSP in Ubuntu Chromium and an
isolated actual Rust Session. They show FBones, not the reference editor.

The original project, JSON, artwork and private paths remain outside Git and
release archives. Only these authorized rendered screenshots are published;
the original artwork retains its own rights. Source-copy hashes and the native
revision stayed unchanged throughout capture. No project editing or saving was
used to manufacture the displayed animation or curves.

| Image | What it shows |
| --- | --- |
| [setup.png](setup.png) | Full character, actual 71-bone hierarchy and shared Setup transform controls |
| [animate-dopesheet.png](animate-dopesheet.png) | Existing big_win animation at frame 17, multiple keyed bones and Preview |
| [animate-graph.png](animate-graph.png) | Existing head rotation curve in Graph and animated character Preview |

Reproduce with the reviewed `scripts/capture-readme-project.mjs`, an existing
production-CSP `scripts/serve-e2e.mjs` server and a separately provided private
project directory. The helper verifies that the source is supported/editable,
waits for image requests, uses actual UI selection/camera/timeline gestures,
checks the visible package version and rejects source/revision changes. Captures
are 1440×900, were visually inspected before copying and are not cropped, reskinned
or composited. This demonstrates current FBones rendering/UI; original-editor
pixel parity and native OS window gestures are separate evidence.

SHA-256:

```text
ed3a3dceb4a5529de3d9cbbc023175c1c82241b3a8236ae1591024a69c56e787  setup.png
f2b806184d078a9f323a84d8a6d1bf5ba3a0f80290b5af8434b641453f928e16  animate-dopesheet.png
0ba6d36ecb25180e4dacba02b1b50d8b8c8ed13f0339363f3c31003ff0fd326b  animate-graph.png
```
