import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { build } from 'esbuild';
import { GIZMO_AXIS, GIZMO_RADIUS, angleDelta, gizmoCursor, gizmoDelta,
  gizmoHandles, hitGizmo, scaleBasis, selectedTopBones, transformPivot } from '../src/viewport/transformGizmo.ts';
import { previewTransformBones, worldBones } from '../src/domain/rig.ts';

const near=(a,b,tolerance=1e-6)=>assert.ok(Math.abs(a-b)<tolerance,`${a} != ${b}`);
const origin={x:200,y:200};
const root={id:0,parent:null,name:'root',x:0,y:0,rotation:0,length:0};
const bone=(id,x,y,length,parent=0)=>({id,parent,name:`b${id}`,x,y,length,rotation:0});
const transform=(ids,mode,values={})=>({type:'transformBones',ids,mode,pivotX:0,pivotY:0,
  dx:0,dy:0,rotation:0,scaleX:1,scaleY:1,shearX:0,shearY:0,...values});

test('visible ring, axis squares, center and shear diamonds have matching padded screen hits',()=>{
  assert.equal(hitGizmo('rotate',origin,{x:200+GIZMO_RADIUS,y:200}),'rotate');
  assert.equal(hitGizmo('rotate',origin,{x:200,y:200}),null);
  assert.equal(hitGizmo('rotate',origin,{x:200+GIZMO_RADIUS+9,y:200}),null);
  for(const tool of ['translate','scale','shear'])for(const handle of gizmoHandles(tool,origin)){
    assert.equal(hitGizmo(tool,origin,handle),handle.handle);
    assert.notEqual(gizmoCursor(handle.handle),'default');
  }
  assert.equal(hitGizmo('scale',origin,{x:240,y:203}),'scaleX');
  assert.equal(hitGizmo('scale',origin,{x:203,y:160}),'scaleY');
  assert.equal(hitGizmo('scale',origin,{x:240,y:160}),null);
  for(const zoom of [.1,.5,1,4,8]){
    const screen={x:400+zoom*73,y:300-zoom*45};
    const axis=gizmoHandles('scale',screen).find(h=>h.handle==='scaleX');
    near(axis.x-screen.x,64);near(axis.y-screen.y,0);
    assert.equal(hitGizmo('scale',screen,{x:axis.x+5,y:axis.y+5}),'scaleX');
  }
});

test('axis gestures constrain translation/scaling and shear names match the edited basis',()=>{
  let d=gizmoDelta('translateX',origin,{x:264,y:200},{x:284,y:170},2,0);
  near(d.dx,10);near(d.dy,0);
  d=gizmoDelta('translateY',origin,{x:200,y:136},{x:240,y:116},2,0);
  near(d.dx,0);near(d.dy,10);
  d=gizmoDelta('scaleX',origin,{x:264,y:200},{x:328,y:150},1,0);
  near(d.scaleX,2);near(d.scaleY,1);
  d=gizmoDelta('scaleY',origin,{x:200,y:136},{x:260,y:104},1,0);
  near(d.scaleX,1);near(d.scaleY,1.5);
  d=gizmoDelta('scale',origin,origin,{x:225,y:175},1,0);
  near(d.scaleX,Math.exp(.5));near(d.scaleY,d.scaleX);
  d=gizmoDelta('shearX',origin,{x:264,y:200},{x:264,y:168},1,0);
  near(d.shearX,Math.atan(.5)*180/Math.PI);near(d.shearY,0);
  d=gizmoDelta('shearY',origin,{x:200,y:136},{x:232,y:136},1,0);
  near(d.shearX,0);near(d.shearY,-Math.atan(.5)*180/Math.PI);
});

test('angular increments cross the branch cut and accumulate revolutions without length dependence',()=>{
  near(angleDelta(179*Math.PI/180,-179*Math.PI/180)*180/Math.PI,2);
  near(angleDelta(-179*Math.PI/180,179*Math.PI/180)*180/Math.PI,-2);
  const samples=[170,179,-179,-90,0,90,170];
  let angle=0;
  for(let i=1;i<samples.length;i++)angle+=angleDelta(samples[i-1]*Math.PI/180,samples[i]*Math.PI/180);
  near(angle,Math.PI*2);
});

