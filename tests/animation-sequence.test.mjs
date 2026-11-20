import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validSequenceSettings,validSequenceWorkingPose,sequenceImageKey,sampleSequenceIndex,sampleSequencePoses,projectSequencePoses,planShownSequenceKey} from '../src/domain/animationSequence.ts';

const settings={start:12,count:4,digits:3,setupIndex:2};
const key=(frame,mode,index,delay=.125,id=1)=>({id,frame,mode,index,delay});
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};

test('numeric suffixes preserve base text and minimum padding with checked signed wire/allocation bounds',()=>{
 assert.equal(sequenceImageKey('effects/gem9',settings,1),'effects/gem9013');
 assert.equal(sequenceImageKey('gem',{start:100,count:4,digits:1,setupIndex:0},3),'gem103');
 assert.equal(sequenceImageKey('gem',{start:0,count:1,digits:0,setupIndex:0},0),'gem0');
 assert.equal(sequenceImageKey('gem',{start:2147483647,count:1,digits:10,setupIndex:0},0),'gem2147483647');
 for(const patch of [{count:0},{count:4097},{count:1.5},{digits:11},{digits:-1},{start:-1},{start:2147483647},{setupIndex:4},{setupIndex:-1},{start:NaN}])assert.equal(validSequenceSettings({...settings,...patch}),false,JSON.stringify(patch));
 for(const index of [-1,4,.5,NaN])assert.throws(()=>sequenceImageKey('gem',settings,index));
});

test('Hold, Once and Loop use setup before first key and last applicable key across fractional seek and repeat',()=>{
 const keys=[key(6,0,1,.125,1),key(12,1,2,.125,2),key(24,2,3,.125,3)];
 for(const [frame,expected]of [[0,2],[5.999,2],[6,1],[11.999,1],[12,2],[14.999,2],[15,3],[23.5,3],[24,3],[27,0],[30,1],[33,2],[36,3],[6,1],[30,1]])assert.equal(sampleSequenceIndex(settings,keys,frame,24),expected,'frame '+frame);
});

test('reverse modes and ping-pong use the authored offset, proper turnarounds and singleton frames',()=>{
 const modes=[[3,[1,2,3,2,1,0,1,2]],[4,[2,1,0,0,0,0,0,0]],[5,[2,1,0,3,2,1,0,3]],[6,[2,1,0,1,2,3,2,1]]];
 const singleton={...settings,count:1,setupIndex:0};
 for(const [mode,expected] of modes){
  const keys=[key(2,mode,1,.25)];
  assert.equal(sampleSequenceIndex(settings,keys,1,8),settings.setupIndex);
  assert.deepEqual(expected.map((_,interval)=>sampleSequenceIndex(settings,keys,2+2*interval,8)),expected);
  assert.equal(sampleSequenceIndex(settings,[],8,8,{mode,index:1,delay:.25}),expected[0]);
  assert.equal(sampleSequenceIndex(singleton,keys,16,8,undefined,settings),0);
 }
});

test('interval bias is explicit and advancing arithmetic does not wrap at signed32 boundaries',()=>{
 const keys=[key(0,2,1,Math.fround(1/30))];
 assert.equal(sampleSequenceIndex(settings,[key(6,2,1)],8.999,24),1);
 assert.equal(sampleSequenceIndex(settings,[key(6,2,1)],8.99999,24),2,'declared interval bias advances within the measured policy margin');
 const frame=1_000_000,fps=Math.fround(30),delay=Math.fround(1e-6),intervals=Math.floor(frame/fps/delay+.00001);
 assert(intervals>2**32);
 assert.equal(sampleSequenceIndex(settings,[key(0,2,1,delay)],frame,fps),(1+intervals%4)%4);
 assert.equal(sampleSequenceIndex(settings,[key(0,1,1,delay)],frame,fps),3);
 for(const frame of [0,1,2,30,100])assert.equal(sampleSequenceIndex(settings,keys,frame,30),(1+Math.floor(frame/30/Math.fround(1/30)+.00001)%4)%4);
});

test('stored f32 endpoint recovery and duplicate-frame precedence retain source values',()=>{
 const keys=freeze([key(1.0000001,0,1,.06666667,1),key(3,0,2,.06666667,2),key(3,0,3,.06666667,3)]);
 assert.equal(sampleSequenceIndex(settings,keys,1.00000011,24),2,'decimal endpoint rounds upward to its original stored f32');
 assert.equal(sampleSequenceIndex(settings,keys,Math.fround(1.0000001),24),1);
 assert.equal(sampleSequenceIndex(settings,keys,3,24),3,'last key at the same stored frame wins');
 assert.equal(keys[0].delay,.06666667,'sampling never rewrites supplied decimals/bits');
});

