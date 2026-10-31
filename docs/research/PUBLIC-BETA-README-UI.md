# Public beta README UI audit

Date: 2026-10-31. Scope: the public README, its three FBones screenshots,
Markdown structure, relative links and accessibility descriptions. No product
feature, editor source or original-editor observation is changed by this audit.

## Directly observed

- The README opens with the product purpose, free/open-source status, beta version,
  and links to setup, implementation status, contributing and roadmap. Its
  implementation table distinguishes available functionality from pending work.
  Source-only delivery and platform/compatibility limits are explicit.
- All three screenshots were individually viewed. Each is a real FBones 0.9.4
  capture: Setup/shared transform controls; Animate Physics Dopesheet/Preview;
  and bone animation Graph. They contain simple owned fixtures, no proprietary
  reference-editor art, personal project names or local absolute paths.
- PNG decoding with Pillow verifies three 1440×900 images, totaling 382,039 bytes.
  SHA-256 values agree with `docs/screenshots/README.md`. No image was retouched.
- Local Markdown parsing with `markdown_it.MarkdownIt('commonmark',
  {'html': True}).enable('table')`, then BeautifulSoup inspection, produces
  six headings, three images with nonempty alt text, one table with eleven
  status rows, and two fenced code blocks. All README relative file links and
  internal navigation anchors resolve in the workspace.
- The screenshot files come from the accepted 95-case production-frontend and
  real-Rust UI run. Reusing these images adds no new native platform claim.

The local parsing receipt and HTML are retained privately under
`.local/public-beta/readme-ui/`; they are validation artifacts, not repository
dependencies.

## Inferred presentation and small correction

The heading hierarchy, short introduction, image sequence, comparison table and
linked contribution instructions should provide a readable GitHub entry point.
This is an inference from valid source structure and the inspected PNGs.

The Setup screenshot's pre-audit alt description mentioned attachments, although
that particular fixture shows a bone and no attachments. Applied replacement:
“FBones Setup workspace with bone hierarchy, properties, and shared transform
tools.” The surrounding paragraph can describe the broader Setup functionality.

The full-width 1440-pixel images retain readable detail when opened directly.
At narrow widths, GitHub will scale them; the implementation table may require
horizontal scrolling. A brief description around each image already conveys
the key functions without requiring readers to inspect small controls.

## Unknown / not claimed

No live GitHub README was visually inspected in this session. Starting a new local
HTTP server failed with `listen EPERM`; launching Chromium failed with a crashpad
socket permission error. Those limitations were retained rather than worked
around by changing the application or weakening its content security policy.
Local Markdown parsing is not a browser layout check or an exact GitHub rendering
oracle. No fresh screenshot, native editor launch, feature test or original-editor
comparison follows from this audit.

## Next reproducible check

After publication, open the repository's README in a normal desktop and narrow
browser viewport. Confirm the centered introduction, navigation, all three PNGs,
table overflow and contributor links. Open each image to verify full-resolution
detail. The alt-description correction is applied in the current source.
