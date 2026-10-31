import {test as browserTest,expect} from './browser';
import type {APIRequestContext,Page} from '@playwright/test';
import type {ProjectSummary} from '../../../src/domain/project';

type SessionIdentity={id:string;token:string};
/** Transport only: all project, history, geometry and filesystem results come
 * from the production Rust Session in a fresh own headless test process. */
export class NativeSession{
  readonly calls:Array<{command:string;args:Record<string,unknown>;result?:unknown;error?:{code:string;message:string}}>=[];
  private constructor(private request:APIRequestContext,readonly identity:SessionIdentity){}
  static async create(request:APIRequestContext){const response=await request.post('/__e2e/session',{data:{}});expect(response.status()).toBe(201);return new NativeSession(request,await response.json() as SessionIdentity);}
  get headers(){return{'x-fbones-session':this.identity.id,'x-fbones-token':this.identity.token};}
  async invoke<T=unknown>(command:string,args:Record<string,unknown>={}):Promise<T>{
    const call:{command:string;args:Record<string,unknown>;result?:unknown;error?:{code:string;message:string}}={command,args:structuredClone(args)};this.calls.push(call);
    const response=await this.request.post('/__e2e/rpc',{headers:this.headers,data:{command,args}});expect(response.ok(),`HTTP native transport for ${command}`).toBe(true);
    const body=await response.json() as {result?:T;error?:{code:string;message:string}};
    if(body.error){call.error=body.error;throw Object.assign(new Error(body.error.message),{code:body.error.code});}call.result=body.result;return body.result as T;
  }
  snapshot(){return this.invoke<ProjectSummary|null>('get_project');}
  queueDialog(kind:'folder'|'save'|'open',path:string|null){return this.invoke('e2e_dialog',{kind,path});}
  async close(){const response=await this.request.delete('/__e2e/session',{headers:this.headers});expect(response.ok()).toBe(true);expect(await response.json()).toEqual({closed:true});}
}

export async function attachNativeSession(page:Page,session:NativeSession){
    // Production connect-src intentionally excludes HTTP. Node, not page fetch,
    // transports calls so the exact product CSP remains unchanged.
    await page.exposeBinding('__fbonesE2EInvoke',async(_source,command:string,args:Record<string,unknown>={})=>command==='frontend_ready'?null:session.invoke(command,args));
    await page.addInitScript(()=>{
      const own=globalThis as typeof globalThis&{__fbonesE2EInvoke(command:string,args?:Record<string,unknown>):Promise<unknown>;__TAURI__?:unknown};
      own.__TAURI__={core:{invoke:(command:string,args?:Record<string,unknown>)=>own.__fbonesE2EInvoke(command,args)},event:{listen:async()=>()=>{}},window:{getCurrentWindow:()=>({setTitle:async(title:string)=>{document.title=title;},onCloseRequested:async()=>()=>{},destroy:async()=>{}})}};
    });
}

export const test=browserTest.extend<{native:NativeSession}>({
  native:async({page,request},use)=>{
    const session=await NativeSession.create(request);
    const info=await session.invoke<{transport:string;sceneEditing:boolean}>('e2e_info');expect(info.transport).toBe('native-session-jsonl');expect(info.sceneEditing).toBe(true);
    await attachNativeSession(page,session);
    try{await use(session);}finally{await session.close();}
  },
});
export{expect};
export async function openNativeEditor(page:Page){
  const response=await page.goto('/');expect(response?.ok()).toBe(true);
  await expect(page.getByTestId('viewport').locator('canvas')).toBeVisible();await expect(page.getByText('Opening workspace…',{exact:true})).toHaveCount(0);await expect(page.getByText('The viewport could not start.',{exact:true})).toHaveCount(0);
}
export async function newNativeProject(page:Page,name:string){
  await page.getByRole('button',{name:'New project',exact:true}).first().click();const dialog=page.getByRole('dialog',{name:'Start a new project'});await dialog.getByRole('textbox',{name:'Project name',exact:true}).fill(name);await dialog.getByRole('button',{name:'Create project',exact:true}).click();await expect(dialog).toHaveCount(0);await expect(page.getByRole('heading',{name,exact:true})).toBeVisible();
}
