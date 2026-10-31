import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createPinia,setActivePinia} from 'pinia';
import {nextTick} from 'vue';
import {activeBoneHover,boneHighlightStyle,claimBoneHover,emptyBoneHover,pruneBoneHover,releaseBoneHover} from '../src/domain/boneHover.ts';
import {useWorkspace} from '../src/stores/workspace.ts';
import {draftSummary} from '../src/domain/project.ts';

test('source and target guarded hover survives stale leaves and restores remaining keyboard focus',()=>{
 let state=emptyBoneHover();
 state=claimBoneHover(state,'tree-focus',1);
 state=claimBoneHover(state,'tree-pointer',1);
 state=claimBoneHover(state,'tree-pointer',2);
 assert.equal(releaseBoneHover(state,'tree-pointer',1),state,'old leave cannot erase enter(B)');
 state=claimBoneHover(state,'weights-pointer',3);
 state=releaseBoneHover(state,'tree-pointer',2);
 assert.deepEqual(activeBoneHover(state),{source:'weights-pointer',id:3});
 state=releaseBoneHover(state,'weights-pointer',3);
 assert.deepEqual(activeBoneHover(state),{source:'tree-focus',id:1});
 state=claimBoneHover(state,'viewport',4);
 assert.equal(claimBoneHover(state,'viewport',4),state,'same active target avoids pointer-frame state churn');
 state=pruneBoneHover(state,new Set([1]));
 assert.deepEqual(activeBoneHover(state),{source:'tree-focus',id:1});
 assert.equal(activeBoneHover(releaseBoneHover(state)),null);
});

test('pinned cyan influence and white hover are distinct; hovering selection retains its cyan fill',()=>{
 const base=0x9b9b9b;
 const pinned=boneHighlightStyle(base,false,true,false),hover=boneHighlightStyle(base,false,false,true);
 assert.equal(pinned.color,0x68d7e7);assert.equal(hover.color,0xffffff);assert.notEqual(pinned.color,hover.color);
 assert.equal(boneHighlightStyle(base,true,false,true).color,pinned.color);
 assert.equal(boneHighlightStyle(base,true,false,true).hovered,true,'render a separate halo instead of replacing selection');
 assert.equal(boneHighlightStyle(base,false,false,false).color,base);
});

const root={id:0,parent:null,name:'root',x:0,y:0,rotation:0,length:0};
const bone=id=>({id,parent:0,name:`bone${id}`,x:id*20,y:0,rotation:0,length:30});
function workspace(){
 globalThis.document={title:''};setActivePinia(createPinia());
 const w=useWorkspace();
 w.project={...draftSummary('Hover fixture'),dirty:false,revision:7,documentId:42,bones:[root,bone(1),bone(2),bone(3)],
  slots:[{id:9,name:'mesh',bone:0,visible:true,imageAvailable:false,region:null,mesh:{weighted:true,bones:[0,1],uvs:[],triangles:[],edges:[],hull:0,vertices:[]}}]};
 w.selectedSlotId=9;w.editMode='weights';w.influence=1;
 return w;
}
test('real workspace hover/focus and bound/unbound clicks leave document, brush and history untouched',async()=>{
 const w=workspace(),project=w.project,serialized=JSON.stringify(w.project);
 w.hoverBone('weights-pointer',2);assert.equal(w.hoveredBoneId,2);
 assert.equal(w.influence,1);assert.equal(w.chooseInfluence(2),false);assert.equal(w.influence,1);
 w.hoverBone('weights-focus',2);w.clearBoneHover('weights-pointer',2);assert.equal(w.hoveredBoneId,2);
 w.hoverBone('tree-pointer',3);w.clearBoneHover('weights-pointer',2);assert.equal(w.hoveredBoneId,3);
 assert.equal(w.chooseInfluence(0),true);assert.equal(w.influence,0);
 w.clearBoneHover();w.hoverBone('viewport',999);assert.equal(w.hoveredBoneId,null);
 await nextTick();assert.equal(w.project,project);assert.equal(JSON.stringify(w.project),serialized);
 assert.equal(w.project.dirty,false);assert.equal(w.project.revision,7);assert.equal(w.project.canUndo,false);
 assert.equal(w.selectedSlotId,9);assert.equal(w.brushMode,'add');
});
test('workspace hover clears removed targets, document replacement, close and Escape',()=>{
 const w=workspace();w.hoverBone('tree-focus',1);w.hoverBone('weights-pointer',2);
 w.project={...w.project,bones:w.project.bones.filter(b=>b.id!==2)};
 assert.equal(w.hoveredBoneId,1,'invalid active claim pruned without resurrecting deleted targets');
 w.project={...w.project,documentId:43};assert.equal(w.hoveredBoneId,null);
 w.hoverBone('viewport',1);w.escapeSelection();assert.equal(w.hoveredBoneId,null);
 w.hoverBone('tree-pointer',1);w.project=null;assert.equal(w.hoveredBoneId,null);
});
