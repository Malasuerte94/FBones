import {test,expect,openNativeEditor} from './fixtures/native-session';
import type {ProjectSummary} from '../../src/domain/project';

test('@native a canceled same-frame animation freeze cannot overwrite a newer geometry lease when its native reply arrives late',async({page,native})=>{
 let p=await native.invoke<ProjectSummary>('create_project',{name:'Own delayed animation freeze lease',discardChanges:true});p=await native.invoke<ProjectSummary>('edit_rig',{expectedRevision:p.revision,edit:{type:'create',parent:p.bones[0]!.id,x:10,y:0,rotation:0,length:45}});const bone=p.editedBone!;
 await openNativeEditor(page);await page.getByTestId('editor-mode-animate').click();await page.locator(`[data-tree-kind="bone"][data-tree-id="${bone}"]`).getByRole('treeitem').click();
 const invoke=native.invoke.bind(native);let releaseFirst!:()=>void,releaseSecond!:()=>void,seen=0;
 const first=new Promise<void>(resolve=>releaseFirst=resolve),second=new Promise<void>(resolve=>releaseSecond=resolve);
 native.invoke=async function<T=unknown>(command:string,args:Record<string,unknown>={}):Promise<T>{const result=await invoke<T>(command,args);if(command==='evaluate_project'){const index=++seen;if(index===1)await first;if(index===2)await second;}return result;};
 const before=(await native.snapshot())!;
 try{
  await page.evaluate(()=>{const w=(document.querySelector('#app') as any).__vue_app__.config.globalProperties.$pinia._s.get('workspace');(window as any).__ownFreezeFirst=w.freezePose().then(()=>false,()=>true);});await expect.poll(()=>seen).toBe(1);
  await page.evaluate(()=>{const w=(document.querySelector('#app') as any).__vue_app__.config.globalProperties.$pinia._s.get('workspace');w.releasePose();(window as any).__ownFreezeSecond=w.freezePose().then(()=>true,()=>false);});await expect.poll(()=>seen).toBe(2);
  releaseFirst();expect(await page.evaluate(()=>(window as any).__ownFreezeFirst)).toBe(true);expect(await page.evaluate(()=>!!(document.querySelector('#app') as any).__vue_app__.config.globalProperties.$pinia._s.get('workspace').frozenPose)).toBe(false);
  releaseSecond();expect(await page.evaluate(()=>(window as any).__ownFreezeSecond)).toBe(true);expect(await page.evaluate(()=>!!(document.querySelector('#app') as any).__vue_app__.config.globalProperties.$pinia._s.get('workspace').frozenPose)).toBe(true);
  await page.evaluate(()=>(document.querySelector('#app') as any).__vue_app__.config.globalProperties.$pinia._s.get('workspace').releasePose());expect((await native.snapshot())!.bones).toEqual(before.bones);expect((await native.snapshot())!.revision).toBe(before.revision);
 }finally{releaseFirst();releaseSecond();native.invoke=invoke;}
});
