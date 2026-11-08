import {test,expect,openNativeEditor} from './fixtures/native-session';
import type {Page} from '@playwright/test';
import type {ProjectSummary} from '../../src/domain/project';
import type {AppUpdateSnapshot} from '../../src/composables/useAppUpdater';

type OwnUpdaterTest={calls:Array<{command:string;args?:Record<string,unknown>}>;emit:(patch:Partial<AppUpdateSnapshot>)=>void;complete:()=>void;setOffline:(value:boolean)=>void};
type UpdateWindow=typeof globalThis&{__fbonesUpdateTest:OwnUpdaterTest};
async function updaterTransport(page:Page,offline=false){
 await page.addInitScript(({offline})=>{
  type Bridge={core:{invoke:(command:string,args?:Record<string,unknown>)=>Promise<unknown>};event:{listen:(name:string,handler:(event:{payload:AppUpdateSnapshot})=>void)=>Promise<()=>void>};[key:string]:unknown};
  const own=globalThis as typeof globalThis&{__TAURI__?:Bridge;__TAURI_INTERNALS__?:unknown;__fbonesUpdateTest:OwnUpdaterTest};
  // This marker activates the updater only in this dedicated transport test.
  // Project commands still pass unchanged to the isolated real Rust Session.
  own.__TAURI_INTERNALS__={};
  if(localStorage.getItem('fbones.app-updates.auto.v1')===null)localStorage.setItem('fbones.app-updates.auto.v1','true');
  const listeners=new Set<(event:{payload:AppUpdateSnapshot})=>void>();
  const calls:OwnUpdaterTest['calls']=[];
  let current:AppUpdateSnapshot={phase:'idle',currentVersion:'0.9.5',version:null,downloaded:0,total:null,error:null,supported:true};
  let offlineNow=offline,completeDownload:((snapshot:AppUpdateSnapshot)=>void)|null=null;
  const emit=(patch:Partial<AppUpdateSnapshot>)=>{current={...current,...patch};for(const listener of listeners)listener({payload:{...current}});};
  own.__fbonesUpdateTest={calls,emit,complete(){emit({phase:'ready',version:'0.9.6',downloaded:4096,total:4096,error:null});completeDownload?.({...current});completeDownload=null;},setOffline(value){offlineNow=value;}};
  let installed:Bridge|undefined;
  function wrap(value:Bridge|undefined):Bridge|undefined{
   if(!value)return value;
   return{...value,core:{...value.core,async invoke(command,args){
    if(!['get_app_update_state','check_app_update','download_app_update','install_app_update'].includes(command))return value.core.invoke(command,args);
    calls.push({command,args});
    if(command==='get_app_update_state')return{...current};
    if(command==='check_app_update'){emit(offlineNow?{phase:'error',error:'Own offline check',version:null}:{phase:'available',version:'0.9.6',error:null});return{...current};}
    if(command==='download_app_update'){emit({phase:'downloading',downloaded:0,total:null,error:null});return new Promise<AppUpdateSnapshot>(resolve=>{completeDownload=resolve;});}
    emit({phase:'installing',error:null});return{...current};
   }},event:{...value.event,async listen(name,handler){if(name!=='app-update-state')return value.event.listen(name,handler);listeners.add(handler);return()=>listeners.delete(handler);}}};
  }
  // Playwright init-script order is unspecified. Handle an already installed
  // Session bridge and any later assignment from its existing fixture script.
  const existing=own.__TAURI__;
  Object.defineProperty(own,'__TAURI__',{configurable:true,get:()=>installed,set:(value:Bridge)=>{installed=wrap(value);}});
  if(existing)own.__TAURI__=existing;
 },{offline});
}
async function calls(page:Page){return page.evaluate(()=>(globalThis as UpdateWindow).__fbonesUpdateTest.calls);}
async function complete(page:Page){await page.evaluate(()=>(globalThis as UpdateWindow).__fbonesUpdateTest.complete());await expect(page.getByTestId('app-updater')).toHaveAttribute('data-phase','ready');}
async function openUpdates(page:Page){const toggle=page.getByTestId('app-updates-toggle');if(await toggle.getAttribute('aria-expanded')!=='true')await toggle.click();return page.getByTestId('app-update-panel');}

