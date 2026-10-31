import { BitmapText, Container, Graphics } from 'pixi.js';
import { GIZMO_AXIS, GIZMO_RADIUS, gizmoHandles, type GizmoHandle, type GizmoPoint,
  type GizmoTool, type PivotMode, WORLD_GIZMO_BASIS, type GizmoBasis } from './transformGizmo.ts';

export interface GizmoFeedback {
  handle: GizmoHandle; startAngle: number; rotation: number;
  delta: { dx: number; dy: number; rotation: number; scaleX: number; scaleY: number; shearX: number; shearY: number };
}
const X = 0xf09b97, Y = 0xa5d9ab, ACCENT = 0x83dbe8;
const square = (x: number, y: number, r: number) => [x-r,y-r,x+r,y-r,x+r,y+r,x-r,y+r];
const diamond = (x: number, y: number, r: number) => [x,y-r,x+r,y,x,y+r,x-r,y];

/** Dedicated noninteractive overlay: native DOM pointer capture owns each drag. */
export class TransformGizmo {
  readonly container = new Container();
  private readonly graphics = new Graphics();
  private readonly xLabel = new BitmapText({ text: 'X', style: { fontFamily: 'Arial', fontSize: 11, fill: X } });
  private readonly yLabel = new BitmapText({ text: 'Y', style: { fontFamily: 'Arial', fontSize: 11, fill: Y } });
  private readonly feedback = new BitmapText({ text: '', style: { fontFamily: 'Arial', fontSize: 12, fill: 0xe5ecef } });

  constructor() {
    this.container.eventMode = 'none';
    this.container.addChild(this.graphics, this.xLabel, this.yLabel, this.feedback);
  }

  hide() { this.container.visible = false; }