test('Key Shown preserves aligned Sequence phase and rejects an off-grid restart',()=>{
 const track=freeze({attachment:10,slot:7,keys:[key(0,2,1,.25,1),key(10,0,2,.25,2)]});
 const [planned]=planShownSequenceKey(settings,track,4,8);
 assert.deepEqual(planned,{attachment:10,frame:4,mode:2,index:3,delay:.25});
 const split=[track.keys[0],{...planned,id:3},track.keys[1]];
 for(const frame of [3.999,4,5.999,6,6.25,7.999,8,9.999,10]){
  assert.equal(sampleSequenceIndex(settings,split,frame,8),sampleSequenceIndex(settings,track.keys,frame,8));
 }
 assert.throws(()=>planShownSequenceKey(settings,track,5,8),/change the Sequence phase/);
 const restart={attachment:10,frame:5,mode:2,index:3,delay:.25};
 assert.equal(sampleSequenceIndex(settings,[track.keys[0],restart,track.keys[1]],6.25,8),3);
 assert.equal(sampleSequenceIndex(settings,track.keys,6.25,8),0);
 assert.deepEqual(planShownSequenceKey(settings,track,5,8,{mode:2,index:3,delay:.25}),[restart]);
});

test('Key Shown distinguishes mathematically aligned phase from f64 rounding and sampler bias',()=>{
 const track={attachment:10,slot:7,keys:[key(2**-149,2,0,.25)]};
 assert.equal((100-track.keys[0].frame)/8/.25,50,'f64 subtraction alone would report a whole period');
 assert.throws(()=>planShownSequenceKey(settings,track,100,8),/change the Sequence phase/);
 assert.throws(()=>planShownSequenceKey(settings,{...track,keys:[key(0,2,0,2**-53)]},1,1),/change the Sequence phase/);

 const masked={...track,keys:[key(0,2,1,.25,1),key(3.5,0,3,.25,2)]};
 const [planned]=planShownSequenceKey(settings,masked,3,8);
 assert.deepEqual(planned,{attachment:10,frame:3,mode:2,index:2,delay:.25});
 const split=[masked.keys[0],{...planned,id:3},masked.keys[1]];
 for(const frame of [3,3.25,3.49999,3.5,4,5]){
  assert.equal(sampleSequenceIndex(settings,split,frame,8),sampleSequenceIndex(settings,masked.keys,frame,8));
 }
 // The old transition is already visible just before f4 due to the bias.
 assert.throws(()=>planShownSequenceKey(settings,{...masked,keys:[masked.keys[0],key(4,0,3,.25,2)]},3,8),/change the Sequence phase/);
});

test('Key Shown retains Setup, constant modes and rightmost exact Sequence identities',()=>{
 const track={attachment:10,slot:7,keys:[key(2,0,1,.25,1),key(8,1,1,.25,2),key(8,1,2,.25,3)]};
 assert.deepEqual(planShownSequenceKey(settings,track,1,8),[{attachment:10,frame:1,mode:0,index:2,delay:.125}]);
 assert.deepEqual(planShownSequenceKey(settings,track,3,8),[{attachment:10,frame:3,mode:0,index:1,delay:.25}]);
 assert.deepEqual(planShownSequenceKey(settings,track,8+2**-25,8),[]);
 assert.deepEqual(planShownSequenceKey(settings,track,8,8,{mode:1,index:2,delay:.25+2**-28}),[]);
 assert.deepEqual(planShownSequenceKey(settings,track,8,8,{mode:0,index:1,delay:.125}),[
  {attachment:10,frame:8,keyId:3,mode:0,index:1,delay:.125},
 ]);
 assert.deepEqual(planShownSequenceKey(settings,track,11,8),[{attachment:10,frame:11,mode:1,index:3,delay:.25}]);
 const singleton={...settings,count:1,setupIndex:0}, loop={...track,keys:[key(0,2,0,.25)]};
 assert.deepEqual(planShownSequenceKey(singleton,loop,1,8),[{attachment:10,frame:1,mode:2,index:0,delay:.25}]);
});

test('invalid modes, indices, f32 delays and preview clocks reject rather than divide, loop or fallback',()=>{
 for(const pose of [{mode:7,index:0,delay:.125},{mode:1,index:4,delay:.125},{mode:2,index:.5,delay:.125},...[0,-1,NaN,Infinity,1e300,1e-100].map(delay=>({mode:2,index:0,delay}))]){
  assert.equal(validSequenceWorkingPose(settings,pose),false);
  assert.throws(()=>sampleSequenceIndex(settings,[key(0,pose.mode,pose.index,pose.delay)],3,24));
 }
 for(const [frame,fps]of [[NaN,24],[-1,24],[1_000_001,24],[0,0],[0,-1],[0,Infinity],[0,1e300],[0,1e-100]])assert.throws(()=>sampleSequenceIndex(settings,[],frame,fps));
});

