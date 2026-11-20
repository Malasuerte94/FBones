import {computed,onBeforeUnmount,shallowRef,watch} from 'vue';

interface PositionOptions {
  position:()=>number;
  enabled:()=>boolean;
  context?:()=>unknown;
  commit:(position:number)=>void;
}

interface ToolbarDrag {
  pointerId:number;
  handle:HTMLElement;
  track:HTMLElement;
  group:HTMLElement;
  trackWidth:number;
  groupWidth:number;
  travel:number;
  startX:number;
  startPosition:number;
}

const keyStep=16;
// Treat subpixel layout noise as a full-width group.
const widthTolerance=0.25;
const clampPosition=(position:number)=>Math.min(1,Math.max(0,position));

export function useViewportToolbarPosition(options:PositionOptions){
  const track=shallowRef<HTMLElement|null>(null);
  const group=shallowRef<HTMLElement|null>(null);
  const measuredTravel=shallowRef(0);
  const canMove=computed(()=>options.enabled()&&measuredTravel.value>widthTolerance);
  const preview=shallowRef<number|null>(null);
  const position=computed(()=>{
    const value=options.position();
    return Number.isFinite(value)?clampPosition(value):0.5;
  });
  const displayPosition=computed(()=>preview.value??position.value);
  const offsetX=computed(()=>Math.max(0,measuredTravel.value)*displayPosition.value);
  const dragging=computed(()=>preview.value!==null);
  let drag:ToolbarDrag|null=null;

  function cancel(){
    if(!drag)return;
    const {handle,pointerId}=drag;
    drag=null;
    window.removeEventListener('keydown',cancelOnEscape,true);
    window.removeEventListener('resize',cancel);
    window.removeEventListener('blur',cancel);
    if(handle.hasPointerCapture(pointerId))handle.releasePointerCapture(pointerId);
    preview.value=null;
  }

  function cancelOnEscape(event:KeyboardEvent){
    if(event.key!=='Escape')return;
    event.preventDefault();
    event.stopImmediatePropagation();
    cancel();
  }

  function dimensionsChanged(current:ToolbarDrag,trackWidth:number,groupWidth:number){
    return Math.abs(trackWidth-current.trackWidth)>widthTolerance||
      Math.abs(groupWidth-current.groupWidth)>widthTolerance;
  }

  function onPointerDown(event:PointerEvent){
    const handle=event.currentTarget,trackNode=track.value,groupNode=group.value;
    if(!options.enabled()||drag||event.button!==0||!event.isPrimary||!(handle instanceof HTMLElement)||!trackNode||!groupNode)return;
    event.preventDefault();
    event.stopPropagation();
    const trackWidth=trackNode.getBoundingClientRect().width;
    const groupWidth=groupNode.getBoundingClientRect().width;
    const travel=trackWidth-groupWidth;
    if(travel<=widthTolerance)return;
    try{handle.setPointerCapture(event.pointerId);}catch{return;}

    drag={pointerId:event.pointerId,handle,track:trackNode,group:groupNode,trackWidth,groupWidth,travel,
      startX:event.clientX,startPosition:position.value};
    preview.value=drag.startPosition;
    window.addEventListener('keydown',cancelOnEscape,true);
    window.addEventListener('resize',cancel);
    window.addEventListener('blur',cancel);
  }

  function onPointerMove(event:PointerEvent){
    if(!drag||event.pointerId!==drag.pointerId)return;
    preview.value=clampPosition(drag.startPosition+(event.clientX-drag.startX)/drag.travel);
  }

  function onPointerUp(event:PointerEvent){
    if(!drag||event.pointerId!==drag.pointerId)return;
    const start=drag.startPosition;
    const next=clampPosition(start+(event.clientX-drag.startX)/drag.travel);
    const trackWidth=drag.track.getBoundingClientRect().width;
    const groupWidth=drag.group.getBoundingClientRect().width;
    const shouldCommit=options.enabled()&&event.button===0&&next!==start&&trackWidth-groupWidth>widthTolerance&&
      !dimensionsChanged(drag,trackWidth,groupWidth);
    cancel();
    if(shouldCommit)options.commit(next);
  }

  function onPointerCancel(event:PointerEvent){
    if(event.pointerId===drag?.pointerId)cancel();
  }

  function onKeyDown(event:KeyboardEvent){
    if(!options.enabled()||event.altKey||event.ctrlKey||event.metaKey||event.isComposing)return;
    const key=event.key;
    if(key!=='ArrowLeft'&&key!=='ArrowRight'&&key!=='Home'&&key!=='End')return;
    event.preventDefault();
    event.stopPropagation();
    if(drag||!track.value||!group.value)return;
    const travel=track.value.getBoundingClientRect().width-group.value.getBoundingClientRect().width;
    if(travel<=widthTolerance)return;
    const start=position.value;
    let next=0;
    if(key==='End')next=1;
    else if(key!=='Home')next=clampPosition(start+(key==='ArrowRight'?keyStep:-keyStep)/travel);
    if(next!==start)options.commit(next);
  }

  watch([track,group],([trackNode,groupNode],_previous,onCleanup)=>{
    if(!trackNode||!groupNode){measuredTravel.value=0;return;}
    const measure=()=>{
      const trackWidth=trackNode.getBoundingClientRect().width;
      const groupWidth=groupNode.getBoundingClientRect().width;
      measuredTravel.value=trackWidth-groupWidth;
      if(drag&&(measuredTravel.value<=widthTolerance||dimensionsChanged(drag,trackWidth,groupWidth)))cancel();
    };
    const resize=new ResizeObserver(measure);
    onCleanup(()=>resize.disconnect());
    resize.observe(trackNode);
    resize.observe(groupNode);
    measure();
  },{flush:'post'});
  watch(()=>[options.enabled(),options.position(),options.context?.(),track.value,group.value],cancel,{flush:'sync'});
  onBeforeUnmount(cancel);

  return {track,group,canMove,displayPosition,offsetX,dragging,cancel,onPointerDown,onPointerMove,onPointerUp,onPointerCancel,
    onLostPointerCapture:onPointerCancel,onKeyDown};
}
