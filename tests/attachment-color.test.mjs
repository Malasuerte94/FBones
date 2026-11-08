import {test} from 'node:test';
import assert from 'node:assert/strict';
import {activeAttachmentColor,slotAttachmentColor} from '../src/domain/attachmentColor.ts';
import {sampleSequencePoses,projectSequencePoses} from '../src/domain/animationSequence.ts';

const region={image:'gem',imagePath:'',name:'gem',x:0,y:0,rotation:0,scaleX:1,scaleY:1,width:32,height:24};
const attachment=(id,color)=>({id,slot:7,name:'gem',type:'region',region,mesh:null,clipping:null,imageAvailable:true,color});
const slot=(color=0xffffffff,tint=0xffffffff)=>({id:7,name:'Own slot',bone:0,visible:true,blend:'normal',color,region,imageAvailable:true,activeAttachmentId:10,attachments:[attachment(10,tint),attachment(11,0x00ff00ff)]});

test('attachment RGBA remains independent of slot color, inactive alternatives, selection and legacy flattened views',()=>{
 const s=slot(0x8040c080,0xd4000039),before=structuredClone(s);
 assert.equal(activeAttachmentColor(s),0xd4000039);
 assert.deepEqual(slotAttachmentColor(s),[(128/255)*(212/255),0,0,(128/255)*(57/255)]);
 assert.deepEqual(s,before);assert.equal(activeAttachmentColor({...s,activeAttachmentId:11}),0x00ff00ff);
 assert.equal(activeAttachmentColor({...s,activeAttachmentId:null}),0xffffffff);
 assert.equal(activeAttachmentColor({...s,attachments:undefined}),0xffffffff);
 assert.deepEqual(slotAttachmentColor({...s,attachments:undefined}),[128/255,64/255,192/255,128/255]);
});

test('sampled light color multiplies Setup attachment tint once and retains precise sampled alpha',()=>{
 const s={...slot(0xffffffff,0x8000ff80),animatedColor:[.2,.5,.7,.123456789]};
 assert.deepEqual(slotAttachmentColor(s),[.2*128/255,0,.7,.123456789*128/255]);
 assert.equal(slotAttachmentColor(slot(0xffffffff,0x00000000))[3],0);
 assert.deepEqual(slotAttachmentColor(slot()),[1,1,1,1]);
});

test('Sequence frame projection retains attachment tint and authored geometry through missing and available frames',()=>{
 const s=slot(0x8040c080,0xd4000039);s.attachments[0]={...s.attachments[0],sequence:{start:7,count:3,digits:1,setupIndex:1},sequenceAvailableFrames:[0,2]};
 const before=structuredClone(s),track={attachment:10,slot:7,keys:[{id:1,frame:0,mode:2,index:0,delay:.125}]};
 for(const frame of [0,3,6,9,0]){
  const posed=projectSequencePoses([s],sampleSequencePoses([s],[track],frame,24))[0];
  assert.equal(activeAttachmentColor(posed),0xd4000039);assert.deepEqual(slotAttachmentColor(posed),slotAttachmentColor(s));
  assert.equal(posed.attachments[0].color,0xd4000039);assert.deepEqual({...posed.region,image:region.image},region);
 }
 assert.deepEqual(s,before);
});
