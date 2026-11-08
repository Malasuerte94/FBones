import {spawn} from 'node:child_process';
import {existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {defaultNativeBinary} from './e2e/native-host.mjs';

const options=process.argv.slice(2),skipBuild=options.includes('--no-build'),browserOnly=options.includes('--browser-only');
const forwarded=options.filter(option=>!['--no-build','--browser-only'].includes(option));
const env={...process.env,FBONES_E2E_HOST:process.env.FBONES_E2E_HOST??defaultNativeBinary};
async function run(command,args){return new Promise((resolve,reject)=>{const child=spawn(command,args,{stdio:'inherit',env});child.on('error',reject);child.on('exit',(code,signal)=>code===0?resolve():reject(Error(`${command} failed (${code??signal}).`)));});}
try{
  if(!skipBuild){
    // The shipped-runtime GPU case imports its distributable ESM bundle. A
    // clean checkout has no ignored package dist/, so build it before serving.
    await run('pnpm',['build:runtime']);
    await run('pnpm',['build:web']);
    if(!browserOnly){
      if(!env.CARGO_HOME&&existsSync('.tools/cargo'))env.CARGO_HOME=resolve('.tools/cargo');
      await run('cargo',['build','-p','fbones-desktop','--features','e2e-host','--bin','fbones-e2e-host','--offline']);
    }
  }
  await run('pnpm',['typecheck:ui']);
  if(browserOnly)forwarded.push('--grep-invert','@native');
  await run('pnpm',['exec','playwright','test',...forwarded]);
}catch(error){console.error(error.message);process.exitCode=1;}
