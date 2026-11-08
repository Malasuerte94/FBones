#!/usr/bin/env node
import assert from 'node:assert/strict';
import { createHash, generateKeyPairSync, randomBytes, sign } from 'node:crypto';
import { verifyDigest } from './verify-updater-signature.mjs';
import { readFile, writeFile } from 'node:fs/promises';
import { basename } from 'node:path';

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
