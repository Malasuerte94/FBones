import {computed,onScopeDispose,shallowRef,watchEffect} from 'vue';

interface VerticalDragOptions<Context> {
  isCurrent:(context:Context)=>boolean;
  preview:(context:Context,delta:number|null)=>void;
  commit:(context:Context,delta:number)=>void;
}

interface FieldDrag<Context> {
  input:HTMLInputElement;
  pointerId:number;
  context:Context;
  listeners:AbortController;
  startX:number;
  startY:number;
  pixels:number;
  ticks:number;
  captured:boolean;
}

const intentThreshold=4;

export function useBoneVerticalDrag<Context>(options:VerticalDragOptions<Context>){
  const current=shallowRef<FieldDrag<Context>|null>(null);
  const tracking=computed(()=>current.value!==null);
  const dragging=shallowRef(false);

  function cancel(){
    const held=current.value;
    if(!held)return;
    current.value=null;
    held.listeners.abort();
    if(held.captured&&held.input.hasPointerCapture(held.pointerId))held.input.releasePointerCapture(held.pointerId);
    if(held.captured){
      dragging.value=false;
      options.preview(held.context,null);
    }
  }

  function check(){
    const held=current.value;
    if(held&&(!held.input.isConnected||!options.isCurrent(held.context)))cancel();
  }

  function verticalIntent(held:FieldDrag<Context>,event:PointerEvent){
    const horizontal=Math.abs(event.clientX-held.startX),vertical=Math.abs(event.clientY-held.startY);
    if(Math.max(horizontal,vertical)<intentThreshold)return false;
    if(vertical>horizontal)return true;
    cancel();
    return false;
  }

  function adjust(held:FieldDrag<Context>,event:PointerEvent){
    const pixels=Math.round(held.startY-event.clientY);
    // Accumulate whole hundredths so returning along the same path can cancel exactly.
    held.ticks+=(pixels-held.pixels)*(event.shiftKey?1:10);
    held.pixels=pixels;
    event.preventDefault();
    event.stopPropagation();
    return held.ticks/100;
  }

  function validPointer(held:FieldDrag<Context>,event:PointerEvent,buttons:number){
    if(current.value!==held||event.pointerId!==held.pointerId)return false;
    check();
    if(current.value!==held)return false;
    if(event.buttons===buttons&&!event.altKey&&!event.ctrlKey&&!event.metaKey&&
      Number.isFinite(event.clientX)&&Number.isFinite(event.clientY)&&
      (!held.captured||held.input.hasPointerCapture(held.pointerId)))return true;
    cancel();
    return false;
  }

  function pointerDown(event:PointerEvent,context:Context|null){
    const input=event.currentTarget;
    if(current.value||context===null||!(input instanceof HTMLInputElement)||!input.isConnected||
      event.pointerType!=='mouse'||!event.isPrimary||event.button!==0||event.buttons!==1||
      event.altKey||event.ctrlKey||event.metaKey||!options.isCurrent(context))return;

    const listeners=new AbortController(),signal=listeners.signal;
    const held:FieldDrag<Context>={input,pointerId:event.pointerId,context,listeners,
      startX:event.clientX,startY:event.clientY,pixels:0,ticks:0,captured:false};
    const cancelHeld=()=>{if(current.value===held)cancel();};
    // Preserve native focus and selection until a vertical drag owns the pointer.
    window.addEventListener('pointermove',move=>{
      if(!validPointer(held,move,1))return;
      if(!held.captured){
        if(!verticalIntent(held,move))return;
        try{input.setPointerCapture(held.pointerId);}catch{cancelHeld();return;}
        held.captured=true;
        dragging.value=true;
      }
      options.preview(context,adjust(held,move));
    },{capture:true,signal});
    window.addEventListener('pointerup',up=>{
      if(!validPointer(held,up,0))return;
      if(up.button!==0||!held.captured&&!verticalIntent(held,up)){cancelHeld();return;}
      const delta=adjust(held,up);
      cancelHeld();
      if(delta!==0&&options.isCurrent(context))options.commit(context,delta);
    },{capture:true,signal});
    window.addEventListener('pointercancel',event=>{
      if(event.pointerId===held.pointerId)cancelHeld();
    },{capture:true,signal});
    window.addEventListener('pointerdown',cancelHeld,{capture:true,signal});
    window.addEventListener('keydown',key=>{
      if(current.value!==held||key.key!=='Escape')return;
      if(held.captured){key.preventDefault();key.stopImmediatePropagation();}
      cancelHeld();
    },{capture:true,signal});
    window.addEventListener('blur',cancelHeld,{signal});
    input.addEventListener('blur',cancelHeld,{signal});
    input.addEventListener('dragstart',event=>{
      // Native selected-text dragging can cancel the pointer even after capture is requested.
      if(current.value===held&&held.captured)event.preventDefault();
    },{signal});
    input.addEventListener('lostpointercapture',lost=>{
      if(held.captured&&lost.pointerId===held.pointerId&&!input.hasPointerCapture(held.pointerId))cancelHeld();
    },{signal});
    current.value=held;
  }

  watchEffect(check,{flush:'sync'});
  onScopeDispose(cancel);
  return {pointerDown,cancel,check,tracking,dragging};
}
