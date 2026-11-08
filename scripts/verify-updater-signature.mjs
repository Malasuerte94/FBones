#!/usr/bin/env node
// Verify Tauri's Minisign envelope using Node's native cryptographic primitives.
import { createHash, createPublicKey, verify } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

function base64(text) {
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(text)) {
    throw new Error('Invalid updater signature encoding.');
  }
  const result = Buffer.from(text, 'base64');
  if (result.toString('base64') !== text) throw new Error('Noncanonical updater signature encoding.');
  return result;
}

export function verifyDigest(hash, encodedSignature, encodedKey, version, filename) {
  const keyLines = base64(encodedKey.trim()).toString('utf8').trimEnd().split('\n');
  const lines = base64(encodedSignature.trim()).toString('utf8').trimEnd().split('\n');
  if (keyLines.length !== 2 || lines.length !== 4
      || !keyLines[0].startsWith('untrusted comment: ') || !lines[0].startsWith('untrusted comment: ')
      || !lines[2].startsWith('trusted comment: ')) throw new Error('Unexpected Minisign envelope.');
  const key = base64(keyLines[1]);
  const signature = base64(lines[1]);
  const globalSignature = base64(lines[3]);
  if (key.length !== 42 || key.subarray(0, 2).toString() !== 'Ed'
      || signature.length !== 74 || signature.subarray(0, 2).toString() !== 'ED'
      || globalSignature.length !== 64 || !key.subarray(2, 10).equals(signature.subarray(2, 10))) {
    throw new Error('Unexpected updater signing algorithm or key.');
  }
  const publicKey = createPublicKey({
    key: Buffer.concat([Buffer.from('302a300506032b6570032100', 'hex'), key.subarray(10)]),
    format: 'der', type: 'spki',
  });
  const trusted = lines[2].slice('trusted comment: '.length);
  if (!verify(null, hash, publicKey, signature.subarray(10))
      || !verify(null, Buffer.concat([signature.subarray(10), Buffer.from(trusted)]), publicKey, globalSignature)) {
    throw new Error('Updater signature verification failed.');
  }
  // Read authenticated metadata only after both Ed25519 signatures have passed.
  if (!/^\d+\.\d+\.\d+$/.test(version) || /[\t\r\n]/.test(filename)
      || !/^timestamp:[0-9]+\tfile:[^\t\r\n]+\tversion:[^\t\r\n]+$/.test(trusted)
      || trusted.split('\t')[1] !== `file:${filename}` || trusted.split('\t')[2] !== `version:${version}`) {
    throw new Error('Updater signature does not bind this filename and app version.');
  }
}

export async function verifyArtifact(artifact, signaturePath, publicKey, version) {
  const hash = createHash('blake2b512');
  for await (const chunk of createReadStream(artifact)) hash.update(chunk);
  const signature = await readFile(signaturePath, 'utf8');
  if (signature.length > 4096) throw new Error('Unexpected updater signature size.');
  verifyDigest(hash.digest(), signature, publicKey, version, basename(artifact));
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [artifact, signaturePath, publicKey, version] = process.argv.slice(2);
  try {
    if (!artifact || !signaturePath || !publicKey || !version || process.argv.length !== 6) {
      throw new Error('Usage: verify-updater-signature.mjs ARTIFACT SIGNATURE PUBLIC_KEY VERSION');
    }
    await verifyArtifact(artifact, signaturePath, publicKey, version);
    console.log(`Verified signed updater: ${basename(artifact)} (${version}).`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Updater verification failed.');
    process.exitCode = 1;
  }
}
