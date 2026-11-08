import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createAppUpdateController} from '../src/composables/useAppUpdater.ts';

const state=(phase,extra={})=>({phase,currentVersion:'0.9.5',version:phase==='idle'||phase==='upToDate'||phase==='unsupported'?null:'0.9.6',downloaded:0,total:null,error:null,supported:phase!=='unsupported',...extra});
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return{promise,resolve,reject};};
const turn=()=>new Promise(resolve=>setImmediate(resolve));
function fixture({auto=true,invoke,beforeInstall=async()=>true,expectedRevision=()=>19,listen}={}){
 const calls=[],storage=new Map([['fbones.app-updates.auto.v1',String(auto)]]),timers=new Set();let listener=()=>{},stopped=0;
 const transport={invoke(command,args){calls.push({command,args});if(invoke)return invoke(command,args);return Promise.resolve(state(command==='get_app_update_state'?'idle':command==='check_app_update'?'available':command==='download_app_update'?'ready':'installing',{downloaded:command==='download_app_update'?20:0,total:command==='download_app_update'?20:null}));},async listen(handler){listener=handler;if(listen)return listen(handler);return()=>{stopped++;listener=()=>{};};}};
 const controller=createAppUpdateController({transport,beforeInstall,expectedRevision,storage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)},setInterval(callback,delay){const id={callback,delay};timers.add(id);return id;},clearInterval:id=>timers.delete(id)});
 return{controller,calls,storage,timers,emit:value=>listener(value),stopped:()=>stopped};
}

test('automatic native check downloads in background, then requires an explicit guarded install',async()=>{
 let guards=0;const e=fixture({beforeInstall:async()=>{guards++;return true;}});
 try{
  await e.controller.start();await turn();
  assert.deepEqual(e.calls.map(c=>c.command),['get_app_update_state','check_app_update','download_app_update']);
  assert.equal(e.controller.snapshot.value.phase,'ready');assert.equal(e.controller.visible.value,true);assert.equal(e.controller.percent.value,100);assert.equal(guards,0);assert.equal(e.controller.installing.value,false);
  assert.equal([...e.timers][0].delay,3_600_000);
  assert.equal(await e.controller.install(),true);assert.equal(guards,1);assert.equal(e.controller.installing.value,true);assert.equal(e.controller.snapshot.value.phase,'installing');
  assert.deepEqual(e.calls.at(-1),{command:'install_app_update',args:{expectedRevision:19}});
 }finally{e.controller.dispose();}
 assert.equal(e.timers.size,0);assert.equal(e.stopped(),1);
});

test('persisted automatic disable prevents startup/periodic checks and downloads, while manual actions remain available',async()=>{
 const e=fixture({auto:false});try{
  await e.controller.start();assert.deepEqual(e.calls.map(c=>c.command),['get_app_update_state']);assert.equal(e.timers.size,0);
  await e.controller.checkNow();await turn();assert.equal(e.controller.visible.value,true);assert.equal(e.controller.snapshot.value.phase,'available');assert.equal(e.calls.filter(c=>c.command==='download_app_update').length,0);
  await e.controller.download();assert.equal(e.controller.snapshot.value.phase,'ready');
  e.controller.setAutoEnabled(true);assert.equal(e.storage.get('fbones.app-updates.auto.v1'),'true');assert.equal(e.timers.size,1);
  e.controller.setAutoEnabled(false);assert.equal(e.storage.get('fbones.app-updates.auto.v1'),'false');assert.equal(e.timers.size,0);
 }finally{e.controller.dispose();}
});

test('periodic checks are quiet and stopping automatic checks cancels their timer',async()=>{
 const e=fixture({invoke:async command=>state(command==='get_app_update_state'?'idle':'upToDate')});try{
  await e.controller.start();assert.equal(e.controller.visible.value,false);const timer=[...e.timers][0];timer.callback();await turn();assert.equal(e.calls.filter(c=>c.command==='check_app_update').length,2);
  e.controller.setAutoEnabled(false);timer.callback();await turn();assert.equal(e.calls.filter(c=>c.command==='check_app_update').length,2);
 }finally{e.controller.dispose();}
});

