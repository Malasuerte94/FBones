"""Stock native WebKit W3C control; no feature IPC or replacement browser."""
from pathlib import Path
import base64,ctypes,hashlib,json,os,re,socket,subprocess,time,urllib.error,urllib.request
from lifecycle import process,same,tree
from appimage_identity import associate,expected_outer,installed_path,native_candidate

def require(ok,message):
 if not ok:raise ValueError(message)
def write(path,value):
 raw=json.dumps(value,indent=2,ensure_ascii=True).encode();require(len(raw)<=2*1024*1024,'Receipt bound')
 with Path(path).open('xb')as output:output.write(raw+b'\n')
def wait(fn,seconds=30):
 end=time.monotonic()+seconds;last=None
 while time.monotonic()<end:
  try:
   value=fn()
   if value:return value
  except(FileNotFoundError,ConnectionError,urllib.error.URLError,json.JSONDecodeError)as error:last=str(error)
  time.sleep(.1)
 raise TimeoutError('Bounded native wait: '+str(last))
def main_window(pid):
 raw=subprocess.check_output(['xwininfo','-root','-children'],text=True,timeout=3);handles=re.findall(r'^\s*(0x[0-9a-f]+)\s+',raw,re.M);require(len(handles)<=128,'Private X window count bound');found=[]
 for h in handles:
  try:
   props=subprocess.check_output(['xprop','-id',h,'_NET_WM_PID','WM_NAME'],text=True,stderr=subprocess.DEVNULL,timeout=2)
   if not re.search(r'_NET_WM_PID\(CARDINAL\)\s*=\s*'+str(pid)+r'\s*$',props,re.M):continue
   title=re.search(r'WM_NAME\([^)]*\)\s*=\s*"([^"]*)"',props)
   if not title or not title[1].endswith('FBones'):continue
   if'Map State: IsViewable'in subprocess.check_output(['xwininfo','-id',h],text=True,timeout=2):found.append({'window':h,'pid':pid,'title':title[1],'visible':True})
  except subprocess.CalledProcessError:continue
 require(len(found)<=1,'Ambiguous owned native main windows')
 return found[0]if found else None
def close_window(h):
 class Data(ctypes.Union):_fields_=[('b',ctypes.c_char*20),('s',ctypes.c_short*10),('l',ctypes.c_long*5)]
 class Client(ctypes.Structure):_fields_=[('type',ctypes.c_int),('serial',ctypes.c_ulong),('send',ctypes.c_int),('display',ctypes.c_void_p),('window',ctypes.c_ulong),('message',ctypes.c_ulong),('format',ctypes.c_int),('data',Data)]
 class Event(ctypes.Union):_fields_=[('client',Client),('pad',ctypes.c_long*24)]
 x=ctypes.CDLL('libX11.so.6');x.XOpenDisplay.argtypes=[ctypes.c_char_p];x.XOpenDisplay.restype=ctypes.c_void_p;x.XInternAtom.argtypes=[ctypes.c_void_p,ctypes.c_char_p,ctypes.c_int];x.XInternAtom.restype=ctypes.c_ulong;x.XSendEvent.argtypes=[ctypes.c_void_p,ctypes.c_ulong,ctypes.c_int,ctypes.c_long,ctypes.POINTER(Event)];x.XFlush.argtypes=[ctypes.c_void_p];x.XCloseDisplay.argtypes=[ctypes.c_void_p];display=x.XOpenDisplay(None);require(display,'Own X display unavailable')
 try:
  event=Event();event.client.type=33;event.client.display=display;event.client.window=int(h,16);event.client.message=x.XInternAtom(display,b'WM_PROTOCOLS',0);event.client.format=32;event.client.data.l[0]=x.XInternAtom(display,b'WM_DELETE_WINDOW',0);require(x.XSendEvent(display,int(h,16),0,0,ctypes.byref(event))!=0,'Scoped normal close failed');x.XFlush(display)
 finally:x.XCloseDisplay(display)

