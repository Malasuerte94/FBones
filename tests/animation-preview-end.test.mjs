import {test} from 'node:test';
import assert from 'node:assert/strict';
import {animationPreviewEnd,MAX_ANIMATION_PREVIEW_FRAME} from '../src/domain/animationPlayback.ts';
import {eventsBetween} from '../src/domain/animationEvents.ts';

const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const key=(frame,mode=2,index=0,delay=.125)=>({id:1,frame,mode,index,delay});
const track=(keys,attachment=10,slot=7)=>({attachment,slot,keys});
const clip=(duration=0,sequenceTracks=[])=>({id:1,name:'Own preview extent',duration,tracks:[],sequenceTracks});
function slot(count=3,id=7,attachment=10){
 const region={name:'Own image',image:'own',imagePath:'',x:0,y:0,rotation:0,scaleX:1,scaleY:1,width:24,height:16};
 return{id,name:'Own slot',bone:0,visible:false,region:null,imageAvailable:false,activeAttachmentId:null,attachments:[{id:attachment,slot:id,name:'Own image',type:'region',region,mesh:null,clipping:null,imageAvailable:false,sequence:{start:7,count,digits:1,setupIndex:0},sequenceAvailableFrames:[]}]};
}

test('empty and ordinary authored extents remain unchanged without a running Sequence',()=>{
 assert.deepEqual(animationPreviewEnd(null,[],24),{end:0,extended:false,exceedsBudget:false});
 assert.deepEqual(animationPreviewEnd(clip(),[],24),{end:0,extended:false,exceedsBudget:false});
 assert.deepEqual(animationPreviewEnd(clip(30),[],24),{end:30,extended:false,exceedsBudget:false});
 assert.deepEqual(animationPreviewEnd(clip(4,[track([key(4,0)])]),[slot()],24),{end:4,extended:false,exceedsBudget:false});
});

test('a lone Loop key at zero gets a complete image cycle without changing stored duration or source values',()=>{
 const animation=freeze(clip(0,[track([key(-0,2,0)])])),slots=freeze([slot()]);
 assert.deepEqual(animationPreviewEnd(animation,slots,24),{end:9,extended:true,exceedsBudget:false});
 assert.equal(animation.duration,0);assert(Object.is(animation.sequenceTracks[0].keys[0].frame,-0));
 assert.equal(animationPreviewEnd(clip(0,[track([key(0,2,2)])]),slots,24).end,9,'a nonzero start index still takes Count intervals to complete a cycle');
});

test('Once includes the final image interval and Hold at zero stays static',()=>{
 const slots=[slot()];
 assert.deepEqual(animationPreviewEnd(clip(0,[track([key(0,1,1)])]),slots,24),{end:6,extended:true,exceedsBudget:false});
 assert.equal(animationPreviewEnd(clip(0,[track([key(0,1,2)])]),slots,24).end,3);
 assert.deepEqual(animationPreviewEnd(clip(0,[track([key(0,0,1)])]),slots,24),{end:0,extended:false,exceedsBudget:false});
 for(const mode of [1,2])assert.equal(animationPreviewEnd(clip(0,[track([key(0,mode)])]),[slot(1)],24).end,3);
});

test('the final running key can extend a positive clip while a later Hold supersedes earlier loops',()=>{
 const slots=[slot()];
 assert.equal(animationPreviewEnd(clip(30,[track([key(30)])]),slots,24).end,39);
 assert.deepEqual(animationPreviewEnd(clip(30,[track([key(5)])]),slots,24),{end:30,extended:false,exceedsBudget:false});
 assert.deepEqual(animationPreviewEnd(clip(3,[track([key(0,2,0,1e10),key(3,0,2)])]),slots,24),{end:3,extended:false,exceedsBudget:false});
 assert.equal(animationPreviewEnd(clip(3,[track([key(0,2,0,1e10),key(3,1,1)])]),slots,24).end,9);
});

test('multiple inactive or missing-image targets contribute only their maximum tail, never a common period',()=>{
 const slots=freeze([slot(),slot(4,8,11)]),animation=freeze(clip(0,[track([key(0)]),track([key(0)],11,8)]));
 assert.deepEqual(animationPreviewEnd(animation,slots,24),{end:12,extended:true,exceedsBudget:false},'periods9 and12 use12, not their common period36');
 assert.equal(animationPreviewEnd(clip(2,[track([key(0)]),track([key(2)],11,8)]),slots,24).end,14);
 assert.equal(slots[0].visible,false);assert.equal(slots[1].attachments[0].imageAvailable,false);
});

