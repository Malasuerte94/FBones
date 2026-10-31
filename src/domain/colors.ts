import type {BoneView} from './project.ts';
function rgb(h:number,s:number,l:number){s/=100;l/=100;const c=(1-Math.abs(2*l-1))*s,x=c*(1-Math.abs((h/60)%2-1)),m=l-c/2;const v=h<60?[c,x,0]:h<120?[x,c,0]:h<180?[0,c,x]:h<240?[0,x,c]:h<300?[x,0,c]:[c,0,x];return v.map(n=>Math.round((n+m)*255));}
function pack(h:number,s:number,l:number){const [r,g,b]=rgb((h+360)%360,s,l);return (((r!<<24)|(g!<<16)|(b!<<8)|255)>>>0);}
function hsl(value:number){const r=(value>>>24)/255,g=((value>>>16)&255)/255,b=((value>>>8)&255)/255;const max=Math.max(r,g,b),min=Math.min(r,g,b),d=max-min,l=(max+min)/2;let h=d===0?40:max===r?60*(((g-b)/d)%6):max===g?60*((b-r)/d+2):60*((r-g)/d+4);if(h<0)h+=360;return {h,s:d===0?50:100*d/(1-Math.abs(2*l-1)),l:l*100};}
export function childColor(parent:BoneView|undefined){const p=hsl(parent?.color??0xd6bc7cff);return pack(p.h+3,p.s,p.l<73?p.l+5:p.l-15);}
export function automaticColors(bones:readonly BoneView[]){
 const poses=new Map<number,{h:number;depth:number}>();
 return bones.map(b=>{const parent=b.parent===null?null:poses.get(b.parent);let hash=0;for(const c of b.name)hash=(hash*31+c.codePointAt(0)!)>>>0;const h=b.parent===null?42:parent&&parent.depth>0?parent.h:(hash*137.508)%360,depth=parent?parent.depth+1:0;poses.set(b.id,{h,depth});return{id:b.id,color:pack(h+depth*2,52,58+(depth%4)*5)};});
}
