# Screenshot provenance

These are unedited captures of FBones **0.9.4** from the accepted October 30,
2026 production-frontend UI regression run. Each capture uses Ubuntu Chromium,
the production content security policy, and an isolated real Rust Session.
They show FBones itself, not the reference editor. The simple rig and green PNG
are generated test fixtures owned by this project; no proprietary artwork or
personal projects appear.

| Image | What it shows | Reproducible scenario |
| --- | --- | --- |
| [setup.png](setup.png) | Setup workspace, bone hierarchy, properties and shared transform tools | `tests/e2e/shared-transform-tools.native.spec.ts` |
| [animate-dopesheet.png](animate-dopesheet.png) | Animate Dopesheet, Physics coefficient/reset tracks, simulation controls and live Preview | `tests/e2e/animation-physics-preview.native.spec.ts`, first test |
| [animate-graph.png](animate-graph.png) | Graph curves, timeline tools and dock layout | `tests/e2e/animation.native.spec.ts`, compact Dopesheet/Graph test |

These screenshots were copied byte for byte from that run's frozen artifacts.
They were visually inspected before publication. They demonstrate the UI;
compatibility and platform validation are documented separately in
[the implementation roadmap](../ROADMAP.md).

To capture updated images, run the relevant scenarios through
`pnpm test:ui --workers=1` using the production build and an isolated test
workspace. Preserve the whole application image, inspect it for personal
information, and use only artwork you have permission to distribute.

SHA-256:

```text
ee2e43f98943def77e3c9825e063159882565afa9ac8614bb21c9b3d1cf8bbfa  setup.png
77918fcf9e7ee8358758e01ab07431d1f62615c528284f75660b8b654cea6926  animate-dopesheet.png
5748490f3bf8713e84bffa2f8010ab1718c280f7d586891933894c773d557f20  animate-graph.png
```