  draw(tool: GizmoTool, origin: GizmoPoint, hover: GizmoHandle | null, mode: PivotMode,
    count: number, satellites: GizmoPoint[], draft?: GizmoFeedback, bounds?: { width: number; height: number },basis:GizmoBasis=WORLD_GIZMO_BASIS,subject:'bones'|'images'='bones',pivotHover=false) {
    this.container.visible = true;
    const g = this.graphics.clear(), { x, y } = origin;
    const selected = draft?.handle ?? hover;
    for (const point of satellites) {
      if (Math.hypot(point.x-x,point.y-y) < 8) continue;
      g.circle(point.x,point.y,3).stroke({color:ACCENT,width:1,alpha:0.65});
    }
    this.xLabel.visible = this.yLabel.visible = tool !== 'rotate' && tool !== 'pose';
    this.xLabel.text = tool === 'shear' ? 'Shear X' : 'X';
    this.yLabel.text = tool === 'shear' ? 'Shear Y' : 'Y';
    this.xLabel.position.set(x+basis.x.x*(GIZMO_AXIS+11),y+basis.x.y*(GIZMO_AXIS+11)-5);
    this.yLabel.position.set(x+basis.y.x*(GIZMO_AXIS+11)+8,y+basis.y.y*(GIZMO_AXIS+11)-12);
    if (tool !== 'rotate' && tool !== 'pose') {
      g.moveTo(x,y).lineTo(x+basis.x.x*GIZMO_AXIS,y+basis.x.y*GIZMO_AXIS).stroke({color:X,width:1.5,alpha:0.9});
      g.moveTo(x,y).lineTo(x+basis.y.x*GIZMO_AXIS,y+basis.y.y*GIZMO_AXIS).stroke({color:Y,width:1.5,alpha:0.9});
      if (tool === 'shear') {
        const sx = (draft?.delta.shearX ?? 0) * Math.PI/180;
        const sy = (draft?.delta.shearY ?? 0) * Math.PI/180;
        const ax = Math.cos(sx)*GIZMO_AXIS, ay = -Math.sin(sx)*GIZMO_AXIS;
        const bx = -Math.sin(sy)*GIZMO_AXIS, by = -Math.cos(sy)*GIZMO_AXIS;
        g.poly([x,y,x+ax,y+ay,x+ax+bx,y+ay+by,x+bx,y+by])
          .fill({color:ACCENT,alpha:0.05}).stroke({color:ACCENT,width:1,alpha:0.45});
      }
    }
    for (const h of gizmoHandles(tool,origin,basis)) {
      const color = selected === h.handle ? 0xffffff : h.handle.endsWith('X') ? X : h.handle.endsWith('Y') ? Y : ACCENT;
      if (h.kind === 'ring') {
        g.circle(x,y,h.radius).stroke({color,width:selected===h.handle?2.5:1.5,alpha:0.95});
        for (let i=0;i<12;i++) {
          const angle=i*Math.PI/6,inner=h.radius-3,outer=h.radius+3;
          g.moveTo(x+Math.cos(angle)*inner,y-Math.sin(angle)*inner)
            .lineTo(x+Math.cos(angle)*outer,y-Math.sin(angle)*outer).stroke({color:ACCENT,width:1,alpha:0.7});
        }
        const angle=(draft?.startAngle??0)+(draft?.rotation??0);
        if (draft) {
          const start=draft.startAngle,delta=Math.max(-Math.PI*2,Math.min(Math.PI*2,draft.rotation));
          const polygon=[x,y];
          const steps=Math.max(2,Math.ceil(Math.abs(delta)*16));
          for(let i=0;i<=steps;i++){const a=start+delta*i/steps;polygon.push(x+Math.cos(a)*h.radius,y-Math.sin(a)*h.radius);}
          g.poly(polygon).fill({color:ACCENT,alpha:0.12});
          g.moveTo(x,y).lineTo(x+Math.cos(start)*h.radius,y-Math.sin(start)*h.radius).stroke({color:ACCENT,width:1,alpha:0.5});
        }
        const px=x+Math.cos(angle)*h.radius,py=y-Math.sin(angle)*h.radius;
        g.moveTo(x,y).lineTo(px,py).stroke({color,width:1.5});
        g.circle(px,py,4).fill(color);
        g.circle(x,y,3).fill(0x303538).stroke({color:ACCENT,width:1});
      } else if(h.kind==='diamond') {
        g.poly(diamond(h.x,h.y,h.radius)).fill({color,alpha:0.65}).stroke({color,width:1.5});
        // Perpendicular guides show the actual drag direction for each shear axis.
        if(h.handle==='shearX')g.moveTo(h.x,h.y-13).lineTo(h.x,h.y+13).stroke({color,width:1,alpha:0.5});
        else g.moveTo(h.x-13,h.y).lineTo(h.x+13,h.y).stroke({color,width:1,alpha:0.5});
      } else if(tool==='translate' && (h.kind==='axisX'||h.kind==='axisY')) {
        const p=h.kind==='axisX'?[h.x,h.y,h.x-9,h.y-4,h.x-9,h.y+4]:[h.x,h.y,h.x-4,h.y+9,h.x+4,h.y+9];
        g.poly(p).fill(color);
      } else g.poly(square(h.x,h.y,h.radius)).fill({color:h.kind==='square'?0x303538:color,alpha:0.95}).stroke({color,width:1.5});
    }
    if(subject==='images'&&(tool==='rotate'||tool==='scale')){
      // Whole attachments use a movable session origin, separate from geometry.
      g.circle(x,y,4).fill(0x303538);
      g.moveTo(x-5,y).lineTo(x+5,y).moveTo(x,y-5).lineTo(x,y+5).stroke({color:pivotHover?0xffffff:ACCENT,width:1.5});
      if(pivotHover)g.circle(x,y,9).stroke({color:0xffffff,width:1.5});
    }
    const scope=`${tool==='scale'&&subject==='bones'?'Local':'World'} · ${tool==='pose'?'Individual':mode==='individual'?'Individual':'Group'}${count>1?` · ${count} ${subject}`:''}`;
    let value='';
    if(draft){const d=draft.delta;
      if(draft.handle==='rotate')value=`${d.rotation.toFixed(1)}°`;
      else if(draft.handle.startsWith('scale'))value=`X ${d.scaleX.toFixed(2)}×  Y ${d.scaleY.toFixed(2)}×`;
      else if(draft.handle.startsWith('shear'))value=`X ${d.shearX.toFixed(1)}°  Y ${d.shearY.toFixed(1)}°`;
      else value=`X ${d.dx.toFixed(1)}  Y ${d.dy.toFixed(1)}`;
    }
    this.feedback.text=value?`${value}  ·  ${scope}`:scope;
    const labelX=Math.max(4,Math.min(x-22,(bounds?.width??Infinity)-245));
    const labelY=Math.max(4,Math.min(y+GIZMO_RADIUS+18,(bounds?.height??Infinity)-19));
    this.feedback.position.set(labelX,labelY);
  }
}
