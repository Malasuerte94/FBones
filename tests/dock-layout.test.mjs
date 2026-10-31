import assert from 'node:assert/strict';
import {test} from 'node:test';
import {build} from 'esbuild';
const{outputFiles}=await build({entryPoints:['src/domain/dockLayout.ts'],bundle:true,write:false,platform:'node',format:'esm'});
const{defaultDockLayout,readDockLayout,moveDockPanel,dockPanel,dockPanels}=await import('data:text/javascript;base64,'+Buffer.from(outputFiles[0].text).toString('base64'));
const inventory=l=>l.columns.flatMap(c=>c.panels.map(p=>p.id)).sort();
test('defaults preserve the compact three-column workspace and independent hidden constraint views',()=>{
 const layout=defaultDockLayout();assert.equal(layout.columns[0].width,240);assert.deepEqual(layout.columns[2].panels.map(p=>p.id),['tree','properties']);
 assert.equal(dockPanel(layout,'ik').visible,false);assert.equal(dockPanel(defaultDockLayout(true),'weights').visible,false);
 assert.deepEqual(inventory(layout),[...dockPanels].sort());
});
test('moving stacks and splits preserves each stable panel once, including invisible ones',()=>{
 const original=defaultDockLayout(),copy=structuredClone(original),stack=moveDockPanel(original,'weights',{column:'scene',before:'properties'});
 assert.deepEqual(stack.columns.find(c=>c.id==='scene').panels.map(p=>p.id),['tree','weights','properties']);assert.deepEqual(original,copy);
 const split=moveDockPanel(stack,'properties',{column:'scene',split:'left'});
 assert.equal(split.columns[split.columns.findIndex(c=>c.id==='scene')-1].panels[0].id,'properties');assert.deepEqual(inventory(split),inventory(original));
 assert.equal(dockPanel(split,'ik').visible,false);
});
test('self-split and empty-column cleanup retain a valid persistent layout',()=>{
 const original=defaultDockLayout(),next=moveDockPanel(original,'tree',{column:'scene',split:'right'});
 assert.deepEqual(readDockLayout(JSON.stringify(next)),next);assert.deepEqual(inventory(next),inventory(original));
 assert.equal(moveDockPanel(original,'tree',{column:'scene',before:'tree'}),original);
 assert.equal(moveDockPanel(original,'tree',{column:'missing'}),original);
});
test('untrusted storage rejects missing/duplicate panels and wrong versions; bounds finite dimensions',()=>{
 for(const value of [null,'{}','not json',JSON.stringify({version:2,columns:[]})])assert.deepEqual(readDockLayout(value),defaultDockLayout());
 const invalid=defaultDockLayout();invalid.columns[0].panels.push({...dockPanel(invalid,'tree')});assert.deepEqual(readDockLayout(JSON.stringify(invalid)),defaultDockLayout());
 const out=defaultDockLayout();out.columns[0].width=99999;out.columns[0].panels[0].height=-8;const read=readDockLayout(JSON.stringify(out));assert.equal(read.columns[0].width,520);assert.equal(dockPanel(read,'weights').height,.15);
});
