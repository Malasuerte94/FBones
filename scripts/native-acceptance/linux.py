"""Stock installed GTK capability on an isolated Xvfb/DBus hosted runner only."""
import base64,ctypes,hashlib,json,os,re,shutil,subprocess,sys,time,urllib.request
from pathlib import Path
root=Path(sys.argv[1]).resolve();route=sys.argv[2];report={'passed':False,'stage':'capability-only','route':route,'upgradeAttempted':False,'normalClose':False};driver=None;session=None;pid=None;start=None
require=lambda yes,message:None if yes else (_ for _ in ()).throw(ValueError(message))
def command(*a):return subprocess.check_output(a,text=True).strip()
def rpc(method,path,payload=None):
 data=None if payload is None else json.dumps(payload).encode();request=urllib.request.Request('http://127.0.0.1:9515'+path,data=data,method=method,headers={'Content-Type':'application/json'})
 with urllib.request.urlopen(request,timeout=35)as response:body=json.load(response)
 value=body.get('value');require(not isinstance(value,dict)or'error'not in value,'Native WebDriver error: '+str(value));return value
def script(code):return rpc('POST','/session/'+session+'/execute/sync',{'script':code,'args':[]})
def wait(fn,seconds=30):
 end=time.monotonic()+seconds
 while time.monotonic()<end:
  try:v=fn()
  except (ConnectionError,urllib.error.URLError,ValueError):v=None
  if v:return v
  time.sleep(.2)
 raise TimeoutError('Bounded native readiness/control probe failed')
def children(parent):
 result=[];queue=[parent]
 while queue and len(result)<512:
  current=queue.pop();p=Path('/proc')/str(current)/'task'/str(current)/'children'
  try:found=[int(v)for v in p.read_text().split()]
  except FileNotFoundError:continue
  result.extend(found);queue.extend(found)
 return result
def identity(p):
 text=(Path('/proc')/str(p)/'stat').read_text();return text[text.rfind(')')+2:].split()[19]
def own_window(p):
 tree=command('xwininfo','-root','-tree')
 for h in re.findall(r'^\s*(0x[0-9a-f]+)\s+',tree,re.M):
  try:prop=command('xprop','-id',h,'_NET_WM_PID')
  except subprocess.CalledProcessError:continue
  if re.search(r'=\s*'+str(p)+r'\s*$',prop)and'Map State: IsViewable'in command('xwininfo','-id',h):return h
 return None
def close_window(h):
 # Exact owned-window WM_DELETE_WINDOW, never global keyboard/focus or XKillClient.
 class Data(ctypes.Union):_fields_=[('b',ctypes.c_char*20),('s',ctypes.c_short*10),('l',ctypes.c_long*5)]
 class Client(ctypes.Structure):_fields_=[('type',ctypes.c_int),('serial',ctypes.c_ulong),('send',ctypes.c_int),('display',ctypes.c_void_p),('window',ctypes.c_ulong),('message',ctypes.c_ulong),('format',ctypes.c_int),('data',Data)]
 class Event(ctypes.Union):_fields_=[('client',Client),('pad',ctypes.c_long*24)]
 x=ctypes.CDLL('libX11.so.6');x.XOpenDisplay.argtypes=[ctypes.c_char_p];x.XOpenDisplay.restype=ctypes.c_void_p;x.XInternAtom.argtypes=[ctypes.c_void_p,ctypes.c_char_p,ctypes.c_int];x.XInternAtom.restype=ctypes.c_ulong;x.XSendEvent.argtypes=[ctypes.c_void_p,ctypes.c_ulong,ctypes.c_int,ctypes.c_long,ctypes.POINTER(Event)];x.XFlush.argtypes=[ctypes.c_void_p];x.XCloseDisplay.argtypes=[ctypes.c_void_p]
 display=x.XOpenDisplay(None);require(display,'Own X display unavailable')
 try:
  event=Event();event.client.type=33;event.client.display=display;event.client.window=int(h,16);event.client.message=x.XInternAtom(display,b'WM_PROTOCOLS',0);event.client.format=32;event.client.data.l[0]=x.XInternAtom(display,b'WM_DELETE_WINDOW',0)
  require(x.XSendEvent(display,int(h,16),0,0,ctypes.byref(event))!=0,'Scoped WM_DELETE_WINDOW send failed');x.XFlush(display)
 finally:x.XCloseDisplay(display)
