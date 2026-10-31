import {test,expect,openNativeEditor} from './fixtures/native-session';
import type {ProjectSummary} from '../../src/domain/project';
import type {useWorkspace} from '../../src/stores/workspace';
type StoreElement=Element&{__vue_app__:{config:{globalProperties:{$pinia:{_s:Map<string,ReturnType<typeof useWorkspace>>}}}}};

test('@native an old animation epoch cannot author even a transient bone draft after same-frame Simulate or Rebuild changes',async({page,native})=>{
 let p=await native.invoke<ProjectSummary>('create_project',{name:'Own animated lease intent',discardChanges:true});const root=p.bones[0]!.id;
 p=await native.invoke<ProjectSummary>('edit_rig',{expectedRevision:p.revision,edit:{type:'create',parent:root,x:20,y:0,rotation:0,length:30}});const child=p.editedBone!;
 p=await native.invoke<ProjectSummary>('edit_rig',{expectedRevision:p.revision,edit:{type:'addConstraint',constraint:{type:'physics',name:'Own spring',bone:child,x:1,y:1,rotate:null,shearX:0,scaleX:0,step:1/60,inertia:1,strength:100,damping:.85,mass:1,wind:0,gravity:0,mix:1,limit:5000,globals:{inertia:false,strength:false,damping:false,mass:false,wind:false,gravity:false,mix:false}}}});
 const constraint=p.constraints![0]!.id;await openNativeEditor(page);await page.getByTestId('editor-mode-animate').click();await page.getByTestId('timeline-auto-key').click();await page.locator(`[data-tree-kind="constraint"][data-tree-id="${constraint}"]`).getByRole('treeitem').click();
 const freeze=()=>page.evaluate(async()=>{const w=(document.querySelector('#app')as StoreElement).__vue_app__.config.globalProperties.$pinia._s.get('workspace')!;const snapshot=await w.freezePose();if(!snapshot)throw Error('Expected an animation freeze');return snapshot.poseEpoch;});
 const draft=()=>page.evaluate(()=>{const w=(document.querySelector('#app')as StoreElement).__vue_app__.config.globalProperties.$pinia._s.get('workspace')!;return{bones:w.animationDraft,constraints:[...w.constraintDraft],deform:[...w.deformDraft],frame:w.animationFrame};});
 const attempt=(epoch:number)=>page.evaluate(async({epoch,child})=>{const w=(document.querySelector('#app')as StoreElement).__vue_app__.config.globalProperties.$pinia._s.get('workspace')!;return await w.editRig({type:'move',id:child,x:25,y:1},undefined,epoch);},{epoch,child});
 const before=(await native.snapshot())!,old=await freeze();await page.getByTestId('animation-physics-simulate').uncheck();const stopped=await draft(),start=native.calls.length;
 expect(await attempt(old)).toBe(false);expect(await draft()).toEqual(stopped);expect(await native.snapshot()).toEqual(before);expect(native.calls.slice(start).filter(call=>call.command==='edit_rig')).toHaveLength(0);
 await page.getByTestId('animation-physics-simulate').check();const rebuiltEpoch=await freeze();await page.getByTestId('animation-physics-reset').click();const rebuilt=await draft(),next=native.calls.length;
 expect(await attempt(rebuiltEpoch)).toBe(false);expect(await draft()).toEqual(rebuilt);expect(await native.snapshot()).toEqual(before);expect(native.calls.slice(next).filter(call=>call.command==='edit_rig')).toHaveLength(0);
 const current=await freeze();expect(await attempt(current)).toBe(true);expect((await draft()).bones).not.toBeNull();expect(await native.snapshot()).toEqual(before);
});
