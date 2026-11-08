#!/usr/bin/env node
import assert from 'node:assert/strict';
import { createHash, generateKeyPairSync, randomBytes, sign } from 'node:crypto';
import { verifyDigest } from './verify-updater-signature.mjs';
import { mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const pair = generateKeyPairSync('ed25519');
const rawKey = pair.publicKey.export({ type: 'spki', format: 'der' }).subarray(-32);
const keyId = randomBytes(8);
const key = Buffer.from(`untrusted comment: generated disposable test key\n${Buffer.concat([Buffer.from('Ed'), keyId, rawKey]).toString('base64')}\n`).toString('base64');
const payload = Buffer.from('Own disposable signed updater fixture.');
const hash = createHash('blake2b512').update(payload).digest();
const signed = (trusted, digest = hash) => {
  const signature = sign(null, digest, pair.privateKey);
  const global = sign(null, Buffer.concat([signature, Buffer.from(trusted)]), pair.privateKey);
  return Buffer.from(`untrusted comment: own test signature\n${Buffer.concat([Buffer.from('ED'), keyId, signature]).toString('base64')}\ntrusted comment: ${trusted}\n${global.toString('base64')}\n`).toString('base64');
};
const signature = signed('timestamp:1\tfile:own.AppImage\tversion:0.9.5');
verifyDigest(hash, signature, key, '0.9.5', 'own.AppImage');
assert.throws(() => verifyDigest(createHash('blake2b512').update('tampered').digest(), signature, key, '0.9.5', 'own.AppImage'));
assert.throws(() => verifyDigest(hash, signature, key, '0.9.6', 'own.AppImage'));
assert.throws(() => verifyDigest(hash, signature, key, '0.9.5', 'other.AppImage'));
assert.throws(() => verifyDigest(hash, signed('timestamp:1\tfile:own.AppImage'), key, '0.9.5', 'own.AppImage'));
assert.throws(() => verifyDigest(hash, signed('timestamp:1\tfile:own.AppImage\tversion:0.9.5\tversion:0.9.6'), key, '0.9.5', 'own.AppImage'));
const changed = Buffer.from(signature, 'base64').toString().replace('version:0.9.5', 'version:0.9.6');
assert.throws(() => verifyDigest(hash, Buffer.from(changed).toString('base64'), key, '0.9.6', 'own.AppImage'));
assert.throws(() => verifyDigest(hash, signature + '!', key, '0.9.5', 'own.AppImage'));
const wrongKey = Buffer.from(key, 'base64').toString().split('\n');
const wrongRaw = Buffer.from(wrongKey[1], 'base64');
wrongRaw[10] ^= 1;
wrongKey[1] = wrongRaw.toString('base64');
assert.throws(() => verifyDigest(hash, signature, Buffer.from(wrongKey.join('\n')).toString('base64'), '0.9.5', 'own.AppImage'));
console.log('Updater signature checks: genuine payload accepted; 8 tamper/version/key/framing cases rejected.');

if (process.argv[2] !== '--write-fixtures') {
  const directory = await mkdtemp(join(tmpdir(), 'fbones-updater-entry-'));
  try {
    const alias = join(directory, 'script-alias');
    await symlink(dirname(fileURLToPath(import.meta.url)), alias, process.platform === 'win32' ? 'junction' : 'dir');
    const script = join(alias, 'verify-updater-signature.mjs');
    const artifact = join(directory, 'own.AppImage');
    const signaturePath = artifact + '.sig';
    await writeFile(signaturePath, signature);
    for (const flags of [[], ['--preserve-symlinks-main']]) {
      const run = (args) => {
        const result = spawnSync(process.execPath, [...flags, script, ...args], { encoding: 'utf8' });
        assert.ifError(result.error);
        assert.notEqual(result.status, null, 'Verifier process must exit normally.');
        return result;
      };
      const missing = run([]);
      assert.notEqual(missing.status, 0, 'A symlinked CLI must validate its required arguments.');
      assert.match(missing.stderr, /Usage:/);
      await writeFile(artifact, payload);
      const valid = run([artifact, signaturePath, key, '0.9.5']);
      assert.equal(valid.status, 0, valid.stderr);
      assert.equal(valid.stdout.trim(), 'Verified signed updater: own.AppImage (0.9.5).');
      const wrongVersion = run([artifact, signaturePath, key, '0.9.6']);
      assert.notEqual(wrongVersion.status, 0);
      assert.match(wrongVersion.stderr, /does not bind/);
      await writeFile(artifact, 'Altered after signing');
      const tampered = run([artifact, signaturePath, key, '0.9.5']);
      assert.notEqual(tampered.status, 0);
      assert.match(tampered.stderr, /signature verification failed/);
    }
    console.log('Updater CLI alias checks: valid receipt and 3 rejections pass with normal and preserved main symlinks.');
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

// Packaging regressions use disposable generated packages and a fresh in-memory
// key. No private key is written; production signing remains outside this helper.
if (process.argv[2] === '--write-fixtures') {
  let input = '';
  for await (const chunk of process.stdin) input += chunk;
  const fixture = JSON.parse(input);
  await writeFile(fixture.publicKeyPath, key);
  for (const path of fixture.files) {
    const digest = createHash('blake2b512').update(await readFile(path)).digest();
    await writeFile(path + '.sig', signed(`timestamp:1\tfile:${basename(path)}\tversion:${fixture.version}`, digest));
  }
}
