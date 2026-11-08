import {test,expect} from './fixtures/browser';
import {spawnSync} from 'node:child_process';
import {readFile} from 'node:fs/promises';

interface ProbeResult {
 status:string;message?:string;renderer?:string;imageKeys:string[];destroyedOldMesh:boolean;
 before:{pixels:Record<string,number[]>;meshVertices:number[];frame:number};
 after:{pixels:Record<string,number[]>;meshVertices:number[];frame:number};
}
test.beforeAll(()=>{
 const built=spawnSync(process.execPath,['scripts/build-runtime-probe.mjs'],{encoding:'utf8'});
 expect(built.status,`${built.stdout}\n${built.stderr}`).toBe(0);
});

test('shipped Pixi runtime renders regions weighted meshes clipping sequences two-color and mesh swaps under production CSP',async({page},info)=>{
 const config=JSON.parse(await readFile('src-tauri/tauri.conf.json','utf8')) as{app:{security:{csp:string}}},csp=config.app.security.csp;
 const bundle=await readFile('.local/runtime-pixi-probe/probe.js'),violations:string[]=[];
 page.on('console',message=>{if(/Content Security Policy|Refused to/.test(message.text()))violations.push(message.text());});
 // The probe uses one external same-origin script, with the exact production
 // policy. No inline script, eval policy, native bridge or editor engine mock.
 await page.route('**/runtime-pixi-probe.html',route=>route.fulfill({status:200,headers:{'content-type':'text/html','content-security-policy':csp},body:'<!doctype html><html><head><meta charset="UTF-8"><title>Own runtime GPU regression</title></head><body><script type="module" src="/runtime-pixi-probe.js"></script></body></html>'}));
 await page.route('**/runtime-pixi-probe.js',route=>route.fulfill({status:200,headers:{'content-type':'text/javascript'},body:bundle}));
 const response=await page.goto('/runtime-pixi-probe.html');expect(response?.headers()['content-security-policy']).toBe(csp);
 await expect.poll(()=>page.evaluate(()=>(window as unknown as{__fbonesRuntimeProbe?:ProbeResult}).__fbonesRuntimeProbe?.status)).toBeTruthy();
 const result=await page.evaluate(()=>(window as unknown as{__fbonesRuntimeProbe:ProbeResult}).__fbonesRuntimeProbe);
 expect(result.status,result.message).toBe('ready');expect(result.renderer).toMatch(/webgl/i);expect(violations).toEqual([]);
 const bg=[16,24,32,255],red=[255,0,0,255],green=[0,255,0,255],cyan=[0,255,255,255];
 expect(result.imageKeys).toEqual(['black','cyan','green','red','seq01','seq02']);expect(result.before.meshVertices).toEqual([4,4]);expect(result.after.meshVertices).toEqual([3,4]);expect(result.destroyedOldMesh).toBe(true);
 for(const image of [result.before,result.after]){
  expect(image.pixels.region).toEqual(red);expect(image.pixels.weightedInside).toEqual(green);expect(image.pixels.clipInside).toEqual(green);expect(image.pixels.clipOutside).toEqual(bg);expect(image.pixels.twoColor).toEqual(green);expect(image.pixels.background).toEqual(bg);
 }
 expect(result.before.pixels.weightedLeft).toEqual(green);expect(result.after.pixels.weightedLeft).toEqual(bg);expect(result.before.pixels.weightedRight).toEqual(bg);expect(result.after.pixels.weightedRight).toEqual(green);
 expect(result.before.pixels.sequence).toEqual([0,0,255,255]);expect(result.after.pixels.sequence).toEqual([255,255,0,255]);expect(result.before.pixels.swapInside).toEqual(red);expect(result.before.pixels.swapOutside).toEqual(red);expect(result.after.pixels.swapInside).toEqual(cyan);expect(result.after.pixels.swapOutside).toEqual(bg);
 await page.screenshot({path:info.outputPath('runtime-pixi-gpu.png')});
 await info.attach('runtime-pixi-pixels',{body:JSON.stringify(result,null,2),contentType:'application/json'});
 const cleanup=await page.evaluate(()=>(window as unknown as{__fbonesRuntimeProbeCleanup():{texturesRetained:boolean}}).__fbonesRuntimeProbeCleanup());expect(cleanup.texturesRetained).toBe(true);
});
