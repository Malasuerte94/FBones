import {test} from 'node:test';
import assert from 'node:assert/strict';
import {setImmediate as turn} from 'node:timers/promises';
import {EventAudioPlayer} from '../src/domain/eventAudio.ts';

// Lifecycle/budget units only. These stubs never decode or render audio; actual
// PCM decoding, mixing and source startup are verified in the browser UI test.
const sound={key:'tone.wav',channels:1,sampleRate:8000,frames:1600000,duration:200,peak:.25};
function audioContext(value){const previous=Object.getOwnPropertyDescriptor(globalThis,'AudioContext');Object.defineProperty(globalThis,'AudioContext',{value,configurable:true});return()=>{if(previous)Object.defineProperty(globalThis,'AudioContext',previous);else delete globalThis.AudioContext;};}
test('pending audio reservations survive document reset, reject excess work and release after stale errors',async()=>{
 const restore=audioContext(class{state='running';sampleRate=48000;});
 let rejectOld,loads=0;
 const player=new EventAudioPlayer(async()=>{loads++;if(loads===1)return new Promise((_resolve,reject)=>{rejectOld=reject;});throw Error('Retry reached native loader');});
 try{
  const old=player.play(1,sound,1,0);await turn();assert.equal(loads,1);
  player.reset(2);await assert.rejects(player.play(2,sound,1,0),/buffer budget/);assert.equal(loads,1,'The second generation must not start another decode');
  rejectOld(Error('Old document load failed'));assert.equal(await old,null,'A stale load failure cannot become a current UI error');
  await assert.rejects(player.play(2,sound,1,0),/Retry reached native loader/);assert.equal(loads,2,'Settled work released its global reservation');
 }finally{player.stop();restore();}
});
test('document replacement while audio unlock is pending cannot start a stale resource load',async()=>{
 let resume,loads=0;
 const restore=audioContext(class{state='suspended';sampleRate=48000;resume(){return new Promise(resolve=>{resume=()=>{this.state='running';resolve();};});}});
 const player=new EventAudioPlayer(async()=>{loads++;throw Error('Must not load');});
 try{const pending=player.play(1,sound,1,0);player.reset(2);resume();assert.equal(await pending,null);assert.equal(loads,0);}finally{player.stop();restore();}
});
