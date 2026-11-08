import {build} from 'esbuild';
import {spawnSync} from 'node:child_process';
import {readdir, readFile, writeFile, mkdir, copyFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';

const directory = fileURLToPath(new URL('.', import.meta.url));
const result = spawnSync(process.execPath, [fileURLToPath(new URL('../../node_modules/typescript/bin/tsc', import.meta.url)), '-p', join(directory, 'tsconfig.json')], {stdio: 'inherit'});
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);
await build({entryPoints: [join(directory, 'src/index.ts'), join(directory, 'src/pixi.ts')], outdir: join(directory, 'dist'), bundle: true, format: 'esm', target: 'es2022', platform: 'neutral', external: ['pixi.js', 'pixi.js/*'], legalComments: 'none'});
// Declaration imports must work in an installed package without TS sources.
async function fixDeclarations(path) {
  for (const entry of await readdir(path, {withFileTypes: true})) {
    const file = join(path, entry.name);
    if (entry.isDirectory()) await fixDeclarations(file);
    else if (entry.name.endsWith('.d.ts')) await writeFile(file, (await readFile(file, 'utf8')).replace(/((?:from\s*|import\s*\()['"][^'"]+)\.ts(['"])/g, '$1.js$2'));
  }
}
await fixDeclarations(join(directory, 'dist/types'));
await mkdir(join(directory, 'dist'), {recursive: true});
await copyFile(new URL('../../LICENSE', import.meta.url), join(directory, 'LICENSE'));
console.log('Built independent headless/Pixi runtime and declarations.');