function fixture(){
 const region={image:'effects/gem9',imagePath:'effects/gem9',name:'gem',x:3,y:4,rotation:15,scaleX:1.2,scaleY:.8,width:72,height:24};
 const mesh={weighted:false,bones:[0],vertices:[{weights:[1],positions:[0,0]},{weights:[1],positions:[30,0]},{weights:[1],positions:[0,20]}],uvs:[0,0,1,0,0,1],triangles:[0,1,2],edges:[0,1,1,2,2,0],hull:3};
 const a={id:10,slot:7,name:'gem',type:'region',region,mesh:null,clipping:null,imageAvailable:true,sequence:settings,sequenceAvailableFrames:[0,2,3]};
 const b={id:11,slot:7,name:'mesh',type:'mesh',region:{...region,image:'mesh',imagePath:''},mesh,clipping:null,imageAvailable:true,sequence:{start:7,count:2,digits:1,setupIndex:0},sequenceAvailableFrames:[0,1]};
 return freeze([{id:7,name:'Own slot',bone:0,visible:true,blend:'normal',region,mesh:null,imageAvailable:true,activeAttachmentId:10,attachments:[a,b]},{id:8,name:'Unchanged slot',bone:0,visible:false,blend:'normal',region:null,imageAvailable:false,activeAttachmentId:null,attachments:[]}]);
}

test('Main/Preview projection selects frame-specific availability without changing authored geometry, path or activation',()=>{
 const slots=fixture(),before=structuredClone(slots),tracks=[{attachment:10,slot:7,keys:[key(0,0,1)]}];
 const poses=sampleSequencePoses(slots,tracks,12,24),projected=projectSequencePoses(slots,poses);
 assert.deepEqual(poses,[{attachment:10,index:1,image:'effects/gem9013',imageAvailable:false},{attachment:11,index:0,image:'mesh7',imageAvailable:true}]);
 assert.equal(projected[0].region.image,'effects/gem9013');assert.equal(projected[0].imageAvailable,false,'missing sampled frame has no base or adjacent fallback');
 assert.deepEqual(projected[0].region,{...slots[0].region,image:'effects/gem9013'});assert.equal(projected[0].activeAttachmentId,10);assert.equal(projected[0].visible,true);
 assert.strictEqual(projected[0].attachments[1].mesh,slots[0].attachments[1].mesh);assert.strictEqual(projected[1],slots[1]);
 assert.deepEqual(projectSequencePoses(projected,sampleSequencePoses(projected,tracks,12,24)),projected,'projection does not append the suffix twice');
 assert.deepEqual(slots,before,'sampling and rendering projection never author Setup or image inventory');
});

test('inactive Sequence alternatives sample independently and a working frame changes only the selected attachment image',()=>{
 const slots=fixture(),tracks=[{attachment:10,slot:7,keys:[key(0,2,0)]},{attachment:11,slot:7,keys:[key(0,2,1)]}],drafts=new Map([[10,{mode:1,index:2,delay:.125}]]);
 const poses=sampleSequencePoses(slots,tracks,12,24,drafts);assert.equal(poses[0].index,2);assert.equal(poses[1].index,1);assert.equal(poses[0].image,'effects/gem9014');assert.equal(poses[1].image,'mesh8');
 const activeMesh=[{...slots[0],activeAttachmentId:11,region:slots[0].attachments[1].region,mesh:slots[0].attachments[1].mesh},slots[1]];
 const projected=projectSequencePoses(activeMesh,poses);assert.equal(projected[0].region.image,'mesh8');assert.strictEqual(projected[0].mesh,slots[0].attachments[1].mesh);assert.equal(projected[0].attachments.length,2);
 assert.throws(()=>sampleSequencePoses(slots,[{attachment:10,slot:8,keys:[]}],0,24));assert.throws(()=>sampleSequencePoses(slots,[tracks[0],tracks[0]],0,24));
});

