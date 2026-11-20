import assert from 'node:assert/strict';
import {test} from 'node:test';
import {build} from 'esbuild';
const{outputFiles}=await build({entryPoints:['src/domain/dockLayout.ts'],bundle:true,write:false,platform:'node',format:'esm'});
const{defaultDockLayout,readDockLayout,moveDockPanel,dockPanel,dockPanels}=await import('data:text/javascript;base64,'+Buffer.from(outputFiles[0].text).toString('base64'));
const inventory=l=>l.columns.flatMap(c=>c.panels.map(p=>p.id)).sort();
test('defaults preserve the compact workspace and place the closed Setup Preview below Tree',()=>{
 const layout=defaultDockLayout();assert.equal(layout.columns[0].width,240);assert.deepEqual(layout.columns[2].panels.map(p=>p.id),['tree','preview','properties']);
 assert.equal(dockPanel(layout,'preview').visible,false);
 assert.equal(dockPanel(layout,'ik').visible,false);assert.equal(dockPanel(defaultDockLayout(true),'weights').visible,false);
 assert.deepEqual(inventory(layout),[...dockPanels].sort());
});
test('moving stacks and splits preserves each stable panel once, including invisible ones',()=>{
 const original=defaultDockLayout(),copy=structuredClone(original),stack=moveDockPanel(original,'weights',{column:'scene',before:'properties'});
 assert.deepEqual(stack.columns.find(c=>c.id==='scene').panels.map(p=>p.id),['tree','preview','weights','properties']);assert.deepEqual(original,copy);
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
test('legacy Animate layout puts Curves above the moved Preview and keeps the custom columns',()=>{
 const legacy=moveDockPanel(defaultDockLayout(false,'animate'),'properties',{column:'scene',split:'right'});
 legacy.columns.find(column=>column.id==='split-properties').width=214;
 for(const column of legacy.columns)column.panels=column.panels.filter(panel=>panel.id!=='curves'&&panel.id!=='preview');
 const migrated=readDockLayout(JSON.stringify(legacy),false,'animate');
 const preview=migrated.columns.find(column=>column.id==='split-properties');
 assert.equal(preview.width,214);
 assert.deepEqual(preview.panels.map(panel=>panel.id),['curves','properties']);
 assert.equal(dockPanel(migrated,'curves').visible,false);
 assert.equal(dockPanel(migrated,'preview').visible,false);
 assert.equal(dockPanel(migrated,'mesh').visible,false);
 assert.deepEqual(migrated.columns.map(column=>column.id),legacy.columns.map(column=>column.id));
});
test('legacy Setup stores gain Preview by Tree and retain independently restored placements',()=>{
 const legacy=defaultDockLayout(false,'setup');
 legacy.columns.find(column=>column.id==='scene').panels=legacy.columns[2].panels.filter(panel=>panel.id!=='preview');
 const moved=moveDockPanel(legacy,'tree',{column:'scene',split:'left'});
 const restored=readDockLayout(JSON.stringify(moved),false,'setup');
 assert.deepEqual(restored.columns.find(column=>column.id==='split-tree').panels.map(panel=>panel.id),['tree','preview']);
 assert.equal(dockPanel(restored,'preview').visible,false);
 const custom=moveDockPanel(restored,'preview',{column:'scene',split:'right'});
 const panel=dockPanel(custom,'preview');panel.visible=true;panel.height=.52;
 const stored=JSON.stringify(custom);
 assert.deepEqual(readDockLayout(stored,false,'setup'),custom);
 const animate=readDockLayout(stored,false,'animate');
 assert.equal(dockPanel(animate,'preview').visible,false);
 assert.equal(dockPanel(animate,'properties').visible,true);
});
