import {computed,onBeforeUnmount,onMounted,ref,shallowRef} from 'vue';
import {invokeNative} from '../services/bridge.ts';

export type AppUpdatePhase='idle'|'checking'|'upToDate'|'available'|'downloading'|'ready'|'installing'|'error'|'unsupported';
export interface AppUpdateSnapshot {
 phase:AppUpdatePhase;currentVersion:string;version:string|null;downloaded:number;total:number|null;error:string|null;supported:boolean;
}
export interface AppUpdateTransport {
 invoke:(command:string,args?:Record<string,unknown>)=>Promise<AppUpdateSnapshot>;
 listen:(handler:(snapshot:AppUpdateSnapshot)=>void)=>Promise<()=>void>;
}
interface UpdateStorage {getItem:(key:string)=>string|null;setItem:(key:string,value:string)=>void}
export interface AppUpdaterOptions {
 beforeInstall:()=>Promise<boolean>;
 expectedRevision:()=>number|null;
 /** Inject only for controller tests; the default never uses the test Session bridge. */
 transport?:AppUpdateTransport|null;
 storage?:UpdateStorage|null;
 intervalMs?:number;
 setInterval?:(callback:()=>void,delay:number)=>ReturnType<typeof setInterval>;
 clearInterval?:(id:ReturnType<typeof setInterval>)=>void;
}
const storageKey='fbones.app-updates.auto.v1';
const phases:readonly string[]=['idle','checking','upToDate','available','downloading','ready','installing','error','unsupported'];
function actualTransport():AppUpdateTransport|null {
 const globals=globalThis as typeof globalThis&{__TAURI_INTERNALS__?:unknown;__TAURI__?:{event?:{listen:<T>(name:string,handler:(event:{payload:T})=>void)=>Promise<()=>void>}}};
 const events=globals.__TAURI__?.event;
 if(!globals.__TAURI_INTERNALS__||!events)return null;
 return{invoke:(command,args)=>invokeNative<AppUpdateSnapshot>(command,args),listen:handler=>events.listen<AppUpdateSnapshot>('app-update-state',event=>handler(event.payload))};
}
function defaultStorage():UpdateStorage|null {try{return globalThis.localStorage??null;}catch{return null;}}
function validated(value:AppUpdateSnapshot):AppUpdateSnapshot {
 if(!value||!phases.includes(value.phase)||typeof value.currentVersion!=='string'||typeof value.supported!=='boolean'||!Number.isFinite(value.downloaded)||value.downloaded<0||value.total!==null&&(!Number.isFinite(value.total)||value.total<0)||value.version!==null&&typeof value.version!=='string'||value.error!==null&&typeof value.error!=='string')throw Error('Invalid update status.');
 return{...value};
}

