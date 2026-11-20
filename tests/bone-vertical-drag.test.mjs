import {test} from 'node:test';
import assert from 'node:assert/strict';
import {effectScope,shallowRef} from 'vue';
import {useBoneVerticalDrag} from '../src/composables/useBoneVerticalDrag.ts';

class PointerTarget extends EventTarget {
  latest=new Map();
  addEventListener(type,listener,options){
    this.latest.set(type,listener);
    super.addEventListener(type,listener,options);
  }
}

class NumericInput extends PointerTarget {
  isConnected=true;
  captured=new Set();
  setPointerCapture(id){this.captured.add(id);}
  releasePointerCapture(id){this.captured.delete(id);}
  hasPointerCapture(id){return this.captured.has(id);}
}

const pointerId=9;
function pointer(type,clientY,{clientX=40,shiftKey=false}={}){
  return Object.assign(new Event(type,{cancelable:true}),{
    pointerId,pointerType:'mouse',isPrimary:true,button:0,buttons:type==='pointerup'?0:1,
    clientX,clientY,shiftKey,ctrlKey:false,metaKey:false,altKey:false,
  });
}

function fixture(t){
  const window=new PointerTarget(),input=new NumericInput(),scope=effectScope();
  const previousWindow=globalThis.window,previousInput=globalThis.HTMLInputElement;
  globalThis.window=window;
  globalThis.HTMLInputElement=NumericInput;
  t.after(()=>{
    scope.stop();
    globalThis.window=previousWindow;
    globalThis.HTMLInputElement=previousInput;
  });
  const context=shallowRef({bone:4,frame:12}),previews=[],writes=[];
  const drag=scope.run(()=>useBoneVerticalDrag({
    isCurrent:captured=>captured===context.value,
    preview:(captured,delta)=>previews.push({context:captured,delta}),
    commit:(captured,delta)=>writes.push({context:captured,delta}),
  }));
  function press(){
    const event=pointer('pointerdown',100);
    Object.defineProperty(event,'currentTarget',{value:input});
    drag.pointerDown(event,context.value);
    return event;
  }
  const dispatch=(type,y,options)=>window.dispatchEvent(pointer(type,y,options));
  return {window,input,context,previews,writes,drag,press,dispatch};
}

test('a vertical release with no intervening move can authorize one adjustment',t=>{
  const {window,input,context,writes,drag,press,dispatch}=fixture(t);
  assert.equal(press().defaultPrevented,false);
  assert.equal(drag.tracking.value,true);
  assert.equal(drag.dragging.value,false);
  const oldRelease=window.latest.get('pointerup');
  dispatch('pointerup',84);
  assert.deepEqual(writes,[{context:context.value,delta:1.6}]);
  assert.equal(input.hasPointerCapture(pointerId),false);
  assert.equal(drag.tracking.value,false);
  oldRelease(pointer('pointerup',65));
  assert.equal(writes.length,1);
});

test('obsolete callbacks and capture events cannot affect a reused pointer',t=>{
  const {window,input,context,writes,drag,press,dispatch}=fixture(t);
  press();
  dispatch('pointermove',90);
  assert.equal(input.hasPointerCapture(pointerId),true);
  const oldMove=window.latest.get('pointermove'),oldRelease=window.latest.get('pointerup');

  context.value={bone:4,frame:13};
  assert.equal(drag.tracking.value,false);
  assert.equal(input.hasPointerCapture(pointerId),false);
  press();
  oldMove(pointer('pointermove',80));
  oldRelease(pointer('pointerup',80));
  assert.equal(drag.tracking.value,true);
  assert.equal(drag.dragging.value,false);
  assert.deepEqual(writes,[]);

  dispatch('pointermove',90);
  input.dispatchEvent(pointer('lostpointercapture',90));
  assert.equal(drag.dragging.value,true, 'a stale loss cannot cancel a live capture');
  input.releasePointerCapture(pointerId);
  input.dispatchEvent(pointer('lostpointercapture',90));
  assert.equal(drag.tracking.value,false);
  dispatch('pointerup',80);
  assert.deepEqual(writes,[]);
});

test('mixed coarse and fine drag segments return exactly to baseline',t=>{
  const {previews,writes,drag,press,dispatch}=fixture(t);
  press();
  dispatch('pointermove',90);
  assert.equal(previews.at(-1).delta,1);
  for(let y=91;y<=190;y++)dispatch('pointermove',y,{shiftKey:true});
  assert.equal(previews.at(-1).delta,0);
  dispatch('pointerup',190,{shiftKey:true});
  assert.equal(drag.tracking.value,false);
  assert.deepEqual(writes,[]);
});
