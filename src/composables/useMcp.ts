import {computed,nextTick,onBeforeUnmount,onMounted,ref,shallowRef} from 'vue';
import {desktop,invokeNative} from '../services/bridge.ts';

export interface McpStatus {enabled:boolean;url:string|null;token:string|null}
export interface McpOptions {
 beforeStart:()=>Promise<boolean>;
 beforeUnlock?:()=>Promise<void>;
 invoke?:(command:string)=>Promise<McpStatus>;
 copy?:(value:string)=>Promise<void>;
 setReady?:(ready:boolean)=>Promise<void>;
}
export function createMcpController(options:McpOptions){
 const invoke=options.invoke??(desktop?(command:string)=>invokeNative<McpStatus>(command):null);
 const setReady=options.setReady??(desktop?(ready:boolean)=>invokeNative<void>('mcp_set_ready',{ready}):null);
 const state=shallowRef<McpStatus>({enabled:false,url:null,token:null});
 const visible=ref(false),busy=ref(false),error=ref(''),copied=ref(false);
 const supported=invoke!==null;
 let disposed=false;
 const config=computed(()=>state.value.url&&state.value.token?JSON.stringify({mcpServers:{fbones:{url:state.value.url,headers:{Authorization:`Bearer ${state.value.token}`}}}},null,2):'');
 async function run(command:string){
  if(!invoke||busy.value||disposed)return false;
  busy.value=true;error.value='';copied.value=false;
  try{
   if(command==='mcp_start'&&!await options.beforeStart())return false;
   const value=await invoke(command);
   if(!value||typeof value.enabled!=='boolean'||value.enabled&&(typeof value.url!=='string'||typeof value.token!=='string'))throw Error('Invalid MCP server status.');
   if(command==='mcp_stop'&&options.beforeUnlock)await options.beforeUnlock();
   if(!disposed){state.value=value;await nextTick();if(!disposed&&setReady)await setReady(value.enabled);}
   return true;
  }catch(reason){if(!disposed)error.value=reason instanceof Error?reason.message:String(reason);return false;}
  finally{busy.value=false;}
 }
 async function copy(){
  if(!config.value)return;
  try{await(options.copy??(value=>navigator.clipboard.writeText(value)))(config.value);copied.value=true;}
  catch(reason){error.value=reason instanceof Error?reason.message:String(reason);}
 }
 function dispose(){disposed=true;if(setReady)void setReady(false).catch(()=>{});}
 return{state,visible,busy,error,copied,supported,config,refresh:()=>run('mcp_status'),start:()=>run('mcp_start'),stop:()=>run('mcp_stop'),reset:()=>state.value.enabled?Promise.resolve(false):run('mcp_reset'),copy,dispose};
}
export type McpController=ReturnType<typeof createMcpController>;
export function useMcp(options:McpOptions){const controller=createMcpController(options);onMounted(()=>{void controller.refresh();});onBeforeUnmount(controller.dispose);return controller;}