test('offline startup errors are quiet; a manual check reports the error and retry can recover',async()=>{
 let offline=true;const e=fixture({invoke:async command=>{if(command==='get_app_update_state')return state('idle');if(offline)throw Error('Offline');return state('upToDate');}});try{
  await e.controller.start();assert.equal(e.controller.snapshot.value.phase,'error');assert.equal(e.controller.visible.value,false);assert.equal(e.controller.snapshot.value.error,'Offline');
  assert.equal(await e.controller.checkNow(),false);assert.equal(e.controller.visible.value,true);
  offline=false;assert.equal(await e.controller.retry(),true);assert.equal(e.controller.snapshot.value.phase,'upToDate');assert.equal(e.calls.some(c=>c.command==='install_app_update'),false);
 }finally{e.controller.dispose();}
});

test('a native signature failure cannot become installable or trigger automatic retries',async()=>{
 let guards=0;const e=fixture({beforeInstall:async()=>{guards++;return true;},invoke:async command=>command==='get_app_update_state'?state('idle'):command==='check_app_update'?state('available'):state('error',{error:'Signature verification failed'})});try{
  await e.controller.start();await turn();assert.equal(e.controller.snapshot.value.phase,'error');assert.equal(e.controller.visible.value,false);assert.equal(e.calls.filter(c=>c.command==='download_app_update').length,1);
  assert.equal(await e.controller.install(),false);assert.equal(guards,0);assert.equal(e.calls.some(c=>c.command==='install_app_update'),false);
  await e.controller.retry();assert.equal(e.calls.filter(c=>c.command==='download_app_update').length,2);assert.equal(e.controller.snapshot.value.phase,'error');
 }finally{e.controller.dispose();}
});

test('Cancel and failed Save never install; the guarded revision is read only after preparation succeeds',async()=>{
 let gate=deferred(),revision=8;const e=fixture({invoke:async command=>state(command==='install_app_update'?'installing':'ready'),beforeInstall:()=>gate.promise,expectedRevision:()=>revision});try{
  await e.controller.start();const canceled=e.controller.install();assert.equal(e.controller.preparing.value,true);assert.equal(e.controller.installing.value,false);gate.resolve(false);assert.equal(await canceled,false);assert.equal(e.calls.some(c=>c.command==='install_app_update'),false);
  gate=deferred();const failedSave=e.controller.install();gate.resolve(false);assert.equal(await failedSave,false);assert.equal(e.calls.some(c=>c.command==='install_app_update'),false);
  gate=deferred();const confirmed=e.controller.install();assert.equal(e.controller.installing.value,false);revision=23;gate.resolve(true);assert.equal(await confirmed,true);assert.deepEqual(e.calls.at(-1),{command:'install_app_update',args:{expectedRevision:23}});
 }finally{e.controller.dispose();}
});

test('download progress uses optional total bytes and a stale RPC cannot overwrite native ready events',async()=>{
 const download=deferred();const e=fixture({invoke:async command=>command==='get_app_update_state'?state('idle'):command==='check_app_update'?state('available'):download.promise});try{
  await e.controller.start();await turn();e.emit(state('downloading',{downloaded:5,total:null}));assert.equal(e.controller.percent.value,null);
  e.emit(state('downloading',{downloaded:10,total:20}));assert.equal(e.controller.percent.value,50);
  e.emit(state('ready',{downloaded:20,total:20}));download.resolve(state('available'));await turn();assert.equal(e.controller.snapshot.value.phase,'ready');assert.equal(e.controller.percent.value,100);
 }finally{e.controller.dispose();}
});

