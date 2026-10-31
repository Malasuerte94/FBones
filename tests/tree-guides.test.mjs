import assert from 'node:assert/strict';
import {test} from 'node:test';
import {build} from 'esbuild';
const {outputFiles}=await build({entryPoints:['src/domain/treeGuides.ts','src/domain/treeProjection.ts'],bundle:true,write:false,platform:'node',format:'esm',outdir:'unused'});
const load=async name=>import('data:text/javascript;base64,'+Buffer.from(outputFiles.find(f=>f.path.endsWith(name+'.js')).text).toString('base64'));
const {treeGuides}=await load('treeGuides'),{projectTree,allTreeKinds}=await load('treeProjection');
const scene={bones:[{id:10,parent:null,name:'root'},{id:30,parent:10,name:'arm'},{id:90,parent:10,name:'leg'}],slots:[{id:40,bone:30,name:'parts',attachments:[{id:51,name:'first'},{id:52,name:'last'}]}],constraints:[{id:77,name:'IK'},{id:88,name:'Physics'}]};
function objects(options={},filters=allTreeKinds()){return projectTree(scene,filters,options).filter(r=>r.kind!=='constraint');}
test('visible ancestor branches continue through descendants and stop at last sibling',()=>{
 const rows=objects(),before=structuredClone(rows),g=treeGuides(rows);
 assert.deepEqual(g.get('bone:10'),{depth:0,continuations:[],elbow:null,last:true});
 assert.deepEqual(g.get('bone:30'),{depth:1,continuations:[],elbow:0,last:false});
 assert.deepEqual(g.get('attachment:51'),{depth:3,continuations:[0],elbow:2,last:false});
 assert.deepEqual(g.get('attachment:52'),{depth:3,continuations:[0],elbow:2,last:true});
 assert.deepEqual(g.get('bone:90'),{depth:1,continuations:[],elbow:0,last:true});
 assert.deepEqual(rows,before);
});
test('search/collapse recompute last visible siblings rather than authored depth',()=>{
 const g=treeGuides(objects({search:'last'}));
 assert.deepEqual(g.get('attachment:52'),{depth:3,continuations:[],elbow:2,last:true});
 const collapsed=treeGuides(objects({collapsed:new Set(['bone:30'])}));
 assert.equal(collapsed.has('slot:40'),false);assert.equal(collapsed.get('bone:30').last,false);
});
test('filtered intermediate nodes use projected parent keys; flat attachments have no fabricated lines',()=>{
 const noSlots=treeGuides(objects({},{...allTreeKinds(),slot:false}));
 assert.deepEqual(noSlots.get('attachment:52'),{depth:2,continuations:[0],elbow:1,last:true});
 const flat=treeGuides(objects({},{bone:false,slot:false,attachment:true,constraint:false}));
 assert.equal(flat.get('attachment:51').elbow,null);assert.equal(flat.get('attachment:52').depth,0);
});
test('constraint group has an independent header and never connects into object hierarchy',()=>{
 const rows=projectTree(scene,allTreeKinds()).filter(r=>r.kind==='constraint'),g=treeGuides(rows,'group:constraints');
 assert.deepEqual(g.get('constraint:77'),{depth:1,continuations:[],elbow:0,last:false});
 assert.deepEqual(g.get('constraint:88'),{depth:1,continuations:[],elbow:0,last:true});
 assert.equal(g.has('bone:90'),false);
});
test('unknown parent is an unconnected root, including stable IDs unrelated to indices',()=>{
 assert.deepEqual(treeGuides([{key:'attachment:999',parent:'absent:123'}]).get('attachment:999'),{depth:0,continuations:[],elbow:null,last:true});
});
