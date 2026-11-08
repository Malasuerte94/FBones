import {test} from 'node:test';
import assert from 'node:assert/strict';
import {sampleSlotPoses,projectSlotPoses,sampleSlotDark} from '../src/domain/animationSlots.ts';
import {slotDarkColor,slotAttachmentColor,slotTwoColorMatrix} from '../src/domain/attachmentColor.ts';

const region={image:'own',imagePath:'',name:'own',x:0,y:0,rotation:0,scaleX:1,scaleY:1,width:32,height:24};
function slot(){return{id:7,name:'Own two color',bone:0,blend:'normal',color:0xffffffff,tintBlack:true,darkColor:0x204080ff,region,visible:true,imageAvailable:true,activeAttachmentId:10,attachments:[{id:10,slot:7,name:'Own region',type:'region',region,mesh:null,clipping:null,imageAvailable:true,color:0x8040ff80}]};}
const key=(id,frame,values,darkValues)=>({id,frame,values,darkValues,curve:'linear'});
const track={slot:7,channel:'rgba',keys:[key(11,2,[.2,.4,.6,.8],[.8,.6,.4]),key(12,8,[.8,.6,.4,.2],[.2,.4,.6])]};

test('joint light and dark sample independently before, within and after keys without changing Setup or metadata alpha',()=>{
 const source=slot(),before=structuredClone(source),saved=structuredClone(track);
 const setup=sampleSlotPoses([source],[track],0)[0];assert.deepEqual(setup.color,[1,1,1,1]);assert.deepEqual(setup.dark,[32/255,64/255,128/255]);
 for(const frame of [2,3.25,5,7.75,8,20]){
  const pose=sampleSlotPoses([source],[track],frame)[0],mix=Math.min(1,(frame-2)/6);
  for(let c=0;c<3;c++){const a=Math.fround(track.keys[0].darkValues[c]),b=Math.fround(track.keys[1].darkValues[c]);assert.equal(pose.dark[c],a+(b-a)*mix);}
  const projected=projectSlotPoses([source],[pose])[0];assert.deepEqual(projected.animatedDarkColor,pose.dark);assert.equal(projected.darkColor,source.darkColor);assert.equal(projected.tintBlack,true);assert.deepEqual(projected.attachments,source.attachments);assert.equal(projected.activeAttachmentId,10);
 }
 assert.deepEqual(source,before);assert.deepEqual(track,saved);
});

test('dark working values are independent from light, attachment tint and enablement, with no dark opacity',()=>{
 const source=slot(),pose=sampleSlotPoses([source],[track],5,new Map([[7,{dark:[.1,.2,.3]}]]))[0],projected=projectSlotPoses([source],[pose])[0];
 assert.deepEqual(pose.dark,[.1,.2,.3]);assert.deepEqual(slotDarkColor(projected),[.1,.2,.3]);
 const light=slotAttachmentColor(projected);assert.equal(light[0],pose.color[0]*128/255);assert.equal(light[1],pose.color[1]*64/255);assert.equal(light[2],pose.color[2]);assert.equal(light[3],pose.color[3]*128/255);
 assert.deepEqual(slotDarkColor({...projected,darkColor:0xabcdef00}),[.1,.2,.3]);assert.deepEqual(slotDarkColor({...projected,tintBlack:false}),[0,0,0]);assert.equal(slotTwoColorMatrix({...projected,tintBlack:false}),null);assert.equal(slotTwoColorMatrix({...projected,animatedDarkColor:[0,0,0]}),null);
});

test('legacy four-component fixtures keep their exact pose shape and dormant curves remain zero; active curved dark data rejects',()=>{
 const source=slot();delete source.tintBlack;delete source.darkColor;
 const legacy={slot:7,channel:'rgba',keys:track.keys.map(({darkValues,...k})=>k)},pose=sampleSlotPoses([source],[legacy],5)[0];assert.equal('dark'in pose,false);assert.equal('animatedDarkColor'in projectSlotPoses([source],[pose])[0],false);
 const held=[{...track.keys[0],curve:'stepped',darkValues:[0,0,0]},{...track.keys[1],darkValues:[0,0,0]}];assert.deepEqual(sampleSlotDark(held,5),[0,0,0]);assert.throws(()=>sampleSlotDark([{...track.keys[0],curve:'stepped'},track.keys[1]],5),/outside the supported/);
 assert.equal(sampleSlotDark(track.keys,NaN),null);assert.equal(sampleSlotDark(track.keys,0),null);
});

test('disabled Tint Black retains dormant Setup RGB while sampled and newly keyed light-only dark lanes are zero',()=>{
 const source={...slot(),tintBlack:false,darkColor:0x336699ff},before=structuredClone(source),pose=sampleSlotPoses([source],[],0)[0],projected=projectSlotPoses([source],[pose])[0];
 assert.deepEqual(pose.dark,[0,0,0]);assert.deepEqual(projected.animatedDarkColor,[0,0,0]);assert.equal(projected.darkColor,0x336699ff);assert.equal(slotTwoColorMatrix(projected),null);assert.deepEqual(source,before);
});

test('ColorMatrix black-end remap matches independent premultiplied formula at transparent edges and zero light channels',()=>{
 // Algebra of the installed Pixi8.8 filter, not a GPU/pixel observation. Filter
 // input is white-tinted with combined opacity; output alpha is unchanged.
 const pixels=[[0,0,0,0],[0,0,0,1],[1,1,1,1],[.25,.5,.75,.125],[1,0,.5,.5],[0,1,0,1/255]],lights=[[0,0,0,1],[1,.5,.25,.25],[.123,.456,.789,.875]],darks=[[1,.5,.25],[.25,1,0],[.123456,.654321,.234567]];
 for(const pixel of pixels)for(const light of lights)for(const dark of darks){
  const s={...slot(),animatedColor:light,animatedDarkColor:dark},matrix=slotTwoColorMatrix(s),combined=slotAttachmentColor(s),alpha=pixel[3]*combined[3],premul=pixel.slice(0,3).map(v=>v*alpha),straight=alpha?premul.map(v=>v/alpha):[0,0,0],vector=[...straight,alpha,1];
  const filtered=[0,1,2,3].map(row=>matrix.slice(row*5,row*5+5).reduce((sum,value,i)=>sum+value*vector[i],0));for(let c=0;c<3;c++)filtered[c]*=filtered[3];
  const expected=pixel.slice(0,3).map((value,c)=>(value*combined[c]+(1-value)*dark[c])*alpha);expected.push(alpha);
  filtered.forEach((v,c)=>assert(Math.abs(v-expected[c])<1e-14));
 }
 const black={...slot(),animatedColor:[0,0,0,1],animatedDarkColor:[1,.5,.25]};assert.deepEqual(slotTwoColorMatrix(black).slice(0,5),[-1,0,0,0,1]);
});
