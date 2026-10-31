import type {AudioSound} from './project.ts';

export interface AudioReceipt {key:string;channels:number;sampleRate:number;frames:number;peak:number;volume:number;balance:number;contextState:AudioContextState;sourceStarted:true}
const MAX_DECODED_BYTES=64*1024*1024;
/** Offline native WAV bytes feed WebAudio directly, without network requests,
 * media elements, CSP changes or a second audio-file parser. Preview policy:
 * pan follows WebAudio's [-1,1] range; at most64 simultaneous voices. */
export class EventAudioPlayer {
 private context:AudioContext|null=null;
 private documentId:number|null=null;
 private generation=0;
 private reserved=0;
 private cached=new Map<string,{buffer:AudioBuffer;bytes:number;peak:number}>();
 private pending=new Map<string,Promise<{buffer:AudioBuffer;bytes:number;peak:number}>>();
 private voices=new Set<AudioBufferSourceNode>();
 private load:(documentId:number,key:string)=>Promise<string>;
 constructor(load:(documentId:number,key:string)=>Promise<string>){this.load=load;}
 get supported(){return typeof AudioContext!=='undefined';}
 reset(documentId:number|null){if(this.documentId===documentId)return;this.stop();this.documentId=documentId;this.cached.clear();this.pending.clear();}
 unlock():Promise<void>{
  if(!this.supported)return Promise.reject(new Error('Audio playback is unavailable in this viewport.'));
  this.context??=new AudioContext();return this.context.state==='running'?Promise.resolve():this.context.resume();
 }
 stop(){this.generation++;for(const source of this.voices){try{source.stop();}catch{/* an ended source is already silent */}}this.voices.clear();}
 private usedBytes(){const buffers=new Set([...this.cached.values()].map(value=>value.buffer));for(const source of this.voices)if(source.buffer)buffers.add(source.buffer);return[...buffers].reduce((sum,buffer)=>sum+buffer.length*buffer.numberOfChannels*4,0);}
 private async buffer(documentId:number,sound:AudioSound){
  const cached=this.cached.get(sound.key);if(cached)return cached;
  const pending=this.pending.get(sound.key);if(pending)return pending;
  const context=this.context!,generation=this.generation;
  const estimate=Math.ceil(sound.duration*context.sampleRate+2)*sound.channels*4;
  if(!Number.isSafeInteger(estimate)||estimate<0||estimate>MAX_DECODED_BYTES||this.reserved+estimate>MAX_DECODED_BYTES)throw new Error('Audio preview exceeds its decoded buffer budget.');
  for(const[key,value]of this.cached){if(this.usedBytes()+this.reserved+estimate<=MAX_DECODED_BYTES)break;if(![...this.voices].some(source=>source.buffer===value.buffer))this.cached.delete(key);}
  if(this.usedBytes()+this.reserved+estimate>MAX_DECODED_BYTES)throw new Error('Audio preview exceeds its decoded buffer budget.');
  this.reserved+=estimate;
  const work=(async()=>{
   const data=await this.load(documentId,sound.key),prefix='data:audio/wav;base64,';
   if(!data.startsWith(prefix))throw new Error('Native audio returned an unsupported resource.');
   const encoded=atob(data.slice(prefix.length)),bytes=new Uint8Array(encoded.length);for(let i=0;i<bytes.length;i++)bytes[i]=encoded.charCodeAt(i);
   const buffer=await context.decodeAudioData(bytes.buffer),size=buffer.length*buffer.numberOfChannels*4;
   if(size>MAX_DECODED_BYTES)throw new Error('Audio preview exceeds its decoded buffer budget.');
   let peak=0;for(let channel=0;channel<buffer.numberOfChannels;channel++)for(const sample of buffer.getChannelData(channel)){if(!Number.isFinite(sample))throw new Error('Audio decoder returned a nonfinite sample.');peak=Math.max(peak,Math.abs(sample));}
   const value={buffer,bytes:size,peak};
   if(this.documentId===documentId&&this.generation===generation)this.cached.set(sound.key,value);
   return value;
  })();
  this.pending.set(sound.key,work);
  try{return await work;}finally{this.reserved-=estimate;if(this.documentId===documentId&&this.pending.get(sound.key)===work)this.pending.delete(sound.key);}
 }
 async play(documentId:number,sound:AudioSound,volume:number,balance:number):Promise<AudioReceipt|null>{
  this.reset(documentId);const generation=this.generation;
  try{
  await this.unlock();
  if(this.documentId!==documentId||this.generation!==generation)return null;
  if(this.context?.state!=='running')throw new Error('Audio playback is suspended.');
  const decoded=await this.buffer(documentId,sound);
  if(this.documentId!==documentId||this.generation!==generation)return null;
  const context=this.context!,source=context.createBufferSource(),gain=context.createGain(),pan=context.createStereoPanner();
  source.buffer=decoded.buffer;gain.gain.value=volume;pan.pan.value=Math.max(-1,Math.min(1,balance));source.connect(gain);gain.connect(pan);pan.connect(context.destination);
  while(this.voices.size>=64){const oldest=this.voices.values().next().value!;try{oldest.stop();}catch{/* already ended */}this.voices.delete(oldest);}
  this.voices.add(source);source.onended=()=>{this.voices.delete(source);source.disconnect();gain.disconnect();pan.disconnect();};source.start();
  return{key:sound.key,channels:decoded.buffer.numberOfChannels,sampleRate:decoded.buffer.sampleRate,frames:decoded.buffer.length,peak:decoded.peak,volume:gain.gain.value,balance:pan.pan.value,contextState:context.state,sourceStarted:true};
  }catch(error){if(this.documentId!==documentId||this.generation!==generation)return null;throw error;}
 }
}