test('Individual rotates short and long branches equally at their own origins; Group orbits one center',()=>{
  const bones=[root,bone(1,-100,0,10),bone(2,100,0,300)];
  const snapshot=structuredClone(bones);
  const individual=worldBones(previewTransformBones(bones,transform([1,2],'rotate',{rotation:90,individual:true})));
  for(let i=1;i<3;i++){
    near(individual[i].angle,90);near(individual[i].worldX,bones[i].x);near(individual[i].worldY,bones[i].y);
    near(individual[i].length,bones[i].length);near(Math.hypot(individual[i].tipX-individual[i].worldX,individual[i].tipY-individual[i].worldY),bones[i].length);
  }
  const group=worldBones(previewTransformBones(bones,transform([1,2],'rotate',{rotation:90,individual:false})));
  near(group[1].worldX,0);near(group[1].worldY,-100);near(group[2].worldX,0);near(group[2].worldY,100);
  assert.deepEqual(bones,snapshot);
});

test('selected descendants inherit once and active child uses the selected ancestor pivot',()=>{
  const bones=[root,bone(1,-50,10,100),bone(2,100,0,15,1),bone(3,70,10,200)];
  assert.deepEqual(selectedTopBones(bones,[1,2,3]),[1,3]);
  assert.deepEqual(transformPivot(bones,[1,2,3],2,'individual'),{x:-50,y:10});
  assert.deepEqual(transformPivot(bones,[1,2,3],2,'group'),{x:10,y:10});
  const changed=previewTransformBones(bones,transform([1,2,3],'rotate',{rotation:45,individual:true}));
  const posed=worldBones(changed);
  near(posed[1].angle,45);near(posed[2].angle,45);near(posed[3].angle,45);
  assert.equal(changed[2].rotation,0);near(posed[1].worldX,-50);near(posed[3].worldX,70);
  near(posed[2].worldX,-50+100/Math.sqrt(2));near(posed[2].worldY,10+100/Math.sqrt(2));
});

test('Individual full-affine rotation changes world orientation equally under distinct sheared parents',()=>{
  const bones=[{...root,scaleX:1.6,scaleY:.6,shearX:13,shearY:-9},
    {...bone(1,-30,10,12),rotation:20,shearX:7,scaleX:1.4},
    {...bone(2,45,-20,240),rotation:-35,shearX:-4,scaleX:.7}];
  const before=worldBones(bones);
  const after=worldBones(previewTransformBones(bones,transform([1,2],'rotate',{rotation:32,individual:true})));
  for(let i=1;i<3;i++){
    near(angleDelta(before[i].angle*Math.PI/180,after[i].angle*Math.PI/180)*180/Math.PI,32);
    near(after[i].worldX,before[i].worldX);near(after[i].worldY,before[i].worldY);
    near(Math.hypot(after[i].a,after[i].b),Math.hypot(before[i].a,before[i].b));
    near(after[i].length,before[i].length);
  }
});

test('Scale follows inherited local axes and multiplies only each selected top bone local channels',()=>{
  const bones=[{...root,rotation:23,scaleX:1.8,scaleY:.7,shearX:10,shearY:-12},
    {...bone(1,-30,10,12),rotation:30,shearX:7,shearY:15,scaleX:1.2,scaleY:.6},
    {...bone(2,12,0,20,1),rotation:-10,scaleX:.8,scaleY:1.1},
    {...bone(3,45,-20,240),rotation:-40,shearX:-4,scaleX:-.7,scaleY:1.3}];
  const snapshot=structuredClone(bones),before=worldBones(bones);
  const changed=previewTransformBones(bones,transform([1,2,3],'scale',{localAxes:true,scaleX:1.5,scaleY:.6,pivotX:999,pivotY:-999}));
  const after=worldBones(changed);
  for(const i of [1,3]){
    for(const key of ['x','y','rotation','shearX','shearY','length'])assert.equal(changed[i][key],bones[i][key]);
    near(changed[i].scaleX,bones[i].scaleX*1.5);near(changed[i].scaleY,bones[i].scaleY*.6);
    near(after[i].worldX,before[i].worldX);near(after[i].worldY,before[i].worldY);
    near(after[i].angle,before[i].angle);
    near(after[i].a,before[i].a*1.5);near(after[i].b,before[i].b*1.5);
    near(after[i].c,before[i].c*.6);near(after[i].d,before[i].d*.6);
  }
  assert.deepEqual(changed[2],bones[2]); // Selected child inherits once from selected parent.
  const basis=scaleBasis(bones,[1,2,3],2);
  near(basis.x.x,before[1].a/Math.hypot(before[1].a,before[1].b));
  near(basis.x.y,-before[1].b/Math.hypot(before[1].a,before[1].b));
  near(basis.y.x,before[1].c/Math.hypot(before[1].c,before[1].d));
  near(basis.y.y,-before[1].d/Math.hypot(before[1].c,before[1].d));
  const handles=gizmoHandles('scale',origin,basis);
  for(const h of handles)assert.equal(hitGizmo('scale',origin,h,basis),h.handle);
  const start=handles.find(h=>h.handle==='scaleX');
  const current={x:origin.x+basis.x.x*96-basis.x.y*31,y:origin.y+basis.x.y*96+basis.x.x*31};
  const d=gizmoDelta('scaleX',origin,start,current,1,0,basis);
  near(d.scaleX,1.5);near(d.scaleY,1);
  assert.throws(()=>previewTransformBones(bones,transform([1],'rotate',{localAxes:true})),/Scale only/);
  assert.throws(()=>previewTransformBones(bones,transform([1],'scale',{localAxes:true,scaleX:0})),/nonzero/);
  assert.deepEqual(bones,snapshot);
});