test('an install cannot race a still-running download even if its ready event arrives before the RPC reply',async()=>{
 const downloading=deferred();let guards=0;const e=fixture({beforeInstall:async()=>{guards++;return true;},invoke:async command=>command==='get_app_update_state'?state('idle'):command==='check_app_update'?state('available'):downloading.promise});try{
  await e.controller.start();await turn();e.emit(state('ready'));assert.equal(e.controller.busy.value,true);assert.equal(await e.controller.install(),false);assert.equal(guards,0);
  downloading.resolve(state('ready'));await turn();assert.equal(e.controller.busy.value,false);
 }finally{e.controller.dispose();}
});

test('new native events supersede a stale startup read and malformed status never becomes installable',async()=>{
 const initial=deferred();const e=fixture({invoke:async()=>initial.promise});try{
  const started=e.controller.start();await turn();e.emit(state('ready'));initial.resolve(state('idle'));await started;assert.equal(e.controller.snapshot.value.phase,'ready');assert.equal(e.calls.length,1);
 }finally{e.controller.dispose();}
 const bad=fixture({auto:false,invoke:async command=>command==='get_app_update_state'?state('idle'):({phase:'ready',supported:true})});try{
  await bad.controller.start();assert.equal(await bad.controller.checkNow(),false);assert.equal(bad.controller.snapshot.value.phase,'error');assert.equal(await bad.controller.install(),false);assert.equal(bad.calls.some(c=>c.command==='install_app_update'),false);
 }finally{bad.controller.dispose();}
});

test('unmount while the dirty guard is pending ignores its late acceptance',async()=>{
 const gate=deferred();const e=fixture({beforeInstall:()=>gate.promise,invoke:async()=>state('ready')});await e.controller.start();const installing=e.controller.install();assert.equal(e.controller.installing.value,false);e.controller.dispose();gate.resolve(true);assert.equal(await installing,false);assert.equal(e.calls.some(c=>c.command==='install_app_update'),false);
});

test('manual check supersedes a stale startup snapshot; disposal ignores late replies and unsubscribes',async()=>{
 const initial=deferred(),check=deferred();const e=fixture({invoke:async command=>command==='get_app_update_state'?initial.promise:check.promise});
 const started=e.controller.start();await turn();const manual=e.controller.checkNow();check.resolve(state('upToDate'));await manual;initial.resolve(state('available'));await started;assert.equal(e.controller.snapshot.value.phase,'upToDate');assert.equal(e.calls.some(c=>c.command==='download_app_update'),false);
 e.controller.dispose();const after=e.controller.snapshot.value;e.emit(state('ready'));assert.equal(e.controller.snapshot.value,after);assert.equal(e.stopped(),1);assert.equal(e.timers.size,0);
});

test('unmount during listener setup immediately cleans up the late listener and never invokes native commands',async()=>{
 const listening=deferred();let cleanup=0;const e=fixture({listen:()=>listening.promise});const started=e.controller.start();e.controller.dispose();listening.resolve(()=>{cleanup++;});await started;assert.equal(cleanup,1);assert.equal(e.calls.length,0);
});

test('a local workspace copy or browser-test bridge is unsupported and never invokes its project transport',async()=>{
 const old=globalThis.__TAURI__,internals=globalThis.__TAURI_INTERNALS__;let calls=0;
 try{
  delete globalThis.__TAURI_INTERNALS__;globalThis.__TAURI__={core:{invoke(){calls++;throw Error('Do not call the e2e Session bridge.');}},event:{listen(){calls++;}}};
  const c=createAppUpdateController({beforeInstall:async()=>true,expectedRevision:()=>null,storage:null});try{await c.start();assert.equal(c.snapshot.value.phase,'unsupported');assert.equal(await c.checkNow(),false);assert.equal(await c.install(),false);assert.equal(c.visible.value,true);assert.equal(calls,0);}finally{c.dispose();}
 }finally{if(old===undefined)delete globalThis.__TAURI__;else globalThis.__TAURI__=old;if(internals===undefined)delete globalThis.__TAURI_INTERNALS__;else globalThis.__TAURI_INTERNALS__=internals;}
});
