"""Stock installed GTK capability on an isolated Xvfb/DBus hosted runner only."""
import base64,ctypes,hashlib,json,os,re,shutil,subprocess,sys,time,urllib.request
from pathlib import Path
root=Path(sys.argv[1]).resolve();route=sys.argv[2];report={'passed':False,'stage':'native-picker-only','probePassed':False,'semanticVerificationPending':True,'route':route,'upgradeAttempted':False,'normalClose':False};driver=None;session=None;pid=None;start=None;picker=None;started=time.monotonic()
require=lambda yes,message:None if yes else (_ for _ in ()).throw(ValueError(message))
def command(*a):return subprocess.check_output(a,text=True).strip()
def stage(name):
 report['currentStage']=name;report.setdefault('stages',[]).append({'name':name,'seconds':time.monotonic()-started});(root/'reports/progress.json').write_text(json.dumps(report,indent=2)+'\n')
def rpc(method,path,payload=None):
 report['lastRpc']={'method':method,'path':path,'seconds':time.monotonic()-started}
 data=None if payload is None else json.dumps(payload).encode();request=urllib.request.Request('http://127.0.0.1:9515'+path,data=data,method=method,headers={'Content-Type':'application/json'})
 with urllib.request.urlopen(request,timeout=35)as response:body=json.load(response)
 value=body.get('value')
 if isinstance(value,dict)and'error'in value:report['lastRpcError']=str(value)[:2048]
 require(not isinstance(value,dict)or'error'not in value,'Native WebDriver error: '+str(value)[:2048]);return value