test('Linked Sequence uses the source keys and draft with the receiving attachment’s frames',()=>{
 const [sourceSlot,childSlot]=fixture(),[a,b]=sourceSlot.attachments;
 const source={...a,type:'mesh',mesh:b.mesh};
 const child={...b,slot:childSlot.id,linkedMeshSourceId:source.id,linkedMeshInheritsTimelines:true};
 const slots=freeze([{...sourceSlot,visible:false,activeAttachmentId:null,attachments:[source]},
  {...childSlot,visible:true,activeAttachmentId:child.id,region:child.region,mesh:child.mesh,attachments:[child]}]);
 const sources={attachment:source.id,slot:source.slot,keys:[key(6,0,3),key(12,1,3,.125,2),key(24,2,2,.125,3)]};
 const own={attachment:child.id,slot:child.slot,keys:[key(0,0,1,.125,4)]};
 const tracks=[sources,own];
 for(const [frame,image] of [[0,'mesh7'],[6,'mesh8'],[15,'mesh8'],[24,'mesh7'],[27,'mesh8']]){
  const poses=sampleSequencePoses(slots,tracks,frame,24);
  assert.equal(poses.find(pose=>pose.attachment===child.id).image,image);
  assert.equal(projectSequencePoses(slots,poses)[1].region.image,image);
 }
 const working=new Map([[source.id,{mode:2,index:3,delay:.125}]]);
 assert.equal(sampleSequencePoses(slots,tracks,24,24,working).at(-1).image,'mesh8');
 const independent=[slots[0],{...slots[1],attachments:[{...child,linkedMeshInheritsTimelines:false}]}];
 assert.equal(sampleSequencePoses(independent,tracks,0,24).at(-1).image,'mesh8');
 assert.throws(()=>sampleSequencePoses(slots,[{...sources,slot:child.slot}],6,24),/owner/);
});

test('Key Shown preserves inheriting Sequence frame and phase with different receiving counts',()=>{
 const short={...settings,count:3,setupIndex:0},long={...settings,count:6,setupIndex:0};
 const loop={attachment:10,slot:7,keys:[key(0,2,1,.25)]};
 assert.throws(()=>planShownSequenceKey(settings,loop,8,8,undefined,[short]),/inheriting mesh/);
 const [aligned]=planShownSequenceKey(settings,loop,4,8,undefined,[short]);
 for(const frame of [4,5.999,6,8,14])assert.equal(
  sampleSequenceIndex(short,[loop.keys[0],aligned],frame,8,undefined,settings),
  sampleSequenceIndex(short,loop.keys,frame,8,undefined,settings));
 const once={...loop,keys:[key(0,1,2,.25)]};
 assert.throws(()=>planShownSequenceKey(settings,once,3,8,undefined,[long]),/change the Sequence phase/);
 assert.throws(()=>planShownSequenceKey(settings,once,4,8,undefined,[long]),/inheriting mesh/);
 const beforeFirst={...once,keys:[key(8,0,1,.25)]};
 assert.throws(()=>planShownSequenceKey(settings,beforeFirst,4,8,undefined,[short]),/inheriting mesh/);
});

test('Key Shown preserves the ping-pong leg and reverse offsets across the inserted key',()=>{
 for(const [mode,initial,newMode,newIndex] of [[3,0,6,1],[6,0,3,1],[5,3,5,3],[4,1,4,3]]){
  const track={attachment:10,slot:7,keys:[key(0,mode,initial,.25)]};
  const [planned]=planShownSequenceKey(settings,track,8,8);
  assert.deepEqual(planned,{attachment:10,frame:8,mode:newMode,index:newIndex,delay:.25});
  for(const frame of [8,9.875,10,12,14,18,32,64])assert.equal(
   sampleSequenceIndex(settings,[track.keys[0],planned],frame,8),sampleSequenceIndex(settings,track.keys,frame,8));
 }
 const track={attachment:10,slot:7,keys:[key(0,3,0,.25)]};
 const receiver={...settings,count:6};
 const [standalone]=planShownSequenceKey(settings,track,8,8);
 assert.equal(sampleSequenceIndex(receiver,track.keys,8,8,undefined,settings),4);
 assert.equal(sampleSequenceIndex(receiver,[standalone],8,8,undefined,settings),4);
 assert.notEqual(sampleSequenceIndex(receiver,track.keys,10,8,undefined,settings),sampleSequenceIndex(receiver,[standalone],10,8,undefined,settings));
 assert.throws(()=>planShownSequenceKey(settings,track,8,8,undefined,[receiver]),/change the Sequence phase/);

 const masked={...track,keys:[track.keys[0],key(8.5,0,0,.25,2)]};
 const [planned]=planShownSequenceKey(settings,masked,8,8,undefined,[receiver]);
 for(const frame of [8,8.125,8.4999,8.5,10])assert.equal(
  sampleSequenceIndex(receiver,[masked.keys[0],planned,masked.keys[1]],frame,8,undefined,settings),
  sampleSequenceIndex(receiver,masked.keys,frame,8,undefined,settings));
});
