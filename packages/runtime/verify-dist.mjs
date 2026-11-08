import {access,readFile} from 'node:fs/promises';
for (const path of ['dist/index.js','dist/pixi.js','dist/types/packages/runtime/src/index.d.ts','dist/types/packages/runtime/src/pixi.d.ts','LICENSE']) await access(new URL(path,import.meta.url));
const core=await readFile(new URL('dist/index.js',import.meta.url),'utf8');
if (/from ["'](?:pixi|vue|pinia|@tauri|node:)/.test(core)) throw new Error('The headless bundle must not import a platform/editor dependency.');
console.log('Runtime tarball prerequisites pass.');