def script(code):return rpc('POST','/session/'+session+'/execute/sync',{'script':code,'args':[]})
def wait(fn,seconds=30):
 end=time.monotonic()+seconds
 while time.monotonic()<end:
  try:v=fn()
  except (ConnectionError,urllib.error.URLError,ValueError)as error:report['lastWaitError']=type(error).__name__+': '+str(error)[:2048];v=None
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
 require(root.is_relative_to(Path(os.environ['RUNNER_TEMP']).resolve())and route=='linux-deb','Private Linux route/root required')
 stock=json.loads((root/'reports/stock-package.json').read_text());require(stock['route']==route,'Wrong stock route');package=root/stock['asset']['name'];require(hashlib.sha256(package.read_bytes()).hexdigest()==stock['asset']['sha256'],'Stock package changed')
 stage('stock-native-package-install')
 if route=='linux-deb':
  installed=subprocess.run(['dpkg-query','-W','-f=${db:Status-Status}','f-bones'],capture_output=True,text=True);require(installed.returncode!=0 or installed.stdout!='installed','Fresh runner already has FBones')
  subprocess.run(['sudo','-n','dpkg','-i',str(package)],check=True);require(command('dpkg-query','-W','-f=${Version} ${Architecture}','f-bones')=='0.9.5 amd64','Actual dpkg installation/version failed');binary=Path('/usr/bin/fbones');report['installation']={'stockDpkgInstalled':True,'package':'f-bones','version':'0.9.5','architecture':'amd64'}
 else:
  install=root/'installed';install.mkdir();binary=install/'FBones.AppImage';package.rename(binary);binary.chmod(0o755);require(Path('/dev/fuse').exists(),'Native AppImage FUSE provider unavailable; no extract-and-run fallback');report['installation']={'nativeExecutableAppImage':True,'version':'0.9.5','packageSha256':stock['asset']['sha256']}
 os.environ['GTK_MODULES']='atk-bridge';os.environ['LANG']='C.UTF-8';os.environ['LC_ALL']='C.UTF-8';os.environ['TAURI_WEBVIEW_AUTOMATION']='true';os.environ['GDK_BACKEND']='x11';os.environ['LIBGL_ALWAYS_SOFTWARE']='1'
 # Keep stock runtime/profile in fresh per-job directories, without overriding updater URLs/keys.
 for name,subdir in [('XDG_DATA_HOME','data'),('XDG_CONFIG_HOME','config'),('XDG_CACHE_HOME','cache'),('TMPDIR','tmp')]:
  p=root/subdir;p.mkdir();os.environ[name]=str(p)
 wrapper=Path(__file__).resolve().parent/'linux-launch.py';wrapper.chmod(0o755);(root/'launch-input.json').write_text(json.dumps({'image':str(binary),'route':route}));os.environ['FBONES_NATIVE_ROOT']=str(root)
 stage('start-native-webkit-driver');driverLog=(root/'driver-spool.log').open('xb');driver=subprocess.Popen(['WebKitWebDriver','--host=127.0.0.1','--port=9515'],stdin=subprocess.DEVNULL,stdout=driverLog,stderr=subprocess.STDOUT)
 stage('native-driver-status');wait(lambda:rpc('GET','/status').get('ready'));stage('native-webdriver-session');session=rpc('POST','/session',{'capabilities':{'alwaysMatch':{'browserName':'wry','webkitgtk:browserOptions':{'binary':str(wrapper),'args':[]}}}})['sessionId']
 def find_app():
  candidates=[]
  for p in children(driver.pid):
   try:
    if hashlib.sha256((Path('/proc')/str(p)/'exe').read_bytes()).hexdigest()==stock['executableSha256']:candidates.append(p)
   except (FileNotFoundError,PermissionError,ProcessLookupError):pass
  return candidates[0]if len(candidates)==1 else None
 stage('bind-stock-native-process');pid=wait(find_app);start=identity(pid);bound=wait(lambda:json.loads((root/'reports/app-lifecycle-bound.json').read_text())if(root/'reports/app-lifecycle-bound.json').exists()else None);require(bound['processId']==pid and bound['creationStartTicks']==start and bound['wrapperPid']in children(driver.pid)and bound['imageIdentityVerified']and bound['actualExecutableSha256']==stock['executableSha256'],'Own retained launcher does not bind exact stock native app');stage('bind-visible-native-window');h=wait(lambda:own_window(pid));report['native']={'processId':pid,'creationStartTicks':start,'window':h,'visible':True,'installedExecutableSha256':stock['executableSha256'],'display':os.environ['DISPLAY'],'provider':'stock-GTK-WebKitWebDriver'}
 stage('native-frontend-readiness');before=wait(lambda:script("const c=document.querySelector('[data-testid=viewport] canvas'),t=document.querySelector('[data-testid=app-updates-toggle]');return c&&c.width>0&&t&&document.body.innerText.includes('0.9.5')&&!document.body.innerText.includes('The viewport could not start.')&&!document.body.innerText.includes('Opening workspace…')?{url:location.href,version:'0.9.5',canvas:{width:c.width,height:c.height},expanded:t.getAttribute('aria-expanded'),phase:document.querySelector('[data-testid=app-updater]')?.dataset.phase,panel:document.querySelector('[data-testid=app-update-panel]')?.innerText??null,firstInstaller:!!document.querySelector('[data-testid=app-update-first-installer]')}:null"));require(before['phase']!='unsupported','Installed stock GTK updater reports unsupported')
 stage('ordinary-new-project');project_name='Own Linux native picker'
 def element(selector):return rpc('POST','/session/'+session+'/element',{'using':'css selector','value':selector})['element-6066-11e4-a52e-4f735466cecf']
 def click(selector):
  require(identity(pid)==start,'Own process start changed before DOM control');rpc('POST','/session/'+session+'/element/'+element(selector)+'/click',{})
 def fill(selector,text):
  require(identity(pid)==start,'Own process start changed before DOM entry');e=element(selector);rpc('POST','/session/'+session+'/element/'+e+'/clear',{});rpc('POST','/session/'+session+'/element/'+e+'/value',{'text':text})
 click('button[aria-label="New project"]');wait(lambda:script("return !!document.querySelector('[role=dialog] #project-name')"));fill('#project-name',project_name);click('[role=dialog] form button[type=submit]')
 wait(lambda:script("return document.title.includes("+json.dumps(project_name)+")&&!!document.querySelector('[data-testid=bone-x]')"));fill('[data-testid=bone-x]','37.5\ue007')
 dirty=wait(lambda:script("const x=document.querySelector('[data-testid=bone-x]');return x&&Number(x.value)===37.5&&document.title.includes(' * — FBones')?{title:document.title,x:x.value}:null"));report['dirtyProject']=dirty
 stage('ordinary-save-native-picker');projects=root/'projects';projects.mkdir();destination=projects/'native-picker.fbones';require(not destination.exists(),'Save path must not exist');click('header button[aria-label="Save"]')
 from gtk_picker import Picker
 picker=Picker(root,pid,start,h,identity,stock['executableSha256']);picker.discover();picker.save_once(destination)
 stage('observe-native-save-checkpoint')
 clean=wait(lambda:script("const x=document.querySelector('[data-testid=bone-x]');return x&&Number(x.value)===37.5&&!document.title.includes(' * — FBones')&&document.title.includes("+json.dumps(project_name)+")&&document.body.innerText.includes('Project saved.')?{title:document.title,x:x.value,saveNotice:true}:null"))
 last=None;stable=0;limit=time.monotonic()+5
 while stable<4 and time.monotonic()<limit:
  if destination.is_file():
   data=destination.read_bytes();require(0<len(data)<=1024*1024,'Own minimal saved binary size bound');current=hashlib.sha256(data).hexdigest();stable=stable+1 if current==last else 1;last=current
  time.sleep(.1)
 require(stable==4,'Native saved file did not stabilize');shutil.copyfile(destination,root/'reports/saved-own.fbones')
 report['saveObservation']={'oneNativeSaveAction':True,'destination':str(destination),'bytes':len(data),'sha256':last,'stableReads':stable,'cleanDom':clean,'expectedOwnProjectName':project_name,'expectedRootX':37.5,'semanticVerificationPending':True,'fileWrittenByProbe':False,'retainedArtifactCopy':'saved-own.fbones'}
 stage('native-screenshot');png=base64.b64decode(rpc('GET','/session/'+session+'/screenshot'),validate=True);require(len(png)<=4*1024*1024 and png.startswith(bytes.fromhex('89504e470d0a1a0a')),'Native screenshot bound/format');(root/'reports/frontend.png').write_bytes(png)
 stage('normal-owned-close');require(identity(pid)==start and own_window(pid)==h,'Own native window changed before close');close_window(h);wait(lambda:not(Path('/proc')/str(pid)).exists(),20);terminal=wait(lambda:json.loads((root/'reports/app-lifecycle.json').read_text())if(root/'reports/app-lifecycle.json').exists()else None,5);require(terminal['processId']==pid and terminal['creationStartTicks']==start and terminal['actualExecutableSha256']==stock['executableSha256']and terminal['terminalObserved']and terminal['terminationKind']=='exit'and terminal['exitCode']==0,'Actual stock native normal exit0 unproven');report['normalClose']=True;report['terminal']=terminal;report['probePassed']=True;report['status']='SAVE_OBSERVED_SEMANTIC_VERIFICATION_PENDING';stage('save-observed-encoding-pending')
