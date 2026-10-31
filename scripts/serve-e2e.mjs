// Serve the real built frontend with its exact desktop CSP. Native-test RPC is
// called by the Playwright fixture, outside the page; no CSP relaxation needed.
import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {resolve,extname,relative,sep} from 'node:path';
import {NativeHost,defaultNativeBinary} from './e2e/native-host.mjs';
import {stringifyNativeResponse} from './e2e/native-response.mjs';

const root=resolve('dist'),port=Number(process.env.FBONES_E2E_PORT??4173);
if(!Number.isInteger(port)||port<1024||port>65535)throw Error('Choose a valid FBONES_E2E_PORT between1024 and65535.');
const origin=`http://127.0.0.1:${port}`;
const config=JSON.parse(await readFile('src-tauri/tauri.conf.json','utf8'));
const csp=config.app.security.csp;
await stat(resolve(root,'index.html'));
const sessions=new Map();
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2'};
function json(response,status,value){response.writeHead(status,{'content-type':'application/json','cache-control':'no-store'});response.end(stringifyNativeResponse(value));}
async function body(request){let bytes=0;const chunks=[];for await(const chunk of request){bytes+=chunk.length;if(bytes>2*1024*1024)throw Error('Test request exceeds2MiB.');chunks.push(chunk);}return JSON.parse(Buffer.concat(chunks).toString('utf8')||'{}');}
async function nativeRequest(request,response,path){
  if(request.headers.origin&&request.headers.origin!==origin){json(response,403,{error:{code:'OriginRejected',message:'Only the local test origin is accepted.'}});return;}
  if(path==='/__e2e/session'&&request.method==='POST'){
    await body(request);
    if(sessions.size>=8){json(response,429,{error:{code:'SessionLimit',message:'Close completed test sessions before creating another.'}});return;}
    const host=await NativeHost.create(process.env.FBONES_E2E_HOST??defaultNativeBinary,resolve('.local/playwright/workspaces'));
    sessions.set(host.id,host);json(response,201,{id:host.id,token:host.token});return;
  }
  const host=sessions.get(request.headers['x-fbones-session']);
  if(!host||request.headers['x-fbones-token']!==host.token){json(response,403,{error:{code:'SessionRejected',message:'An explicitly owned test session is required.'}});return;}
  if(path==='/__e2e/session'&&request.method==='DELETE'){
    sessions.delete(host.id);await host.close();json(response,200,{closed:true});return;
  }
  if(path==='/__e2e/rpc'&&request.method==='POST'){
    const {command,args={}}=await body(request);
    if(typeof command!=='string'||args===null||typeof args!=='object'||Array.isArray(args))throw Error('Expected a command name and argument object.');
    try{json(response,200,{result:await host.invoke(command,args)});}
    catch(error){json(response,200,{error:{code:error.code??'TestHostFailure',message:error.message}});}
    return;
  }
  json(response,404,{error:{code:'NotFound',message:'Unknown test endpoint.'}});
}
const server=createServer(async(request,response)=>{
  response.setHeader('Content-Security-Policy',csp);response.setHeader('X-Content-Type-Options','nosniff');
  try{
    if(request.headers.host!==`127.0.0.1:${port}`){json(response,403,{error:'Unexpected test host.'});return;}
    const path=decodeURIComponent(new URL(request.url,origin).pathname);
    if(path==='/__e2e/health'&&request.method==='GET'){json(response,200,{suite:'fbones-playwright',csp:'production',nativeTransport:'real-rust-session'});return;}
    if(path.startsWith('/__e2e/')){await nativeRequest(request,response,path);return;}
    if(!['GET','HEAD'].includes(request.method)){response.writeHead(405);response.end();return;}
    const file=resolve(root,'.'+(path==='/'?'/index.html':path));
    const local=relative(root,file);
    if(local==='..'||local.startsWith('..'+sep)||local.includes('\0')){response.writeHead(403);response.end();return;}
    const bytes=await readFile(file);
    response.writeHead(200,{'Content-Type':mime[extname(file)]??'application/octet-stream','Cache-Control':'no-store'});
    response.end(request.method==='HEAD'?undefined:bytes);
  }catch(error){if(!response.headersSent)json(response,error.code==='ENOENT'?404:500,{error:{code:'TestServerFailure',message:error.message}});else response.end();}
});
server.listen(port,'127.0.0.1',()=>console.log(`FBones Playwright server ready at ${origin}; production CSP; isolated Rust sessions.`));
let stopping=false;
async function stop(){if(stopping)return;stopping=true;server.close();await Promise.allSettled([...sessions.values()].map(host=>host.close()));process.exit(0);}
process.on('SIGINT',stop);process.on('SIGTERM',stop);
