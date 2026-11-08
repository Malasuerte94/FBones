import {test,expect} from './fixtures/browser';
import {draftSummary,type ProjectSummary} from '../../src/domain/project';

// Frontend transport fixture only. This tests real DOM/status controls, not Rust
// decoding, Windows dialogs, binary copying or appearance of any private mascot.
test('delayed Open shows feedback then an honest inspection explanation, and cancelled copy retains that state',async({page})=>{
 const inspected:ProjectSummary={...draftSummary('Own unsupported source'),dirty:false,inspectionOnly:true,canSave:false,canCopy:true,boneCount:null,bones:[],slots:[],documentId:1,logicalDocumentId:1,revision:1,animations:[],constraints:[]};
 await page.addInitScript(()=>{
  const own=globalThis as typeof globalThis&{__TAURI__?:unknown;__openingReply?:(value:unknown)=>void;__openFeedbackCalls:{command:string;args:unknown}[]};
  own.__openFeedbackCalls=[];
  own.__TAURI__={core:{invoke:async(command:string,args:unknown)=>{own.__openFeedbackCalls.push({command,args});if(command==='get_project'||command==='frontend_ready'||command==='save_project')return null;if(command==='open_project')return new Promise(resolve=>{own.__openingReply=resolve;});throw Error('Unexpected transport fixture command '+command);}},event:{listen:async()=>()=>{}},window:{getCurrentWindow:()=>({setTitle:async(title:string)=>{document.title=title;},onCloseRequested:async()=>()=>{},destroy:async()=>{}})}};
 });
 await page.goto('/');await expect(page.getByTestId('viewport').locator('canvas')).toBeVisible();
 await page.getByRole('button',{name:'Open project',exact:true}).first().click();
 await expect(page.getByTestId('project-opening')).toBeVisible();await expect(page.getByTestId('project-opening')).toContainText('Opening project…');await expect(page.locator('main')).toHaveAttribute('aria-busy','true');
 const live=page.getByTestId('project-opening-announcement');await expect(live).toHaveAttribute('role','status');expect(await live.evaluate(node=>node.closest('[aria-busy="true"]')===null)).toBe(true);
 await page.evaluate(reply=>{(globalThis as typeof globalThis&{__openingReply?:(value:unknown)=>void}).__openingReply!(reply);},inspected);
 await expect(page.getByTestId('project-opening')).toHaveCount(0);const notice=page.getByTestId('project-inspection-notice');await expect(notice).toBeVisible();await expect(notice).toContainText('cannot display or edit yet');await expect(notice).toContainText('original file is preserved');await expect(page.getByTestId('editor-mode-animate')).toBeDisabled();
 await notice.getByRole('button',{name:'Save a copy',exact:true}).click();
 await expect.poll(()=>page.evaluate(()=>(globalThis as typeof globalThis&{__openFeedbackCalls:{command:string;args:unknown}[]}).__openFeedbackCalls.filter(call=>call.command==='save_project'))).toEqual([{command:'save_project',args:{saveAs:true}}]);
 await expect(notice).toBeVisible();await expect(page.locator('main')).toHaveAttribute('aria-busy','false');expect(await page.evaluate(()=>(globalThis as typeof globalThis&{__openFeedbackCalls:{command:string}[]}).__openFeedbackCalls.some(call=>call.command==='edit_rig'))).toBe(false);
 await notice.getByRole('button',{name:'Open project',exact:true}).click();await expect(page.getByTestId('project-opening')).toBeVisible();await expect(notice).toHaveCount(0);await page.evaluate(()=>{(globalThis as typeof globalThis&{__openingReply?:(value:unknown)=>void}).__openingReply!(null);});await expect(notice).toBeVisible();await expect(page.getByTestId('project-opening')).toHaveCount(0);
});