except Exception as error:
 report['error']=type(error).__name__+': '+str(error)
 if picker:
  try:picker.output('picker-failure-inventory.json',{'error':report['error'],'saveSubmitted':picker.submitted,'controls':picker.rows[:200]})
  except Exception as receipt_error:report['pickerReceiptError']=str(receipt_error)
  try:report['scopedFailureCancel']=picker.cancel_before_submit()
  except Exception as cancel_error:report['pickerCancelError']=str(cancel_error)

finally:
 # Stop only our controller after its app exited; never force the native app.
 if driver and driver.poll()is None and (pid is not None and not(Path('/proc')/str(pid)).exists()):
  driver.terminate()
  try:driver.wait(timeout=10)
  except subprocess.TimeoutExpired:report['driverControllerTerminalUnobserved']=True;report['probePassed']=False
 report['diagnosticLogs']=[]
 for spool,name in [('native-spool.log','native-prefix.log'),('driver-spool.log','driver-prefix.log')]:
  path=root/spool
  if path.is_file():
   size=path.stat().st_size
   with path.open('rb')as stream:prefix=stream.read(65536)
   (root/'reports'/name).write_bytes(prefix);report['diagnosticLogs'].append({'source':spool,'spoolBytesObserved':size,'retainedPrefixBytes':len(prefix),'retainedPrefixCap':65536,'rawSpoolHardByteCap':False,'truncated':size>len(prefix)})
 (root/'reports/capability.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report));raise SystemExit(0 if report['probePassed']and report['normalClose']else 2)
