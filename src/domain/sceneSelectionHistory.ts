export type SceneSelectionMode='bones'|'images';
export type SceneHistorySelection=
  | {kind:'none';mode:SceneSelectionMode}
  | {kind:'bone'|'slot'|'attachment'|'constraint';mode:SceneSelectionMode;ids:readonly number[];active:number;anchor?:number|null};

function sameSelection(left:SceneHistorySelection|null,right:SceneHistorySelection|null):boolean{
  if(left===null||right===null)return left===right;
  if(left.kind==='none'||right.kind==='none')return left.kind===right.kind;
  return left.kind===right.kind&&left.active===right.active&&left.ids.length===right.ids.length&&
    left.ids.every((id,index)=>id===right.ids[index]);
}

const capacity=64;

export function createSceneSelectionHistory(){
  let entries:SceneHistorySelection[]=[];
  let cursor=-1;

  function reset(){entries=[];cursor=-1;}

  function record(before:SceneHistorySelection|null,after:SceneHistorySelection){
    if(sameSelection(before,after)||sameSelection(entries[cursor]??null,after))return;
    if(cursor===-1&&before)entries.push(before);
    else entries.length=cursor+1;
    entries.push(after);
    if(entries.length>capacity)entries.shift();
    cursor=entries.length-1;
  }

  function visit(direction:-1|1,current:SceneHistorySelection|null,valid:(entry:SceneHistorySelection)=>boolean){
    // If native focus changed independently, Back can still reach the latest deliberate selection.
    const step=direction===-1&&!sameSelection(entries[cursor]??null,current)?0:direction;
    for(let index=cursor+step;index>=0&&index<entries.length;index+=direction){
      const entry=entries[index]!;
      if(sameSelection(entry,current)||!valid(entry))continue;
      cursor=index;
      return entry;
    }
    return null;
  }

  return {record,visit,reset};
}
