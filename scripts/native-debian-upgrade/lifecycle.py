"""Own kernel descendant metadata/wait only, derived from proved subreaper toy."""
import ctypes,hashlib,json,os,re,threading,time
from pathlib import Path

def require(ok,message):
 if not ok:raise ValueError(message)
def process(pid,native_hash=False):
 p=Path('/proc')/str(pid);raw=(p/'stat').read_text();fields=raw[raw.rfind(')')+2:].split();path=os.readlink(p/'exe')
 row={'pid':pid,'ppid':int(fields[1]),'startTicks':fields[19],'state':fields[0],'executablePath':path}
 if native_hash:
  image=p/'exe';size=image.stat().st_size;require(0<size<=32*1024*1024,'Native image size bound');row['sha256']=hashlib.sha256(image.read_bytes()).hexdigest();stat=image.stat();row.update(device=stat.st_dev,inode=stat.st_ino,bytes=size)
 return row
def same(a,b):return all(a[k]==b[k]for k in['pid','startTicks','executablePath','sha256','device','inode'])
def direct_children(pid):
 tasks=list((Path('/proc')/str(pid)/'task').iterdir());require(len(tasks)<=256,'Owned task count bound');found=set()
 for task in tasks:
  try:found.update(int(v)for v in(task/'children').read_text().split())
  except FileNotFoundError:continue
 return sorted(found)
def tree(root_pid=None):
 root=os.getpid()if root_pid is None else root_pid;queue=[(root,0)];seen=set();rows={}
 while queue:
  current,depth=queue.pop(0);require(depth<=32 and len(seen)<256,'Own descendant depth/count bound')
  if current in seen:continue
  seen.add(current)
  try:children=direct_children(current)
  except(FileNotFoundError,ProcessLookupError):continue
  for pid in children:
   try:rows[pid]=process(pid)
   except(FileNotFoundError,ProcessLookupError,PermissionError):continue
   queue.append((pid,depth+1))
 return rows
def enable_subreaper():
 require(os.environ.get('GITHUB_ACTIONS')=='true'and os.environ.get('RUNNER_ENVIRONMENT')=='github-hosted','Hosted own controller only')
 header=Path('/usr/include/linux/prctl.h').read_text()
 for name,n in[('PR_SET_CHILD_SUBREAPER',36),('PR_GET_CHILD_SUBREAPER',37)]:require(re.search(r'^#define\s+'+name+r'\s+'+str(n)+r'\s*$',header,re.M),'Installed kernel header differs')
 libc=ctypes.CDLL(None,use_errno=True);libc.prctl.restype=ctypes.c_int;flag=ctypes.c_int(-1);zero=ctypes.c_ulong(0)
 require(libc.prctl(37,ctypes.byref(flag),zero,zero,zero)==0 and flag.value==0,'Own new controller flag must start0')
 require(libc.prctl(36,ctypes.c_ulong(1),zero,zero,zero)==0,'Process-local subreaper SET failed')
 require(libc.prctl(37,ctypes.byref(flag),zero,zero,zero)==0 and flag.value==1,'Process-local subreaper GET failed')
 return{'controller':process(os.getpid()),'subreaperVerified':True,'kernelHeaderSha256':hashlib.sha256(header.encode()).hexdigest(),'globalSettingsChanged':False}

class SuccessorObserver:
 def __init__(self,old_pid,target_sha):
  self.controller=os.getpid();self.old=process(old_pid,True);self.target=target_sha;self.before=tree();self.rows={};self.candidate=None;self.creator_observed=False;self.error=None;self.stop_event=threading.Event();self.lock=threading.Lock();self.started=time.monotonic();self.hashes={}
 def start(self):self.thread=threading.Thread(target=self.loop,daemon=True);self.thread.start()
 def loop(self):
  try:
   while not self.stop_event.is_set()and time.monotonic()-self.started<180:
    current=tree();require(len(self.rows)+len(set(current)-set(self.rows))<=256,'Observed descendant count bound')
    for pid,row in current.items():
     with self.lock:self.rows.setdefault(pid,row)
     if pid==self.old['pid']or row['executablePath']!='/usr/bin/fbones':continue
     require(pid not in self.before,'Preexisting extra FBones descendant; no automatic proof')
     key=(pid,row['startTicks'])
     if key not in self.hashes:self.hashes[key]=process(pid,True)
     native=dict(self.hashes[key],ppid=row['ppid'],state=row['state']);require(native['sha256']==self.target,'Unexpected native image in owned descendant tree')
     require(int(native['startTicks'])>=int(self.old['startTicks'])and native['inode']>0,'New native kernel identity invalid')
     with self.lock:
      require(self.candidate is None or same(self.candidate,native),'Ambiguous automatic native successors')
      self.creator_observed=self.creator_observed or native['ppid']==self.old['pid'];self.candidate=native
    time.sleep(.05)
  except Exception as error:self.error=type(error).__name__+': '+str(error)
 def adopted(self):
  if self.error:raise ValueError('Owned observer: '+self.error)
  with self.lock:row=None if self.candidate is None else dict(self.candidate)
  if row is None:return None
  try:current=process(row['pid'],True)
  except(FileNotFoundError,ProcessLookupError):return None
  require(same(row,current),'Automatic successor start/image changed')
  if current['ppid']!=self.controller:return None
  require(current['pid']in direct_children(self.controller),'Successor is not current direct adopted child')
  installed=Path('/usr/bin/fbones').stat();require((current['device'],current['inode'])==(installed.st_dev,installed.st_ino),'Successor differs from installed native member')
  return current
 def finish(self):
  self.stop_event.set();self.thread.join(timeout=3);require(not self.thread.is_alive(),'Read-only observer did not stop');require(self.error is None,'Owned observer failed: '+str(self.error))
 def receipt(self):
  with self.lock:return{'old':self.old,'candidate':self.candidate,'observerStartedBeforeInstall':True,'immediateOldCreatorObserved':self.creator_observed,'provenance':'live old→new then adoption'if self.creator_observed else'adoption provenance; immediate creator not observed','observedOwnDescendants':list(self.rows.values()),'observerError':self.error,'otherFBonesSessionCreatedBeforeAutomaticClose':False}

def wait_adopted_exit(row,seconds=20):
 end=time.monotonic()+seconds;waited=status=0
 while time.monotonic()<end:
  waited,status=os.waitpid(row['pid'],os.WNOHANG)
  if waited:break
  time.sleep(.05)
 result={'pid':row['pid'],'startTicks':row['startTicks'],'waitedPid':waited,'rawWaitStatus':status,'terminalObserved':waited==row['pid'],'normalExit':waited==row['pid']and os.WIFEXITED(status),'exitCode':os.WEXITSTATUS(status)if waited==row['pid']and os.WIFEXITED(status)else None,'signalsSentToApp':0}
 require(result['normalExit']and result['exitCode']==0,'Actual adopted successor normal waitpid0 unproved')
 return result
