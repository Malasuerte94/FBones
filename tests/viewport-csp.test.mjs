import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import { build } from 'esbuild';

async function runUnderStrictCsp(contents) {
  const { outputFiles } = await build({
    stdin: { contents, resolveDir: process.cwd() },
    bundle: true, write: false, platform: 'browser', format: 'iife',
    target: 'es2022', logLevel: 'silent',
  });
  const context = vm.createContext({
    console, navigator: { userAgent: 'FBones CSP regression' },
    setTimeout, clearTimeout, URL, performance,
  }, { codeGeneration: { strings: false, wasm: false } });
  assert.throws(() => vm.runInContext('new Function("return 1")', context), /Code generation from strings disallowed/);
  vm.runInContext(outputFiles[0].text, context);
  return context;
}

test('unpatched Pixi reproduces the application CSP failure without requiring a GPU', async () => {
  const context = await runUnderStrictCsp(`
    import { WebGLRenderer } from 'pixi.js';
    try { WebGLRenderer.prototype._unsafeEvalCheck.call({}); }
    catch (error) { globalThis.failure = error.message; }
  `);
  assert.match(context.failure, /Current environment does not allow unsafe-eval/);
});

test('the actual viewport entry installs static Pixi implementations under the shipped CSP', async () => {
  const config = JSON.parse(await readFile('src-tauri/tauri.conf.json', 'utf8'));
  const scripts = config.app.security.csp.split(';').find(d => d.trim().startsWith('script-src'));
  assert.ok(scripts);
  assert.equal(scripts.includes("'unsafe-eval'"), false);
  const context = await runUnderStrictCsp(`
    import { createViewport } from './src/viewport/createViewport.ts';
    import { WebGLRenderer } from 'pixi.js';
    globalThis.viewportFactory = createViewport;
    WebGLRenderer.prototype._unsafeEvalCheck.call({});
    globalThis.passed = true;
  `);
  assert.equal(typeof context.viewportFactory, 'function');
  assert.equal(context.passed, true);
});
