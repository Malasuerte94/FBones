# Third-party notices

FBones uses third-party packages under their respective licenses. The MIT
license in this repository covers FBones's original work; it does not replace
upstream package licenses.

| Component | Upstream | License expression in installed package metadata |
| --- | --- | --- |
| Tauri and Tauri build tooling | https://github.com/tauri-apps/tauri | MIT OR Apache-2.0 |
| Vue | https://github.com/vuejs/core | MIT |
| Pinia | https://github.com/vuejs/pinia | MIT |
| Vue I18n | https://github.com/intlify/vue-i18n | MIT |
| PixiJS | https://github.com/pixijs/pixijs | MIT |
| Tailwind CSS | https://github.com/tailwindlabs/tailwindcss | MIT |
| Vite | https://github.com/vitejs/vite | MIT |
| TypeScript | https://github.com/microsoft/TypeScript | Apache-2.0 |
| Playwright | https://github.com/microsoft/playwright | Apache-2.0 |
| gtk-rs | https://github.com/gtk-rs/gtk3-rs | MIT |
| flate2 | https://github.com/rust-lang/flate2-rs | MIT OR Apache-2.0 |
| thiserror | https://github.com/dtolnay/thiserror | MIT OR Apache-2.0 |
| serde | https://github.com/serde-rs/serde | MIT OR Apache-2.0 |
| serde_json | https://github.com/serde-rs/json | MIT OR Apache-2.0 |
| png | https://github.com/image-rs/image-png | MIT OR Apache-2.0 |
| base64 | https://github.com/marshallpierce/rust-base64 | MIT OR Apache-2.0 |
| tempfile | https://github.com/Stebalien/tempfile | MIT OR Apache-2.0 |

This table records direct dependency metadata, not an exhaustive notice bundle
for compiled binaries. Exact dependency versions are pinned in `Cargo.lock` and
`pnpm-lock.yaml`. Source installations obtain upstream license files with their
dependencies. Binary distributors must retain the applicable upstream license
texts and notices for the dependencies included in their particular artifact.

No proprietary Spine editor, runtime source, artwork, fonts, or extracted
resources are bundled. FBones icons and generated test/demo geometry are
original project material. Spine and Esoteric Software names and trademarks
belong to their respective owners; no affiliation or endorsement is implied.
