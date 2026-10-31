// Test transport only. Every edit/file operation is executed by the production
// Rust Session in a fresh, headless, feature-gated process, never by a JS model.
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {mkdir, mkdtemp, writeFile} from 'node:fs/promises';
import {join, resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import {deflateSync} from 'node:zlib';

function png(width, height, color) {
  const crc32=bytes=>{let crc=0xffffffff;for(const byte of bytes){crc^=byte;for(let i=0;i<8;i++)crc=(crc>>>1)^(crc&1?0xedb88320:0);}return (crc^0xffffffff)>>>0;};
  const chunk=(name,data)=>{const tag=Buffer.from(name),out=Buffer.alloc(data.length+12);out.writeUInt32BE(data.length);tag.copy(out,4);data.copy(out,8);out.writeUInt32BE(crc32(Buffer.concat([tag,data])),out.length-4);return out;};
  const header=Buffer.alloc(13);header.writeUInt32BE(width);header.writeUInt32BE(height,4);header[8]=8;header[9]=6;
  const rows=Buffer.alloc((width*4+1)*height);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++)rows.set(color,y*(width*4+1)+1+x*4);
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(rows)),chunk('IEND',Buffer.alloc(0))]);
}

export class NativeHost {
  static async create(binary, workspaces) {
    await mkdir(workspaces,{recursive:true});
    const root=await mkdtemp(join(workspaces,'session-'));
    await mkdir(join(root,'images'));
    // Original small generated test assets, no user's/original application's data.
    for(const[name,width,height,color]of[
      ['red',96,96,[232,62,65,255]],['green',96,96,[55,198,100,255]],
      ['blue',96,96,[55,110,225,255]],['board',320,240,[110,113,118,255]],
      ['strip',160,48,[238,192,65,255]],
    ])await writeFile(join(root,'images',name+'.png'),png(width,height,color));
    const child=spawn(binary,['--root',root],{stdio:['pipe','pipe','pipe'],windowsHide:true});
    const host=new NativeHost(child,root);
    try{await host.invoke('e2e_info',{});return host;}
    catch(error){await host.close();throw error;}
  }
  constructor(child,root) {
    this.child=child;this.root=root;this.id=randomUUID();this.token=randomUUID();
    this.serial=0;this.pending=new Map();this.buffer='';this.stderr='';this.closed=false;
    child.stdout.setEncoding('utf8');child.stderr.setEncoding('utf8');
    child.stderr.on('data',data=>{this.stderr=(this.stderr+data).slice(-12000);});
    child.stdout.on('data',data=>{
      this.buffer+=data;
      if(this.buffer.length>32*1024*1024){this.fail(Error('Native test host exceeded the JSONL response limit.'));child.kill('SIGTERM');return;}
      let end;
      while((end=this.buffer.indexOf('\n'))>=0){
        const line=this.buffer.slice(0,end);this.buffer=this.buffer.slice(end+1);
        if(!line.trim())continue;
        let message;try{message=JSON.parse(line);}catch{this.fail(Error('Native test host wrote invalid JSONL.'));continue;}
        const waiting=this.pending.get(message.id);
        if(!waiting){this.fail(Error('Native test host returned an unknown request ID.'));continue;}
        clearTimeout(waiting.timer);this.pending.delete(message.id);
        if(message.error){const error=Error(message.error.message??'Native request failed.');error.code=message.error.code;waiting.reject(error);}
        else waiting.resolve(message.result);
      }
    });
    child.on('error',error=>{this.closed=true;this.fail(error);});
    child.stdin.on('error',error=>this.fail(error));
    child.on('exit',(code,signal)=>{
      this.closed=true;
      this.fail(Error(`Native test host exited (${code??signal}). ${this.stderr}`));
    });
  }
  fail(error){for(const waiting of this.pending.values()){clearTimeout(waiting.timer);waiting.reject(error);}this.pending.clear();}
  invoke(command,args={}) {
    if(this.closed)return Promise.reject(Error('This test session has already closed.'));
    return new Promise((resolve,reject)=>{
      const id=++this.serial,timer=setTimeout(()=>{this.pending.delete(id);reject(Error('Native test request timed out: '+command));},30000);
      this.pending.set(id,{resolve,reject,timer});
      this.child.stdin.write(JSON.stringify({id,command,args})+'\n');
    });
  }
  async close() {
    if(this.closed)return;
    const ended=once(this.child,'exit').catch(()=>{});
    this.child.stdin.end();
    const timeout=setTimeout(()=>{if(!this.closed)this.child.kill('SIGTERM');},5000);
    try{await ended;}finally{clearTimeout(timeout);this.closed=true;}
  }
}

export const defaultNativeBinary=resolve(process.env.CARGO_TARGET_DIR??'target','debug',process.platform==='win32'?'fbones-e2e-host.exe':'fbones-e2e-host');