try:
 require(os.environ.get('GITHUB_ACTIONS')=='true'and os.environ.get('RUNNER_ENVIRONMENT')=='github-hosted'and os.environ.get('RUNNER_OS')=='Linux','Ephemeral hosted Linux only')
 require(root.is_relative_to(Path(os.environ['RUNNER_TEMP']).resolve())and route in['linux-deb','linux-appimage'],'Private Linux route/root required')
 stock=json.loads((root/'reports/stock-package.json').read_text());require(stock['route']==route,'Wrong stock route');package=root/stock['asset']['name'];require(hashlib.sha256(package.read_bytes()).hexdigest()==stock['asset']['sha256'],'Stock package changed')
 if route=='linux-deb':
  installed=subprocess.run(['dpkg-query','-W','-f=${db:Status-Status}','f-bones'],capture_output=True,text=True);require(installed.returncode!=0 or installed.stdout!='installed','Fresh runner already has FBones')
  subprocess.run(['sudo','-n','dpkg','-i',str(package)],check=True);require(command('dpkg-query','-W','-f=${Version} ${Architecture}','f-bones')=='0.9.5 amd64','Actual dpkg installation/version failed');binary=Path('/usr/bin/fbones');report['installation']={'stockDpkgInstalled':True,'package':'f-bones','version':'0.9.5','architecture':'amd64'}
 else:
  install=root/'installed';install.mkdir();binary=install/'FBones.AppImage';package.rename(binary);binary.chmod(0o755);require(Path('/dev/fuse').exists(),'Native AppImage FUSE provider unavailable; no extract-and-run fallback');report['installation']={'nativeExecutableAppImage':True,'version':'0.9.5','packageSha256':stock['asset']['sha256']}
 os.environ['TAURI_WEBVIEW_AUTOMATION']='true';os.environ['GDK_BACKEND']='x11';os.environ['LIBGL_ALWAYS_SOFTWARE']='1'
 # Keep stock runtime/profile in fresh per-job directories, without overriding updater URLs/keys.
 for name,subdir in [('XDG_DATA_HOME','data'),('XDG_CONFIG_HOME','config'),('XDG_CACHE_HOME','cache'),('TMPDIR','tmp')]:
  p=root/subdir;p.mkdir();os.environ[name]=str(p)
 wrapper=Path(__file__).resolve().parent/'linux-launch.py';wrapper.chmod(0o755);(root/'launch-input.json').write_text(json.dumps({'image':str(binary),'route':route}));os.environ['FBONES_NATIVE_ROOT']=str(root)
 driver=subprocess.Popen(['WebKitWebDriver','--host=127.0.0.1','--port=9515'],stdin=subprocess.DEVNULL,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
 wait(lambda:rpc('GET','/status').get('ready'));session=rpc('POST','/session',{'capabilities':{'alwaysMatch':{'browserName':'wry','webkitgtk:browserOptions':{'binary':str(wrapper),'args':[]}}}})['sessionId']
 def find_app():
  candidates=[]
  for p in children(driver.pid):
   try:
    if hashlib.sha256((Path('/proc')/str(p)/'exe').read_bytes()).hexdigest()==stock['executableSha256']:candidates.append(p)
   except (FileNotFoundError,PermissionError,ProcessLookupError):pass
  return candidates[0]if len(candidates)==1 else None
 pid=wait(find_app);start=identity(pid);bound=wait(lambda:json.loads((root/'reports/app-lifecycle-bound.json').read_text())if(root/'reports/app-lifecycle-bound.json').exists()else None);require(bound['processId']==pid and bound['creationStartTicks']==start and bound['wrapperPid']in children(driver.pid)and bound['imageIdentityVerified']and bound['actualExecutableSha256']==stock['executableSha256'],'Own retained launcher does not bind exact stock native app');h=wait(lambda:own_window(pid));report['native']={'processId':pid,'creationStartTicks':start,'window':h,'visible':True,'installedExecutableSha256':stock['executableSha256'],'display':os.environ['DISPLAY'],'provider':'stock-GTK-WebKitWebDriver'}
 before=wait(lambda:script("const c=document.querySelector('[data-testid=viewport] canvas'),t=document.querySelector('[data-testid=app-updates-toggle]');return c&&c.width>0&&t&&document.body.innerText.includes('0.9.5')&&!document.body.innerText.includes('The viewport could not start.')&&!document.body.innerText.includes('Opening workspace…')?{url:location.href,version:'0.9.5',canvas:{width:c.width,height:c.height},expanded:t.getAttribute('aria-expanded'),phase:document.querySelector('[data-testid=app-updater]')?.dataset.phase,panel:document.querySelector('[data-testid=app-update-panel]')?.innerText??null,firstInstaller:!!document.querySelector('[data-testid=app-update-first-installer]')}:null"));require(before['phase']!='unsupported','Installed stock GTK updater reports unsupported')
 element=rpc('POST','/session/'+session+'/element',{'using':'css selector','value':'[data-testid=app-updates-toggle]'});eid=element['element-6066-11e4-a52e-4f735466cecf'];rpc('POST','/session/'+session+'/element/'+eid+'/click',{})
 after=wait(lambda:script("const t=document.querySelector('[data-testid=app-updates-toggle]');return t&&t.getAttribute('aria-expanded')!=="+json.dumps(before['expanded'])+"?{expanded:t.getAttribute('aria-expanded'),panel:document.querySelector('[data-testid=app-update-panel]')?.innerText??null,phase:document.querySelector('[data-testid=app-updater]')?.dataset.phase,firstInstaller:!!document.querySelector('[data-testid=app-update-first-installer]')}:null"))
 panel='\n'.join(v for v in[before.get('panel'),after.get('panel')]if isinstance(v,str));require(re.search(r'Current\s+version:\s*0\.9\.5\b',panel)and not before['firstInstaller']and not after['firstInstaller']and after['phase']!='unsupported','Actual native Updates labels/support unproven')
 png=base64.b64decode(rpc('GET','/session/'+session+'/screenshot'),validate=True);require(len(png)<=4*1024*1024 and png.startswith(bytes.fromhex('89504e470d0a1a0a')),'Native GTK screenshot bound/format');(root/'reports/frontend.png').write_bytes(png);(root/'reports/frontend.json').write_text(json.dumps({'passed':True,'before':before,'after':after,'oneUpdatesToggle':True,'upgradeAttempted':False},indent=2)+'\n')
 require(identity(pid)==start and own_window(pid)==h,'Owned native identity changed before close');close_window(h);wait(lambda:not(Path('/proc')/str(pid)).exists(),20);terminal=wait(lambda:json.loads((root/'reports/app-lifecycle.json').read_text())if(root/'reports/app-lifecycle.json').exists()else None,5);require(terminal['processId']==pid and terminal['creationStartTicks']==start and terminal['actualExecutableSha256']==stock['executableSha256']and terminal['terminalObserved']and terminal['terminationKind']=='exit'and terminal['exitCode']==0,'Actual stock native app normal exit0 unproven');report['normalClose']=True;report['terminal']=terminal;report['passed']=True
except Exception as error:report['error']=type(error).__name__+': '+str(error)
finally:
 # Stop only our controller after its app exited; never force the native app.
 if driver and driver.poll()is None and (pid is not None and not(Path('/proc')/str(pid)).exists()):
  driver.terminate()
  try:driver.wait(timeout=10)
  except subprocess.TimeoutExpired:report['driverControllerTerminalUnobserved']=True;report['passed']=False
 (root/'reports/capability.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report));raise SystemExit(0 if report['passed']else 2)
