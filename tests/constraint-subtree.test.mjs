import {test} from 'node:test';
import assert from 'node:assert/strict';
import {recompute,setWorld,affine,compose,identity} from '../src/domain/solve/math.ts';
import {evaluate,PhysicsState} from '../src/domain/solve/index.ts';
const pose=(x,y,rotation=0)=>({x,y,rotation,scaleX:1.1,scaleY:.9,shearX:7,shearY:-13});
// Siblings and a separate root are deliberately interleaved: descendants are
// not necessarily a contiguous range in the serialized parent-first order.
function fixture(){
 const parents=[null,0,0,1,null,2,3,4],bones=parents.map((p,i)=>({id:i+70,parent:p===null?null:p+70,name:`bone${i}`,length:12,x:i*2,y:i,rotation:i*3}));
 const children=bones.map(()=>[]);parents.forEach((p,i)=>{if(p!==null)children[p].push(i);});
 const frame={bones:bones.map((b,i)=>({id:b.id,authored:pose(b.x,b.y,b.rotation),applied:pose(b.x,b.y,b.rotation),world:{...identity}}))};
 const scene={bones,parents,children,constraints:[],indices:new Map(bones.map((b,i)=>[b.id,i]))};
 for(let i=0;i<bones.length;i++)frame.bones[i].world=compose(parents[i]===null?identity:frame.bones[parents[i]].world,affine(frame.bones[i].applied));
 return{scene,frame};
}
function fullReference(scene,frame){for(let i=0;i<frame.bones.length;i++){const p=scene.parents[i];frame.bones[i].world=compose(p===null?identity:frame.bones[p].world,affine(frame.bones[i].applied));}}
test('constraint propagation matches full parent-first recomputation across interleaved subtrees and roots',()=>{
 const {scene,frame}=fixture(),expected=structuredClone(frame);
 for(let n=0;n<96;n++){
  const root=n%frame.bones.length,changed=pose(n*.31,-n*.7,n*3.17);frame.bones[root].applied=changed;expected.bones[root].applied={...changed};
  const prior=frame.bones.map(b=>b.world),affected=new Set([root]);for(let i=0;i<scene.parents.length;i++)if(affected.has(scene.parents[i]))affected.add(i);
  recompute(scene,frame,root);fullReference(scene,expected);assert.deepEqual(frame,expected);
  for(let i=0;i<prior.length;i++)if(!affected.has(i))assert.equal(frame.bones[i].world,prior[i],'unrelated branch must not allocate another matrix');
 }
});
test('world-space constraint propagates to descendants and retains sibling and other-root matrices',()=>{
 const {scene,frame}=fixture(),prior=frame.bones.map(b=>b.world);
 setWorld(scene,frame,1,{x:12.5,y:-29,a:1,b:.3,c:-.1,d:.8});
 const expected=structuredClone(frame);fullReference(scene,expected);assert.deepEqual(frame,expected);
 for(const index of[0,2,4,5,7])assert.equal(frame.bones[index].world,prior[index]);
 for(const index of[1,3,6])assert.notEqual(frame.bones[index].world,prior[index]);
});
test('subtree propagation still rejects nonfinite descendant results and evaluator validates untouched branches',()=>{
 const {scene,frame}=fixture();frame.bones[6].applied.x=Infinity;assert.throws(()=>recompute(scene,frame,1),/NonFinite/);
 const state=new PhysicsState(),clean=state.clone();
 assert.throws(()=>evaluate({...scene,bones:scene.bones.map((b,i)=>i===4?{...b,x:Infinity}:b)},null,state,{type:'none'}),/NonFinite/);assert.deepEqual(state,clean);
});
