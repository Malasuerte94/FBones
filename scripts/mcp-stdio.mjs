#!/usr/bin/env node
// Optional bridge for MCP clients that only support stdio. Node >=22.12.
import {createInterface} from 'node:readline';

const endpoint = process.env.FBONES_MCP_URL;
const token = process.env.FBONES_MCP_TOKEN;
let url;
try {
  url = new URL(endpoint);
  if (url.protocol !== 'http:' || url.hostname !== '127.0.0.1' || url.pathname !== '/mcp' || !token) throw Error();
} catch {
  process.stderr.write('Set FBONES_MCP_URL to the running editor http://127.0.0.1:PORT/mcp and FBONES_MCP_TOKEN to its token.\n');
  process.exit(1);
}
let protocolVersion = '2025-06-18';
const lines = createInterface({input: process.stdin, crlfDelay: Infinity});
for await (const line of lines) {
  if (!line.trim()) continue;
  let message;
  try {
    if (Buffer.byteLength(line) > 8 * 1024 * 1024) throw Error('Request exceeds 8 MiB.');
    message = JSON.parse(line);
    const response = await fetch(url, {
      method: 'POST',
      headers: {'Content-Type':'application/json', Accept:'application/json, text/event-stream',
        Authorization:`Bearer ${token}`, 'MCP-Protocol-Version':protocolVersion},
      body: line,
      signal: AbortSignal.timeout(120_000),
    });
    if (response.status === 202 || response.status === 204) continue;
    if (!response.ok) throw Error(`Editor returned HTTP ${response.status}.`);
    const result = await response.json();
    if (message.method === 'initialize' && typeof result.result?.protocolVersion === 'string') protocolVersion = result.result.protocolVersion;
    process.stdout.write(JSON.stringify(result) + '\n');
  } catch (error) {
    // Notifications have no response. Diagnostics never include connection secrets.
    if (message && Object.hasOwn(message, 'id')) {
      process.stdout.write(JSON.stringify({jsonrpc:'2.0',id:message.id,error:{code:-32000,
        message:error instanceof Error ? error.message : 'MCP bridge failed.'}}) + '\n');
    } else process.stderr.write('Invalid notification or MCP connection failure.\n');
  }
}
