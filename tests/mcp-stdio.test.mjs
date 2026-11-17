import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {spawn} from 'node:child_process';
import {once} from 'node:events';

const received=[];
const server=createServer(async(req,res)=>{
  assert.equal(req.headers.authorization,'Bearer test-token');
  assert.equal(req.url,'/mcp');
  let text='';for await(const chunk of req)text+=chunk;
  const request=JSON.parse(text);received.push(request);
  assert.equal(req.headers['mcp-protocol-version'],request.method==='initialize'?'2025-06-18':'2025-03-26');
  if(!Object.hasOwn(request,'id')){res.writeHead(202);res.end();return;}
  res.setHeader('Content-Type','application/json');
  res.end(JSON.stringify({jsonrpc:'2.0',id:request.id,result:request.method==='initialize'?{protocolVersion:'2025-03-26'}:{ok:true}}));
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
try{
  const child=spawn(process.execPath,['scripts/mcp-stdio.mjs'],{env:{...process.env,
    FBONES_MCP_URL:`http://127.0.0.1:${server.address().port}/mcp`,FBONES_MCP_TOKEN:'test-token'},stdio:['pipe','pipe','pipe']});
  let output='',errors='';child.stdout.on('data',chunk=>output+=chunk);child.stderr.on('data',chunk=>errors+=chunk);
  child.stdin.end('{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}\n{"jsonrpc":"2.0","method":"notifications/initialized"}\n{"jsonrpc":"2.0","id":2,"method":"tools/list"}\n');
  const [code]=await once(child,'exit');assert.equal(code,0,errors);
  assert.deepEqual(output.trim().split('\n').map(JSON.parse),[
    {jsonrpc:'2.0',id:1,result:{protocolVersion:'2025-03-26'}},{jsonrpc:'2.0',id:2,result:{ok:true}},
  ]);
  assert.equal(received.length,3);assert.equal(errors,'');
  console.log('MCP stdio adapter: authenticated HTTP, ordered requests, notification silence pass.');
}finally{await new Promise(resolve=>server.close(resolve));}
