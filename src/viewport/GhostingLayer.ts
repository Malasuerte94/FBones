import {Container, Graphics} from 'pixi.js';
import type {GhostPose,GhostVector} from '../domain/ghosting.ts';
import {worldBones} from '../domain/rig.ts';
import type {ImageLayer} from './ImageLayer.ts';

export interface ViewportGhosting {
  poses:readonly GhostPose[];
  vectors:readonly GhostVector[];
  bones:boolean;
  onTop:boolean;
  boneFilter:ReadonlySet<number>|null;
}

export class GhostingLayer {
  readonly container = new Container({eventMode:'none'});
  private readonly bones = new Graphics();
  private readonly vectors = new Graphics();
  private readonly sprites:ImageLayer[] = [];
  private last?:ViewportGhosting & {transform:string};

  constructor(private readonly textureSource:ImageLayer|null) {
    this.container.addChild(this.bones,this.vectors);
  }

  draw(documentId:number, view:ViewportGhosting|undefined, transform:string,
    project:(x:number,y:number)=>{x:number;y:number}, zoom:number) {
    const previous=this.last;
    if(!view||(!view.poses.length&&!view.vectors.length)){
      if(previous){this.last=undefined;this.bones.clear();this.vectors.clear();this.trimImages(0);}
      return;
    }
    if(previous?.poses===view.poses&&previous.vectors===view.vectors&&previous.bones===view.bones&&
      previous.boneFilter===view.boneFilter&&previous.transform===transform)return;
    this.last={...view,transform};
    this.bones.clear();
    let imageCount=0;
    for(const pose of view.poses){
      const screen=(x:number,y:number)=>project(x+pose.offsetX,y+pose.offsetY);
      if(this.textureSource&&pose.slots.length){
        // Outline layers composite after all of this pose's filled attachments.
        for(const effect of [pose.fill,pose.outline]){
          if(effect==='none')continue;
          let layer=this.sprites[imageCount];
          if(!layer){
            layer=this.textureSource.ghostLayer();
            this.sprites.push(layer);
            this.container.addChildAt(layer.container,imageCount);
          }
          imageCount++;
          layer.drawGhost(documentId,pose.bones,pose.slots,screen,zoom,{color:pose.color,alpha:pose.alpha,boneFilter:view.boneFilter,effect});
        }
      }
      if(!view.bones)continue;
      const ink={color:pose.color,alpha:pose.alpha};
      const stroke={...ink,width:2};
      for(const bone of worldBones(pose.bones)){
        const origin=screen(bone.worldX,bone.worldY), tip=screen(bone.tipX,bone.tipY);
        this.bones.moveTo(origin.x,origin.y).lineTo(tip.x,tip.y).stroke(stroke);
        this.bones.circle(origin.x,origin.y,bone.parent===null?5:3).fill(ink);
      }
    }
    this.trimImages(imageCount);
    this.drawVectors(view,project);
  }

  private drawVectors(view:ViewportGhosting,project:(x:number,y:number)=>{x:number;y:number}){
    this.vectors.clear();
    if(!view.vectors.length)return;
    const strokes=new Map<string,GhostVector[]>();
    for(const vector of view.vectors){
      if(view.boneFilter&&!view.boneFilter.has(vector.bone))continue;
      const key=`${vector.color}:${vector.alpha}`;
      const stroke=strokes.get(key);
      if(stroke)stroke.push(vector);
      else strokes.set(key,[vector]);
    }
    for(const stroke of strokes.values()){
      const {color,alpha}=stroke[0]!;
      for(const {from,to} of stroke){
        const start=project(from.x,from.y),end=project(to.x,to.y);
        this.vectors.moveTo(start.x,start.y).lineTo(end.x,end.y);
      }
      this.vectors.stroke({color,alpha,width:1.5});
    }
  }

  private trimImages(count:number) {
    while(this.sprites.length>count)this.sprites.pop()!.destroy();
  }

  releaseImages() { this.trimImages(0); }
}
