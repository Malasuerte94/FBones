// Browser-only GPU regression bundle. Never change the production dist/ while
// Playwright serves it; package dist/ must already have been built separately.
import {build} from 'esbuild';
import {mkdir} from 'node:fs/promises';
await mkdir('.local/runtime-pixi-probe', {recursive:true});
await build({entryPoints:['tests/e2e/probes/runtime-pixi.mjs'],outfile:'.local/runtime-pixi-probe/probe.js',bundle:true,format:'esm',target:'es2022',platform:'browser',legalComments:'none'});
