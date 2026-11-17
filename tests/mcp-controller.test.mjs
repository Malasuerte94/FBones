import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createMcpController} from '../src/composables/useMcp.ts';
const running={enabled:true,url:'http://127.0.0.1:54123/mcp',token:'own-test-token'};
const stopped={enabled:false,url:null,token:null};

test('MCP retains copyable connection while stopped and resets only while stopped',async()=>{
 const calls=[];const remembered={...running,enabled:false};
 const controller=createMcpController({beforeStart:async()=>true,invoke:async command=>{calls.push(command);return command==='mcp_start'?running:remembered;}});
 await controller.refresh();const config=controller.config.value;assert(config.includes(running.url));
 await controller.reset();assert.equal(calls.at(-1),'mcp_reset');
 await controller.start();assert.equal(await controller.reset(),false);assert.equal(calls.at(-1),'mcp_start');
 await controller.stop();assert.equal(controller.config.value,config);
});

test('MCP starts only after field/draft guard and copies actual native connection',async()=>{
 let allowed=false,copied='',calls=[];
 const controller=createMcpController({beforeStart:async()=>allowed,invoke:async command=>{calls.push(command);return command==='mcp_stop'?stopped:running;},copy:async value=>{copied=value;}});
 assert.equal(await controller.start(),false);assert.deepEqual(calls,[]);assert.equal(controller.config.value,'');
 allowed=true;assert.equal(await controller.start(),true);assert.equal(controller.state.value.enabled,true);
 await controller.copy();assert.equal(controller.copied.value,true);
 assert.deepEqual(JSON.parse(copied),{mcpServers:{fbones:{url:running.url,headers:{Authorization:'Bearer own-test-token'}}}});
 await controller.stop();assert.equal(controller.config.value,'');assert.equal(controller.state.value.enabled,false);
});

test('MCP bind failure is visible and does not lock manual editing',async()=>{
 const controller=createMcpController({beforeStart:async()=>true,invoke:async()=>{throw Error('Address unavailable');}});
 assert.equal(await controller.start(),false);assert.equal(controller.error.value,'Address unavailable');assert.equal(controller.state.value.enabled,false);assert.equal(controller.busy.value,false);
});

test('MCP serializes startup and ignores a disposed native response',async()=>{
 let resolve,calls=0;const pending=new Promise(done=>{resolve=done;});
 const controller=createMcpController({beforeStart:async()=>true,invoke:async()=>{calls++;return pending;}});
 const first=controller.start();assert.equal(await controller.start(),false);
 await Promise.resolve();controller.dispose();resolve(running);await first;
 assert.equal(calls,1);assert.equal(controller.state.value.enabled,false);assert.equal(controller.busy.value,false);
});

test('MCP refuses incomplete live configuration and reports clipboard failures',async()=>{
 const controller=createMcpController({beforeStart:async()=>true,invoke:async()=>({enabled:true,url:null,token:null})});
 assert.equal(await controller.start(),false);assert.equal(controller.state.value.enabled,false);
 const active=createMcpController({beforeStart:async()=>true,invoke:async()=>running,copy:async()=>{throw Error('Clipboard unavailable');}});
 await active.start();await active.copy();assert.equal(active.copied.value,false);assert.equal(active.error.value,'Clipboard unavailable');
});

test('MCP publishes AI lock before opening native mutation gate and closes gate on disposal',async()=>{
 const readiness=[];let controller;
 controller=createMcpController({beforeStart:async()=>true,invoke:async command=>command==='mcp_stop'?stopped:running,setReady:async ready=>{readiness.push({ready,enabled:controller.state.value.enabled});}});
 await controller.start();assert.deepEqual(readiness,[{ready:true,enabled:true}]);
 await controller.stop();assert.deepEqual(readiness.at(-1),{ready:false,enabled:false});
 controller.dispose();assert.deepEqual(readiness.at(-1),{ready:false,enabled:false});
});