test('f32 key time, FPS and delay recovery define the f64 tail without changing JSON decimals',()=>{
 const fps=29.97,delay=.1,frame=.3,animation=freeze(clip(frame,[track([key(frame,2,0,delay)])]));
 const result=animationPreviewEnd(animation,[slot()],fps);
 assert.equal(result.end,Math.fround(frame)+3*(Math.fround(delay)*Math.fround(fps)));
 assert.notEqual(result.end,frame+3*delay*fps);
 assert.equal(animation.duration,.3);assert.equal(animation.sequenceTracks[0].keys[0].delay,.1);
 assert.equal(animationPreviewEnd(animation,[slot()],24).end,Math.fround(frame)+3*(Math.fround(delay)*24),'changing FPS changes frame extent while delay remains seconds per image');
});

test('recovering the stored f32 baseline includes a final Event hidden by short JSON duration',()=>{
 const animation=freeze(clip(.3)),events=[{event:2,keys:[{id:3,frame:.3,int:0,float:0,string:'own cue',volume:1,balance:0}]}];
 assert.equal(eventsBetween(events,0,animation.duration).length,0,'the short decimal lies before the stored f32 Event');
 const result=animationPreviewEnd(animation,[],30);
 assert.deepEqual(result,{end:Math.fround(.3),extended:false,exceedsBudget:false});
 assert.equal(eventsBetween(events,0,result.end).length,1);
 assert.equal(animation.duration,.3);
});

test('subframe Loop periods repeat whole cycles to at least one frame and Once gets a one-frame minimum',()=>{
 const slots=[slot()];
 assert.equal(animationPreviewEnd(clip(0,[track([key(0,2,1,1/256)])]),slots,24).end,1.125,'four complete0.28125-frame cycles');
 assert.equal(animationPreviewEnd(clip(0,[track([key(0,1,1,1/256)])]),slots,24).end,1);
 const tiny=animationPreviewEnd(clip(0,[track([key(0,2,1,2**-149)])]),slots,24);
 assert(Number.isFinite(tiny.end)&&tiny.end>=1&&tiny.end<2);assert.equal(tiny.exceedsBudget,false);
});

test('large and late finite automatic extents report the budget without silently cutting a cycle',()=>{
 const slots=[slot(1)];
 assert.deepEqual(animationPreviewEnd(clip(0,[track([key(0,2,0,1_000_000)])]),slots,1),{end:MAX_ANIMATION_PREVIEW_FRAME,extended:true,exceedsBudget:false});
 assert.deepEqual(animationPreviewEnd(clip(1,[track([key(1,2,0,1_000_000)])]),slots,1),{end:1_000_001,extended:true,exceedsBudget:true});
 assert.equal(animationPreviewEnd(clip(1_000_000,[track([key(1_000_000)])]),slots,24).end,1_000_003);
 const huge=animationPreviewEnd(clip(0,[track([key(0,2,0,3.4028234663852886e38)])]),[slot(4096)],240);
 assert(Number.isFinite(huge.end)&&huge.end>MAX_ANIMATION_PREVIEW_FRAME);assert.equal(huge.exceedsBudget,true);
 assert.deepEqual(animationPreviewEnd(clip(2_000_000),[],24),{end:2_000_000,extended:false,exceedsBudget:true});
});

test('invalid clocks, final-key carriers and target/profile mismatches reject instead of inventing a duration',()=>{
 for(const fps of [0,-1,NaN,Infinity,1e300,1e-100])assert.throws(()=>animationPreviewEnd(clip(),[],fps));
 for(const duration of [-1,NaN,Infinity,1e300])assert.throws(()=>animationPreviewEnd(clip(duration),[],24));
 for(const patch of [{mode:3},{index:3},{index:.5},{frame:-1},{frame:NaN},{frame:1_000_001},...[0,-1,NaN,Infinity,1e300,1e-100].map(delay=>({delay}))])assert.throws(()=>animationPreviewEnd(clip(0,[track([{...key(0),...patch}])]),[slot()],24));
 for(const count of [0,4097,1.5])assert.throws(()=>animationPreviewEnd(clip(0,[track([key(0)])]),[slot(count)],24));
 assert.throws(()=>animationPreviewEnd(clip(0,[track([key(0)],999)]),[slot()],24));
 assert.throws(()=>animationPreviewEnd(clip(0,[track([key(0)],10,999)]),[slot()],24));
 assert.throws(()=>animationPreviewEnd(clip(0,[track([])]),[slot()],24));
 assert.throws(()=>animationPreviewEnd(clip(0,[track([key(0)]),track([key(0)])]),[slot()],24));
});
