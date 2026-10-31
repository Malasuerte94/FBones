import assert from 'node:assert/strict';
import {test} from 'node:test';
import {build} from 'esbuild';
const {outputFiles}=await build({entryPoints:['src/domain/treeProjection.ts'],bundle:true,write:false,platform:'node',format:'esm'});
const {projectTree,allTreeKinds}=await import('data:text/javascript;base64,'+Buffer.from(outputFiles[0].text).toString('base64'));
const scene={bones:[{id:0,parent:null,name:'root'},{id:4,parent:0,name:'arm'}],slots:[
 {id:8,bone:4,name:'back',attachments:[{id:20,name:'red',type:'region'},{id:21,name:'blue',type:'mesh'}]},
 {id:9,bone:0,name:'front',attachments:[{id:22,name:'outline',type:'clipping'}]},
],constraints:[{id:6,name:'arm IK'}]};
const keys=rows=>rows.map(row=>row.key);
test('category projection separates attachment inventory and respects enabled ancestry',()=>{
 const original=structuredClone(scene),rows=projectTree(scene,allTreeKinds());
 assert.deepEqual(keys(rows),['bone:0','slot:9','attachment:22','bone:4','slot:8','attachment:20','attachment:21','constraint:6']);
 assert.equal(rows.find(row=>row.key==='attachment:21').parent,'slot:8');
 assert.equal(rows.find(row=>row.key==='attachment:21').depth,3);
 assert.deepEqual(scene,original);
 const noSlots=projectTree(scene,{...allTreeKinds(),slot:false});
 assert.equal(noSlots.find(row=>row.key==='attachment:20').parent,'bone:4');
 assert.equal(noSlots.some(row=>row.kind==='slot'),false);
});
test('Bones off flattens slots in front-first draw order without hidden bone ancestors',()=>{
 const rows=projectTree(scene,{bone:false,slot:true,attachment:true,constraint:false},{collapsed:new Set(['bone:0','bone:4'])});
 assert.deepEqual(keys(rows),['slot:9','attachment:22','slot:8','attachment:20','attachment:21']);
 assert.equal(rows.find(row=>row.key==='slot:8').depth,0);
 assert.equal(rows.find(row=>row.key==='attachment:20').depth,1);
 assert.deepEqual(keys(projectTree(scene,{bone:false,slot:false,attachment:true,constraint:false})),['attachment:22','attachment:20','attachment:21']);
});
test('search reveals enabled matching context without changing collapse or selection identities',()=>{
 const collapsed=new Set(['bone:0','slot:8']),filters=allTreeKinds();
 assert.deepEqual(keys(projectTree(scene,filters,{search:' BLUE ',collapsed})),['bone:0','bone:4','slot:8','attachment:21']);
 assert.deepEqual([...collapsed],['bone:0','slot:8']);
 assert.deepEqual(keys(projectTree(scene,filters,{collapsed})),['bone:0','constraint:6']);
 assert.deepEqual(projectTree(scene,{bone:false,slot:false,attachment:false,constraint:false}),[]);
 assert.deepEqual(projectTree(scene,filters,{search:'missing'}),[]);
});
