export const dockPanels=['weights','mesh','tree','properties','ik','transform','physics'] as const;
export type DockPanelId=typeof dockPanels[number];
export interface DockPanel {id:DockPanelId;visible:boolean;height:number}
export interface DockColumn {id:string;width:number;panels:DockPanel[]}
export interface DockLayout {version:1;columns:DockColumn[]}
export type DockTarget={column:string;before?:DockPanelId}|{column:string;split:'left'|'right'};
export const dockStorageKey='fbones.dock-layout.v1';
const clamp=(v:number,min:number,max:number)=>Math.min(max,Math.max(min,v));
export function defaultDockLayout(compact=false):DockLayout{return{version:1,columns:[
 {id:'weights',width:240,panels:[{id:'weights',visible:!compact,height:1}]},
 {id:'mesh',width:220,panels:[{id:'mesh',visible:!compact,height:1}]},
 {id:'scene',width:290,panels:[{id:'tree',visible:true,height:.58},{id:'properties',visible:true,height:.42}]},
 ...(['ik','transform','physics'] as const).map(id=>({id,width:280,panels:[{id,visible:false,height:1}]})),
]};}
/** Treat stored browser layout as untrusted UI input; never touches a project. */
export function readDockLayout(raw:string|null,compact=false):DockLayout{
 try{
  const value=JSON.parse(raw??'null') as DockLayout;
  if(value?.version!==1||!Array.isArray(value.columns)||!value.columns.length||value.columns.length>dockPanels.length)throw Error();
  const ids=new Set<string>(),columns=new Set<string>();
  for(const column of value.columns){
   if(typeof column.id!=='string'||!column.id||columns.has(column.id)||!Number.isFinite(column.width)||!Array.isArray(column.panels)||!column.panels.length)throw Error();
   columns.add(column.id);column.width=clamp(column.width,180,520);
   for(const panel of column.panels){if(!dockPanels.includes(panel.id)||ids.has(panel.id)||typeof panel.visible!=='boolean'||!Number.isFinite(panel.height))throw Error();ids.add(panel.id);panel.height=clamp(panel.height,.15,2);}
  }
  if(ids.size!==dockPanels.length)throw Error();return value;
 }catch{return defaultDockLayout(compact);}
}
export function dockPanel(layout:DockLayout,id:DockPanelId){return layout.columns.flatMap(c=>c.panels).find(p=>p.id===id)!;}
export function cloneDockLayout(layout:DockLayout):DockLayout{return{version:1,columns:layout.columns.map(c=>({...c,panels:c.panels.map(p=>({...p}))}))};}
export function moveDockPanel(layout:DockLayout,id:DockPanelId,target:DockTarget):DockLayout{
 if(!layout.columns.some(c=>c.id===target.column))return layout;
 if('before'in target&&target.before===id)return layout;
 const next=cloneDockLayout(layout),source=next.columns.find(c=>c.panels.some(p=>p.id===id));
 if(!source)return layout;const panel=source.panels.find(p=>p.id===id)!;
 source.panels=source.panels.filter(p=>p.id!==id);
 const destination=next.columns.find(c=>c.id===target.column)!;
 if('split'in target){
  const index=next.columns.indexOf(destination)+(target.split==='right'?1:0);
  let key=`split-${id}`,suffix=1;while(next.columns.some(c=>c.id===key))key=`split-${id}-${suffix++}`;
  next.columns.splice(index,0,{id:key,width:source.width,panels:[panel]});
 }else{
  const index=target.before?destination.panels.findIndex(p=>p.id===target.before):-1;
  destination.panels.splice(index<0?destination.panels.length:index,0,panel);
 }
 next.columns=next.columns.filter(c=>c.panels.length);return next;
}