test('@native updater shows optional-byte download progress, automatic preference persists and installation stays explicit',async({page,native},info)=>{
 await native.invoke<ProjectSummary>('create_project',{name:'Own update progress',discardChanges:true});await updaterTransport(page);await openNativeEditor(page);
 await expect(page.getByTestId('app-updater')).toHaveAttribute('data-phase','downloading');await expect(page.getByTestId('app-update-panel')).toHaveCount(0);
 let panel=await openUpdates(page);await expect(panel.getByTestId('app-update-status')).toHaveText('Downloading update…');await expect(panel.getByTestId('app-update-progress')).not.toHaveAttribute('value');
 await page.evaluate(()=>(globalThis as UpdateWindow).__fbonesUpdateTest.emit({phase:'downloading',downloaded:2048,total:4096}));await expect(panel.getByTestId('app-update-progress')).toHaveAttribute('value','50');await expect(panel).toContainText('2 KiB / 4 KiB');
 await panel.getByTestId('app-update-auto').uncheck();expect(await page.evaluate(()=>localStorage.getItem('fbones.app-updates.auto.v1'))).toBe('false');
 await complete(page);await expect(panel.getByTestId('app-update-install')).toBeEnabled();expect((await calls(page)).filter(c=>c.command==='install_app_update')).toHaveLength(0);await page.screenshot({path:info.outputPath('update-ready-explicit-install.png')});
 await page.reload();await expect(page.getByTestId('app-updater')).toHaveAttribute('data-phase','idle');expect((await calls(page)).map(c=>c.command)).toEqual(['get_app_update_state']);
 panel=await openUpdates(page);await expect(panel.getByTestId('app-update-auto')).not.toBeChecked();await panel.getByTestId('app-update-check').click();await expect(page.getByTestId('app-updater')).toHaveAttribute('data-phase','available');expect((await calls(page)).filter(c=>c.command==='download_app_update')).toHaveLength(0);
});

test('@native updater keeps offline startup quiet and exposes manual error, retry and download without blocking the editor',async({page,native})=>{
 const before=await native.invoke<ProjectSummary>('create_project',{name:'Own offline updater',discardChanges:true});await updaterTransport(page,true);await openNativeEditor(page);
 await expect(page.getByTestId('app-updater')).toHaveAttribute('data-phase','error');await expect(page.getByTestId('app-update-panel')).toHaveCount(0);expect(await page.locator('main').evaluate(e=>(e as HTMLElement).inert)).toBe(false);
 const panel=await openUpdates(page);await expect(panel.getByTestId('app-update-error')).toHaveText('Own offline check');await panel.getByTestId('app-update-auto').uncheck();
 await page.evaluate(()=>(globalThis as UpdateWindow).__fbonesUpdateTest.setOffline(false));await panel.getByTestId('app-update-retry').click();await expect(page.getByTestId('app-updater')).toHaveAttribute('data-phase','available');
 await panel.getByTestId('app-update-download').click();await expect(page.getByTestId('app-updater')).toHaveAttribute('data-phase','downloading');await complete(page);expect(await native.snapshot()).toEqual(before);expect((await calls(page)).filter(c=>c.command==='install_app_update')).toHaveLength(0);
});

test('@native actual dirty Session keeps update Save/Cancel modal interactive, canceled Save preserves work and confirmed Save precedes inert install',async({page,native},info)=>{
 const before=await native.invoke<ProjectSummary>('create_project',{name:'Own guarded update',discardChanges:true});await updaterTransport(page);await openNativeEditor(page);await expect(page.getByTestId('app-updater')).toHaveAttribute('data-phase','downloading');await complete(page);
 let panel=await openUpdates(page);await panel.getByTestId('app-update-install').click();const dialog=page.getByRole('dialog',{name:'Leave this project?',exact:true});
 await expect(dialog).toBeVisible();await expect(dialog.getByRole('button',{name:'Cancel',exact:true})).toBeEnabled();await expect(dialog.getByRole('button',{name:'Save and continue',exact:true})).toBeEnabled();expect(await page.locator('main').evaluate(e=>(e as HTMLElement).inert)).toBe(false);expect((await calls(page)).filter(c=>c.command==='install_app_update')).toHaveLength(0);
 await page.screenshot({path:info.outputPath('update-dirty-guard-interactive.png')});await dialog.getByRole('button',{name:'Cancel',exact:true}).click();await expect(dialog).toHaveCount(0);expect(await native.snapshot()).toEqual(before);
 panel=await openUpdates(page);await panel.getByTestId('app-update-install').click();await expect(dialog).toBeVisible();await native.queueDialog('save',null);await dialog.getByRole('button',{name:'Save and continue',exact:true}).click();
 await expect.poll(()=>native.calls.filter(c=>c.command==='save_project').length).toBe(1);await expect(dialog).toBeVisible();expect(await native.snapshot()).toEqual(before);expect(await page.locator('main').evaluate(e=>(e as HTMLElement).inert)).toBe(false);expect((await calls(page)).filter(c=>c.command==='install_app_update')).toHaveLength(0);
 await native.queueDialog('save','own-guarded-update.fbones');await dialog.getByRole('button',{name:'Save and continue',exact:true}).click();await expect(dialog).toHaveCount(0);await expect(page.getByTestId('app-updater')).toHaveAttribute('data-phase','installing');await expect.poll(()=>page.locator('main').evaluate(e=>(e as HTMLElement).inert)).toBe(true);
 const saved=(await native.snapshot())!;expect(saved.dirty).toBe(false);expect(saved.bones).toEqual(before.bones);expect((await calls(page)).filter(c=>c.command==='install_app_update')).toEqual([{command:'install_app_update',args:{expectedRevision:saved.revision}}]);
});