// Render the actual overlay against recording Graphics; visual/hit geometry must agree.
const built=await build({stdin:{contents:"import {TransformGizmo} from './src/viewport/GizmoOverlay.ts'; globalThis.Gizmo=TransformGizmo;",resolveDir:process.cwd()},
  bundle:true,write:false,platform:'browser',format:'iife',target:'es2022',plugins:[{name:'record-gizmo',setup(builder){
    builder.onResolve({filter:/^pixi\.js$/},()=>({path:'pixi',namespace:'stub'}));
    builder.onLoad({filter:/.*/,namespace:'stub'},()=>({contents:`
      export class Container {children=[]; addChild(...items){this.children.push(...items)}}
      export class BitmapText {position={set:(x,y)=>this.xy={x,y}}; constructor(o){this.text=o.text}}
      export class Graphics {ops=[]; clear(){this.ops=[];return this} circle(...p){this.ops.push(['circle',...p]);return this}
        moveTo(...p){this.ops.push(['moveTo',...p]);return this}lineTo(...p){this.ops.push(['lineTo',...p]);return this}
        poly(p){this.ops.push(['poly',...p]);return this}fill(){return this}stroke(){return this}}
    `}));
  }}]});
test('rendered gizmo includes ring/radius, distinct scale handles, shear guide and numeric feedback',()=>{
  const context=vm.createContext({});vm.runInContext(built.outputFiles[0].text,context);
  const view=new context.Gizmo();
  view.draw('rotate',origin,'rotate','individual',2,[],{handle:'rotate',startAngle:0,rotation:Math.PI/2,
    delta:{dx:0,dy:0,rotation:90,scaleX:1,scaleY:1,shearX:0,shearY:0}});
  const [g,,,label]=view.container.children;
  assert.ok(g.ops.some(op=>op[0]==='circle'&&op[1]===200&&op[2]===200&&op[3]===48));
  assert.match(label.text,/90.0°.*Individual.*2 bones/);
  assert.ok(g.ops.some(op=>op[0]==='lineTo'&&Math.abs(op[1]-200)<1e-6&&Math.abs(op[2]-152)<1e-6));
  view.draw('scale',origin,null,'group',2,[]);
  for(const h of gizmoHandles('scale',origin))assert.ok(g.ops.some(op=>op[0]==='poly'
    &&op.includes(h.x-h.radius)&&op.includes(h.y-h.radius)));
  view.draw('shear',origin,'shearX','individual',1,[]);
  assert.ok(g.ops.some(op=>op[0]==='poly'&&op.length===9));
  assert.match(view.container.children[1].text,/Shear X/);
  assert.match(view.container.children[2].text,/Shear Y/);
  const basis={x:{x:Math.sqrt(3)/2,y:-.5},y:{x:-.5,y:-Math.sqrt(3)/2}};
  view.draw('scale',origin,null,'individual',1,[],undefined,undefined,basis);
  assert.match(label.text,/Local.*Individual/);
  assert.ok(g.ops.some(op=>op[0]==='lineTo'&&Math.abs(op[1]-(200+32*Math.sqrt(3)))<1e-6&&op[2]===168));
  view.hide();assert.equal(view.container.visible,false);
});