/** Native updater orchestration only. The Rust backend owns versions/signatures/files. */
export function createAppUpdateController(options:AppUpdaterOptions){
 const transport=options.transport===undefined?actualTransport():options.transport;
 const storage=options.storage===undefined?defaultStorage():options.storage;
 const schedule=options.setInterval??setInterval,cancel=options.clearInterval??clearInterval;
 const snapshot=shallowRef<AppUpdateSnapshot>({phase:transport?'idle':'unsupported',currentVersion:'',version:null,downloaded:0,total:null,error:null,supported:false});
 const autoEnabled=ref(true),installing=ref(false),preparing=ref(false),visible=ref(false),inFlight=ref(false);
 try{autoEnabled.value=storage?.getItem(storageKey)!=='false';}catch{/* Optional local preference. */}
 let disposed=false,started=false,epoch=0,eventSerial=0;
 let timer:ReturnType<typeof setInterval>|null=null,unlisten:(()=>void)|null=null;
 let operation:Promise<boolean>|null=null,active:'check'|'download'|'install'|null=null;
 let failed:'check'|'download'|'install'='check';
 const percent=computed(()=>snapshot.value.total!==null&&snapshot.value.total>0?Math.min(100,100*snapshot.value.downloaded/snapshot.value.total):null);
 const busy=computed(()=>preparing.value||inFlight.value||['checking','downloading','installing'].includes(snapshot.value.phase));
 function accept(value:AppUpdateSnapshot,fromEvent=false){
  if(disposed)return;
  const next=validated(value),current=snapshot.value;
  // A late available/checking reply cannot roll a ready download backwards.
  if(next.version===current.version&&['downloading','ready','installing'].includes(current.phase)&&['idle','checking','available'].includes(next.phase))return;
  if(fromEvent)eventSerial++;
  snapshot.value=next;
  if(next.phase==='error')installing.value=false;
  if(next.phase==='ready'&&current.phase!=='ready')visible.value=true;
  if(next.phase==='error'&&active)failed=active;
 }
 function failure(error:unknown,action:typeof failed,manual:boolean){
  if(disposed)return;
  failed=action;snapshot.value={...snapshot.value,phase:'error',error:error instanceof Error?error.message:String(error)};
  if(manual)visible.value=true;
 }
 function maybeDownload(){if(!disposed&&autoEnabled.value&&snapshot.value.phase==='available'&&!operation)void download(false);}
 function run(command:string,action:typeof failed,manual:boolean,args?:Record<string,unknown>):Promise<boolean>{
  if(disposed||!transport)return Promise.resolve(false);
  if(operation)return operation;
  const token=++epoch,serial=eventSerial;
  active=action;inFlight.value=true;
  // Publish the operation lock before dispatch. An immediate native event must
  // not start a second download while this command is still being registered.
  const pending=Promise.resolve().then(()=>transport.invoke(command,args)).then(value=>{
   if(disposed||token!==epoch)return false;
   // Events after this request may contain newer progress/readiness. Do not
   // overwrite those with an older final RPC snapshot.
   if(eventSerial===serial||!['ready','installing','error'].includes(snapshot.value.phase))accept(value);
   return snapshot.value.phase!=='error'&&snapshot.value.phase!=='unsupported';
  }).catch(error=>{if(!disposed&&token===epoch)failure(error,action,manual);return false;}).finally(()=>{
   if(operation===pending){operation=null;active=null;inFlight.value=false;if(!disposed)maybeDownload();}
  });
  operation=pending;return pending;
 }
 function download(manual=true):Promise<boolean>{
  if(manual)visible.value=true;
  if(operation)return operation;
  if(disposed||!transport||!snapshot.value.supported||!['available','error'].includes(snapshot.value.phase))return Promise.resolve(false);
  failed='download';
  snapshot.value={...snapshot.value,phase:'downloading',downloaded:0,total:null,error:null};
  return run('download_app_update','download',manual);
 }
 function check(manual:boolean):Promise<boolean>{
  if(manual)visible.value=true;
  if(disposed||!transport||preparing.value||installing.value)return Promise.resolve(false);
  if(operation||['downloading','ready','installing'].includes(snapshot.value.phase))return operation??Promise.resolve(false);
  failed='check';snapshot.value={...snapshot.value,phase:'checking',error:null};
  return run('check_app_update','check',manual);
 }
 function checkNow(){return check(true);}
 function configureTimer(){
  if(timer!==null){cancel(timer);timer=null;}
  if(started&&!disposed&&transport&&autoEnabled.value)timer=schedule(()=>{if(autoEnabled.value&&snapshot.value.supported)void check(false);},options.intervalMs??3_600_000);
 }
 function setAutoEnabled(enabled:boolean){
  autoEnabled.value=enabled;try{storage?.setItem(storageKey,String(enabled));}catch{/* Optional preference storage. */}
  configureTimer();
  if(started&&enabled&&!disposed){if(snapshot.value.phase==='available')maybeDownload();else if(snapshot.value.supported)void check(false);}
 }
 async function install():Promise<boolean>{
  if(disposed||!transport||operation||snapshot.value.phase!=='ready'||!snapshot.value.supported||preparing.value||installing.value)return false;
  preparing.value=true;
  const token=epoch,version=snapshot.value.version;
  try{
   const allowed=await options.beforeInstall();
   if(disposed||!allowed||token!==epoch||snapshot.value.phase!=='ready'||snapshot.value.version!==version)return false;
   // Root's main-area inert flag only becomes true after the Save/Discard/Cancel
   // guard has resolved successfully, leaving that guard fully interactive.
   installing.value=true;visible.value=true;
   const result=await run('install_app_update','install',true,{expectedRevision:options.expectedRevision()});
   if(!disposed&&!result)installing.value=false;
   return result;
  }catch(error){if(!disposed){installing.value=false;failure(error,'install',true);}return false;}
  finally{if(!disposed)preparing.value=false;}
 }
 function retry(){
  if(snapshot.value.phase!=='error')return checkNow();
  visible.value=true;
  // Installation failure needs a fresh native check/download, not a UI-side
  // assertion that the previous payload is still installable.
  return failed==='download'?download(true):check(true);
 }
 function dismiss(){if(!installing.value)visible.value=false;}
 async function start():Promise<void>{
  if(started||disposed)return;started=true;
  if(!transport)return;
  const token=++epoch;
  try{
   const stop=await transport.listen(value=>{try{accept(value,true);maybeDownload();}catch(error){failure(error,active??'check',visible.value);}});
   if(disposed){stop();return;}unlisten=stop;
   const serial=eventSerial;
   const current=await transport.invoke('get_app_update_state');
   if(disposed||token!==epoch)return;
   if(serial===eventSerial)accept(current);
   if(autoEnabled.value&&snapshot.value.supported){if(snapshot.value.phase==='available')maybeDownload();else if(snapshot.value.phase!=='ready')await check(false);}
  }catch(error){if(!disposed&&token===epoch)failure(error,'check',false);}
  finally{if(!disposed)configureTimer();}
 }
 function dispose(){
  if(disposed)return;disposed=true;epoch++;if(timer!==null)cancel(timer);timer=null;unlisten?.();unlisten=null;
 }
 return{snapshot,state:snapshot,autoEnabled,installing,preparing,visible,percent,busy,start,dispose,checkNow,download,install,retry,setAutoEnabled,dismiss};
}
export type AppUpdater=ReturnType<typeof createAppUpdateController>;
export function useAppUpdater(options:AppUpdaterOptions):AppUpdater {
 const updater=createAppUpdateController(options);
 onMounted(()=>{void updater.start();});onBeforeUnmount(updater.dispose);
 return updater;
}