class ControlSession:
 def __init__(self,run,phase,expected_sha,port):
  require(phase in['old-0.9.5','fresh-0.9.6-persistence'],'Fixed control phases only');self.run=Path(run);self.phase=phase;self.expected=expected_sha;self.port=port;self.folder=self.run/'sessions'/phase;self.folder.mkdir(parents=True);self.trace=[]
  write(self.folder/'launch-input.json',{'phase':phase,'image':str(installed_path(self.run)),'expectedNativeSha256':expected_sha})
  wrapper=Path(__file__).resolve().with_name('native-launch.py');wrapper.chmod(0o755);env=os.environ.copy();env.update(FBONES_UPGRADE_RUN=str(self.run),FBONES_UPGRADE_SESSION=str(self.folder),TAURI_WEBVIEW_AUTOMATION='true',GTK_MODULES='atk-bridge',GDK_BACKEND='x11',LIBGL_ALWAYS_SOFTWARE='1',LANG='C.UTF-8',LC_ALL='C.UTF-8')
  for key,sub in[('XDG_DATA_HOME','data'),('XDG_CONFIG_HOME','config'),('XDG_CACHE_HOME','cache'),('TMPDIR','tmp')]:
   folder=self.run/'profile'/sub;folder.mkdir(parents=True,exist_ok=True);env[key]=str(folder)
  with socket.socket()as check:check.bind(('127.0.0.1',port))
  self.log=(self.folder/'driver-spool.log').open('xb');self.driver=subprocess.Popen(['WebKitWebDriver','--host=127.0.0.1','--port='+str(port)],stdin=subprocess.DEVNULL,stdout=self.log,stderr=subprocess.STDOUT,env=env,close_fds=True);self.driver_identity=process(self.driver.pid)
  wait(lambda:self.rpc('GET','/status').get('ready'));self.session=self.rpc('POST','/session',{'capabilities':{'alwaysMatch':{'browserName':'wry','webkitgtk:browserOptions':{'binary':str(wrapper),'args':[]}}}})['sessionId']
  self.bound=wait(lambda:json.loads((self.folder/'reports/app-lifecycle-bound.json').read_text())if(self.folder/'reports/app-lifecycle-bound.json').exists()else None)
  self.native=process(self.bound['processId'],True);require(self.bound['wrapperPid']in tree(self.driver.pid)and self.native['ppid']==self.bound['wrapperPid']and self.bound['imageIdentityVerified']and self.bound['actualExecutableSha256']==self.native['sha256']==expected_sha and self.bound['creationStartTicks']==self.native['startTicks'],'Retained created native stock phase identity mismatch')
  self.appimage=associate(self.native['pid'],self.run,expected_sha,expected_outer(self.run,phase));require(self.appimage['startTicks']==self.native['startTicks'],'AppImage association kernel start changed');write(self.folder/'appimage-bound.json',self.appimage)
  self.window=wait(lambda:main_window(self.native['pid']));version='0.9.5'if phase=='old-0.9.5'else'0.9.6'
  wait(lambda:self.script("const c=document.querySelector('[data-testid=viewport] canvas');return c&&c.width>0&&document.body.innerText.includes("+json.dumps(version)+")&&!document.body.innerText.includes('The viewport could not start.')&&!document.body.innerText.includes('Opening workspace…')"));write(self.folder/'native-bound.json',{'phase':phase,'native':self.native,'window':self.window,'version':version,'driver':self.driver_identity,'browserSession':self.session})
 def rpc(self,method,path,payload=None):
  self.trace.append({'method':method,'path':path,'at':time.monotonic()});require(len(self.trace)<=512,'W3C operation count bound');body=None if payload is None else json.dumps(payload).encode();request=urllib.request.Request('http://127.0.0.1:'+str(self.port)+path,data=body,method=method,headers={'Content-Type':'application/json'})
  with urllib.request.urlopen(request,timeout=35)as response:raw=response.read(8*1024*1024+1)
  require(len(raw)<=8*1024*1024,'W3C response bound');value=json.loads(raw).get('value');require(not isinstance(value,dict)or'error'not in value,'Native W3C error: '+str(value)[:2048]);return value
 def script(self,code):return self.rpc('POST','/session/'+self.session+'/execute/sync',{'script':code,'args':[]})
 def identity(self):
  current=process(self.native['pid'],True);require(same(current,self.native)and current['sha256']==self.expected,'Native process changed before UI operation');require(main_window(current['pid'])['window']==self.window['window'],'Native main window changed');return current
 def element(self,selector,using='css selector'):
  values=self.rpc('POST','/session/'+self.session+'/elements',{'using':using,'value':selector});require(len(values)==1,'UI target missing/ambiguous: '+selector);return values[0]['element-6066-11e4-a52e-4f735466cecf']
 def click(self,selector,using='css selector'):
  self.identity();target=self.element(selector,using);self.rpc('POST','/session/'+self.session+'/element/'+target+'/click',{})
 def fill(self,selector,text):
  self.identity();target=self.element(selector);self.rpc('POST','/session/'+self.session+'/element/'+target+'/clear',{});self.rpc('POST','/session/'+self.session+'/element/'+target+'/value',{'text':text})
 def state(self):
  return self.script("return {title:document.title,boneName:document.querySelector('[data-testid=bone-name]')?.value??null,x:document.querySelector('[data-testid=bone-x]')?.value??null,boneRows:[...document.querySelectorAll('[data-tree-kind=bone] [role=treeitem]')].map(e=>e.innerText.trim()),focused:document.activeElement?.getAttribute('data-testid'),updatePhase:document.querySelector('[data-testid=app-updater]')?.dataset.phase,updateStatus:document.querySelector('[data-testid=app-update-status]')?.innerText?.trim()??null,panel:document.querySelector('[data-testid=app-update-panel]')?.innerText??null,dialog:document.querySelector('[role=dialog]')?.innerText??null,saveNotice:document.body.innerText.includes('Project saved.'),bodyVersionText:document.body.innerText.match(/Version\\s+0\\.9\\.[56]\\b/)?.[0]??null}")
 def screenshot(self,name):
  raw=base64.b64decode(self.rpc('GET','/session/'+self.session+'/screenshot'),validate=True);require(len(raw)<=4*1024*1024 and raw.startswith(bytes.fromhex('89504e470d0a1a0a')),'Native PNG screenshot bound');(self.run/'reports'/name).write_bytes(raw)
 def wait_terminal(self):
  row=wait(lambda:json.loads((self.folder/'reports/app-lifecycle.json').read_text())if(self.folder/'reports/app-lifecycle.json').exists()else None,20);require(row['processId']==self.native['pid']and row['creationStartTicks']==self.native['startTicks']and row['actualExecutableSha256']==self.expected and row['terminalObserved']and row['terminationKind']=='exit'and row['exitCode']==0,'Actual retained phase terminal0 unavailable');return row
 def normal_close(self):
  self.identity();state=self.state();require(' * — FBones'not in state['title']and state['dialog']is None,'Only clean native session may close normally');close_window(self.window['window']);return self.wait_terminal()
 def stop_driver_after_native_exit(self):
  # A controller tool only; never terminate an app or hide its missing terminal.
  require(not any(native_candidate(row)for row in tree().values()),'Native app remains; no tool shutdown')
  if self.driver.poll()is None:
   current=process(self.driver.pid);require(current['startTicks']==self.driver_identity['startTicks']and current['executablePath']==self.driver_identity['executablePath'],'Driver tool identity changed');self.driver.terminate()
  code=self.driver.wait(timeout=10);write(self.folder/'controller-terminal.json',{'driverExitCode':code,'driverOnlyTerminationAllowed':True,'nativeSignalSent':False});write(self.folder/'w3c-trace.json',self.trace)
 def retain_prefixes(self):
  for source,name in[(self.folder/'native-spool.log',self.phase+'-native-prefix.log'),(self.folder/'driver-spool.log',self.phase+'-driver-prefix.log')]:
   if source.exists():
    with source.open('rb')as stream:raw=stream.read(65536)
    target=self.run/'reports'/name
    if not target.exists():target.write_bytes(raw)
