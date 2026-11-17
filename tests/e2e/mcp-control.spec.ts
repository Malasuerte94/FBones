import {test,expect} from './fixtures/browser';

// Transport fixture: real DOM/CSP and lifecycle controls, not a native socket
// or OS clipboard claim. Native MCP protocol has separate integration checks.
test('MCP configuration, AI lock and both stop routes remain accessible',async({page})=>{
 await page.addInitScript(()=>{
  let enabled=false;
  const listeners=new Map<string,(event:{payload:unknown})=>void>();
  const own=globalThis as typeof globalThis&{__TAURI__?:unknown;__mcpCalls:string[];__mcpEmit:()=>void;__mcpClipboard:string;__mcpReadiness:{ready:boolean;inert:boolean}[]};
  own.__mcpCalls=[];own.__mcpClipboard='';
  own.__mcpReadiness=[];
  Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async(value:string)=>{own.__mcpClipboard=value;}}});
  own.__mcpEmit=()=>listeners.get('mcp-project-changed')?.({payload:null});
  own.__TAURI__={core:{invoke:async(command:string,args?:{ready?:boolean})=>{
   own.__mcpCalls.push(command);
   if(command==='mcp_set_ready'){own.__mcpReadiness.push({ready:args?.ready===true,inert:document.querySelector('main')?.inert??false});return null;}
   if(command==='get_project'||command==='frontend_ready')return null;
   if(command==='mcp_start')enabled=true;
   if(command==='mcp_stop')enabled=false;
   if(command.startsWith('mcp_'))return{enabled,url:enabled?'http://127.0.0.1:54123/mcp':null,token:enabled?'own-ui-test-token':null};
   throw Error('Unexpected MCP fixture command '+command);
  }},event:{listen:async(name:string,handler:(event:{payload:unknown})=>void)=>{listeners.set(name,handler);return()=>listeners.delete(name);}},window:{getCurrentWindow:()=>({setTitle:async(title:string)=>{document.title=title;},onCloseRequested:async()=>()=>{},destroy:async()=>{}})}};
 });
 await page.goto('/');await expect(page.getByTestId('viewport').locator('canvas')).toBeVisible();
 await page.getByTestId('mcp-toggle').click();const dialog=page.getByRole('dialog',{name:'MCP',exact:true});
 await expect(page.getByTestId('mcp-status')).toHaveText('Stopped');await page.getByTestId('mcp-start').click();
 await expect(page.getByTestId('mcp-status')).toContainText('Running');await expect.poll(()=>page.locator('main').evaluate(node=>(node as HTMLElement).inert)).toBe(true);
 await expect.poll(()=>page.evaluate(()=>(globalThis as typeof globalThis&{__mcpReadiness:{ready:boolean;inert:boolean}[]}).__mcpReadiness.at(-1))).toEqual({ready:true,inert:true});
 await expect(page.getByTestId('mcp-stop')).toBeEnabled();
 expect(await page.getByTestId('mcp-stop').evaluate(node=>node.closest('[inert]')===null)).toBe(true);
 await expect(page.getByTestId('mcp-config')).toHaveValue(/own-ui-test-token/);
 await page.getByTestId('mcp-copy').click();await expect(page.getByTestId('mcp-copy')).toHaveText('Copied');
 expect(await page.evaluate(()=>(globalThis as typeof globalThis&{__mcpClipboard:string}).__mcpClipboard)).toContain('Bearer own-ui-test-token');
 await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);const banner=page.getByTestId('mcp-active-banner');await expect(banner).toBeVisible();
 await banner.getByRole('button',{name:'Stop MCP',exact:true}).click();await expect(banner).toHaveCount(0);await expect.poll(()=>page.locator('main').evaluate(node=>(node as HTMLElement).inert)).toBe(false);
 await page.getByTestId('mcp-toggle').click();await page.getByTestId('mcp-start').click();
 await page.evaluate(()=>(globalThis as typeof globalThis&{__mcpEmit:()=>void}).__mcpEmit());
 await expect.poll(()=>page.evaluate(()=>(globalThis as typeof globalThis&{__mcpCalls:string[]}).__mcpCalls.filter(command=>command==='get_project').length)).toBe(3);
 await page.getByTestId('mcp-stop').click();await expect(page.getByTestId('mcp-status')).toHaveText('Stopped');
 await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);await expect(page.getByTestId('mcp-toggle')).toBeFocused();
});

test('MCP browser preview clearly requires desktop and cannot start',async({page})=>{
 await page.goto('/');await page.getByTestId('mcp-toggle').click();
 await expect(page.getByTestId('mcp-status')).toHaveText('MCP is available in the desktop application.');
 await expect(page.getByTestId('mcp-start')).toBeDisabled();await expect(page.getByTestId('mcp-config')).toHaveCount(0);
});
