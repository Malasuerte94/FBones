import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createBoneWheelBurst} from '../src/domain/boneWheelBurst.ts';

function fixture(t,ticksPerUnit){
  const timers=[],changes=[],writes=[];
  t.mock.method(globalThis,'setTimeout',(run,delay)=>{
    const timer={run,delay,canceled:false};
    timers.push(timer);
    return timer;
  });
  t.mock.method(globalThis,'clearTimeout',timer=>{if(timers.includes(timer))timer.canceled=true;});
  const state={stamp:1};
  const burst=createBoneWheelBurst({
    isCurrent:context=>context.stamp===state.stamp,
    matches:(started,current)=>started.field===current.field&&started.stamp===current.stamp,
    changed:value=>changes.push(value),
    commit:async (context,value)=>{writes.push({context,value});return true;},
    ticksPerUnit,
  });
  return {burst,timers,changes,writes,state};
}

test('a wheel burst captures one baseline and dispatches once on idle or explicit flush',async t=>{
  const {burst,timers,changes,writes}=fixture(t);
  const context={field:'x',stamp:1};
  assert.equal(burst.step(context,4.25,1),true);
  assert.equal(burst.step({...context},19,-.125),true);
  assert.equal(timers[1].delay,140);
  assert.equal(timers[0].canceled,true);
  timers[0].run();
  assert.deepEqual(writes,[]);
  assert.deepEqual(changes,[{context,value:5.25},{context,value:5.125}]);

  timers[1].run();
  assert.deepEqual(writes,[{context,value:5.125}]);
  assert.equal(changes.at(-1),null);
  assert.equal(await burst.flush(),true);

  assert.equal(burst.step(context,5.125,1),true);
  timers[1].run();
  assert.equal(writes.length,1);
  assert.equal(await burst.flush(),true);
  assert.equal(timers[2].canceled,true);
  timers[2].run();
  assert.deepEqual(writes,[{context,value:5.125},{context,value:6.125}]);
});

test('return to baseline, cancellation and stale contexts discard pending wheel edits',async t=>{
  const {burst,timers,changes,writes,state}=fixture(t,10);
  const prior={field:'x',stamp:1};
  assert.equal(burst.step(prior,0,10),true);
  for(let tick=0;tick<10;tick++)assert.equal(burst.step(prior,0,-1),true);
  assert.equal(changes.at(-1).value,0);
  assert.equal(await burst.flush(),true);
  assert.deepEqual(writes,[]);

  assert.equal(burst.step(prior,8,1),true);
  burst.cancel();
  timers.at(-1).run();
  assert.equal(changes.at(-1),null);
  assert.deepEqual(writes,[]);

  assert.equal(burst.step(prior,8,1),true);
  state.stamp=2;
  timers.at(-1).run();
  assert.deepEqual(writes,[]);

  const next={field:'y',stamp:2};
  assert.equal(burst.step(next,5,1),true);
  state.stamp=3;
  burst.check();
  assert.equal(changes.at(-1),null);
  assert.equal(timers.at(-1).canceled,true);
  timers.at(-1).run();
  assert.deepEqual(writes,[]);
});
