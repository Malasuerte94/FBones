"""Qualified native Save/Open and separate read-only own-successor observation."""
import json,os,re,subprocess,time
from pathlib import Path

def require(value,message):
 if not value:raise ValueError(message)
def label(value):return value.replace('_','').strip().rstrip(':').strip()
def entries(rows,allowed_labels=('Name',)):
 return[r for r in rows if r['role']in['entry','text']and r['singleLine']and r['textInterface']and r['editableTextInterface']and r['showing']and r['visible']and r['enabled']and r['sensitive']and r['editable']and set(allowed_labels).intersection(label(s)for s in[r['name'],*r['labels']])]
def choose(rows,kind,allowed_labels=('Name',)):
 if kind=='entry':matches=entries(rows,allowed_labels)
 else:matches=[r for r in rows if(r['role']=='push button'or(kind=='Type a file name'and r['role']=='toggle button'and not r['checked']))and r['showing']and r['visible']and r['enabled']and r['sensitive']and label(r['name'])==kind and r['clickActions']==[0]]
 require(len(matches)==1,'Missing/ambiguous own '+kind+' control; no input')
 return matches[0]

class NativePicker:
 def __init__(self,root,pid,start,main_window,identity,expected_image_sha,kind,receipt_tag):
  require(os.environ.get('GITHUB_ACTIONS')=='true'and os.environ.get('RUNNER_ENVIRONMENT')=='github-hosted'and os.environ.get('RUNNER_OS')=='Linux','Hosted private Linux only')
  require(os.environ.get('DBUS_SESSION_BUS_ADDRESS','').startswith('unix:'),'Own dbus-run-session required')
  require((kind,receipt_tag)in[('Save','initial-save'),('Open','fresh-open')],'Fixed two native picker purposes only')
  self.root=Path(root).resolve();require(self.root.is_relative_to(Path(os.environ['RUNNER_TEMP']).resolve()),'Private picker root required');self.receipts=self.root/'reports'/receipt_tag;self.receipts.mkdir();self.kind=kind;self.title='Save a project'if kind=='Save'else'Open a project';self.allowed_labels=('Name',)if kind=='Save'else('Name','Location');self.pid=pid;self.start=start;self.main=int(main_window,16);self.identity=identity;self.sha=expected_image_sha;self.began=time.monotonic();self.rows=[];self.nodes={};self.submitted=False;self.dialog=None;self.cancel=None
  import gi
  gi.require_version('Atspi','2.0')
  from gi.repository import Atspi
  self.a=Atspi;Atspi.set_timeout(500,1000);Atspi.init()
 def bound(self):
  import hashlib
  require(self.identity(self.pid)==self.start,'Own native app start changed')
  require(hashlib.sha256((Path('/proc')/str(self.pid)/'exe').read_bytes()).hexdigest()==self.sha,'Own native executable changed')
 def output(self,name,data):
  raw=json.dumps(data,indent=2,ensure_ascii=True).encode();require(len(raw)<=512*1024,'Picker receipt512KiB bound')
  with(self.receipts/name).open('xb')as f:f.write(raw+b'\n')
 def x_dialog(self):
  self.bound();tree=subprocess.check_output(['xwininfo','-root','-children'],text=True,timeout=3);found=[]
  handles=re.findall(r'^\s*(0x[0-9a-f]+)\s+',tree,re.M);require(len(handles)<=128,'Private display window cap')
  for h in handles:
   props=subprocess.check_output(['xprop','-id',h,'_NET_WM_PID','WM_TRANSIENT_FOR','WM_NAME'],text=True,stderr=subprocess.DEVNULL,timeout=2)
   if not re.search(r'_NET_WM_PID\(CARDINAL\)\s*=\s*'+str(self.pid)+r'\s*$',props,re.M):continue
   parent=re.search(r'WM_TRANSIENT_FOR\(WINDOW\): window id # (0x[0-9a-f]+)',props)
   title=re.search(r'WM_NAME\([^)]*\)\s*=\s*"([^"]*)"',props)
   if not parent or int(parent[1],16)!=self.main or not title or title[1]!=self.title:continue
   info=subprocess.check_output(['xwininfo','-id',h],text=True,timeout=2)
   if'Map State: IsViewable'in info:found.append({'window':h,'ownerPid':self.pid,'transientFor':hex(self.main),'title':title[1],'visible':True})
  require(len(found)==1,'Missing/ambiguous same-PID visible Save dialog/transient parent')
  return found[0]
 def describe(self,node,path):
  a=self.a;require(node.get_process_id()==self.pid,'Accessible belongs to another process')
  state=node.get_state_set();name=node.get_name()or'';require(len(name)<=512,'Accessible name bound')
  labels=[]
  for relation in node.get_relation_set():
   if relation.get_relation_type()==a.RelationType.LABELLED_BY:
    require(relation.get_n_targets()<=8,'Accessible label count bound')
    for i in range(relation.get_n_targets()):
     target=relation.get_target(i);require(target.get_process_id()==self.pid,'Label outside owned app');value=target.get_name()or'';require(len(value)<=512,'Label bound');labels.append(value)
  action=node.get_action_iface();click=[]
  if action:
   count=action.get_n_actions();require(0<=count<=8,'Action count bound');click=[i for i in range(count)if action.get_action_name(i)=='click']
  return{'path':path,'role':node.get_role_name(),'name':name,'labels':labels,'showing':state.contains(a.StateType.SHOWING),'visible':state.contains(a.StateType.VISIBLE),'enabled':state.contains(a.StateType.ENABLED),'sensitive':state.contains(a.StateType.SENSITIVE),'editable':state.contains(a.StateType.EDITABLE),'singleLine':state.contains(a.StateType.SINGLE_LINE),'textInterface':node.get_text_iface()is not None,'editableTextInterface':node.get_editable_text_iface()is not None,'modal':state.contains(a.StateType.MODAL),'checked':state.contains(a.StateType.CHECKED),'clickActions':click}
 def discover(self):
  a=self.a;end=time.monotonic()+10;observations=[];candidates=[];windows=[];native=None
  while time.monotonic()<end:
   self.bound();desktop=a.get_desktop(0);count=desktop.get_child_count();require(0<=count<=64,'Private accessibility app count bound')
   apps=[desktop.get_child_at_index(i)for i in range(count)];apps=[app for app in apps if app.get_process_id()==self.pid];require(len(apps)<=1,'Ambiguous owned accessibility app')
   windows=[];candidates=[];sample={'privateDesktopAppCount':count,'ownAppMatches':len(apps),'seconds':time.monotonic()-self.began}
   if apps:
    app=apps[0];count=app.get_child_count();require(0<=count<=32,'Owned accessible window count bound')
    for i in range(count):
     node=app.get_child_at_index(i);r=self.describe(node,[i]);windows.append(r)
     if r['role']in['dialog','file chooser']and r['name']==self.title and r['showing']and r['visible']and r['modal']:candidates.append((node,[i]))
    require(len(candidates)<=1,'Ambiguous owned modal Save dialog')
    if candidates:
     try:native=self.x_dialog()
     except ValueError as error:sample['nativeDialogWaitError']=str(error)
   observations.append(sample);observations=observations[:16]+observations[-16:]if len(observations)>32 else observations
   if len(candidates)==1 and native is not None:break
   time.sleep(.2)
  self.output('picker-discovery.json',{'ownPid':self.pid,'startTicks':self.start,'observations':observations,'inputOperations':0})
  self.output('picker-windows.json',{'ownedPid':self.pid,'startTicks':self.start,'windows':windows,'privateDisplay':os.environ['DISPLAY'],'privateBus':os.environ['DBUS_SESSION_BUS_ADDRESS']})
  require(len(candidates)==1 and native is not None,'Owned modal accessibility/native Save dialog unavailable before deadline')
  self.dialog,self.dialog_path=candidates[0];self.x=native;self.inventory('picker-inventory.json')
  self.cancel=choose(self.rows,'Cancel');self.accept=choose(self.rows,self.kind)
  found=entries(self.rows,self.allowed_labels);require(len(found)<=1,'Ambiguous filename entry; no reveal fallback')
  if not found:
   require(self.kind=='Open','Save filename contract unavailable');reveal=choose(self.rows,'Type a file name')
   self.output('location-reveal-intent.json',{'nativeWindow':self.x,'observedControl':reveal,'maximumReveals':1});self.bound();require(self.x_dialog()==self.x,'Dialog changed before scoped reveal');self.click(reveal)
   self.output('location-reveal-returned.json',{'oneQualifiedNativeReveal':True})
   time.sleep(.2);self.inventory('picker-after-reveal-inventory.json');self.cancel=choose(self.rows,'Cancel');self.accept=choose(self.rows,self.kind)
  self.entry=choose(self.rows,'entry',self.allowed_labels)
 def inventory(self,name):
  queue=[(self.dialog,self.dialog_path)];self.rows=[];self.nodes={};deadline=time.monotonic()+15
  while queue:
   require(len(self.rows)<512 and time.monotonic()<deadline,'Dialog inventory node/time bound')
   node,p=queue.pop(0);row=self.describe(node,p);self.rows.append(row);self.nodes[tuple(p)]=node;count=node.get_child_count();require(0<=count<=256,'Dialog child count bound')
   require(len(p)<=32,'Dialog depth bound');queue.extend((node.get_child_at_index(i),p+[i])for i in range(count))
  self.output(name,{'ownedPid':self.pid,'startTicks':self.start,'nativeWindow':self.x,'controls':self.rows,'inputOperations':0})
 def read_text(self,node):
  text=node.get_text_iface();require(text is not None,'Filename native Text unavailable');count=text.get_character_count();require(0<=count<=8192,'Filename text bound');return text.get_text(0,count)
 def click(self,row):
  node=self.nodes[tuple(row['path'])];current=self.describe(node,row['path']);require(current==row,'Owned native button changed');action=node.get_action_iface();require(action is not None and action.do_action(0),'Scoped native click failed')
 def submit_once(self,destination,expected_existing_sha=None):
  import hashlib
  destination=Path(destination);require(destination.is_absolute()and destination.parent==self.root/'projects'and destination.suffix=='.fbones','Exact own project destination required')
  if self.kind=='Save':require(not destination.exists()and expected_existing_sha is None,'Save must use a new own path')
  else:require(destination.is_file()and hashlib.sha256(destination.read_bytes()).hexdigest()==expected_existing_sha,'Open must use exact existing own checkpoint')
  self.bound();require(self.x_dialog()==self.x,'Native dialog identity changed')
  node=self.nodes[tuple(self.entry['path'])];before=self.read_text(node);edit=node.get_editable_text_iface();require(edit is not None,'Filename EditableText unavailable')
  self.output('picker-before.json',{'kind':self.kind,'destination':str(destination),'filenameEntry':self.entry,'nativeText':before,'nativeWindow':self.x,'maximumAcceptActions':1})
  require(edit.set_text_contents(str(destination)),'Native filename replacement failed');after=self.read_text(node)
  self.output('picker-after.json',{'destination':str(destination),'nativeText':after,'exactReadback':after==str(destination)})
  require(after==str(destination),'Native filename readback differs; no Save')
  self.bound();require(self.x_dialog()==self.x,'Owned dialog changed before acceptance')
  if self.kind=='Save':require(not destination.exists(),'Save destination appeared; no overwrite')
  else:require(hashlib.sha256(destination.read_bytes()).hexdigest()==expected_existing_sha,'Own Open checkpoint changed')
  self.output('picker-submit-intent.json',{'kind':self.kind,'destination':str(destination),'ownPid':self.pid,'startTicks':self.start,'nativeWindow':self.x,'acceptControl':self.accept,'maximumAcceptActions':1})
  self.submitted=True;self.click(self.accept)
  self.output('picker-submitted.json',{'kind':self.kind,'oneAcceptAction':True,'destination':str(destination),'actionReturned':True})
 def cancel_before_submit(self):
  if self.submitted or self.dialog is None or self.cancel is None:return False
  self.bound();require(self.x_dialog()==self.x,'Dialog changed before failure Cancel');self.click(self.cancel)
  self.output('picker-failure-cancel.json',{'oneScopedCancel':True,'saveSubmitted':False});return True

def selftest():
 base={'path':[0],'role':'entry','name':'Name:','labels':[],'showing':True,'visible':True,'enabled':True,'sensitive':True,'editable':True,'singleLine':True,'textInterface':True,'editableTextInterface':True,'modal':False,'checked':False,'clickActions':[]}
 assert choose([base],'entry')==base
 assert choose([dict(base,name='',labels=['Name:'])],'entry')['labels']==['Name:']
 assert choose([dict(base,role='text')],'entry')['role']=='text'
 assert choose([dict(base,name='Location:')],'entry',('Name','Location'))['name']=='Location:'
 for rows in[[],[base,base],[dict(base,name='Search')],[dict(base,visible=False)],[dict(base,editable=False)],[dict(base,singleLine=False)],[dict(base,textInterface=False)],[dict(base,editableTextInterface=False)]]:
  try:choose(rows,'entry')
  except ValueError:pass
  else:raise AssertionError('Ambiguous/unassociated/invisible entry accepted')
 button=dict(base,role='push button',name='Save',clickActions=[0]);assert choose([button],'Save')==button
 toggle=dict(button,role='toggle button',name='Type a file name');assert choose([toggle],'Type a file name')==toggle
 try:choose([dict(toggle,checked=True)],'Type a file name')
 except ValueError:pass
 else:raise AssertionError('Blind checked toggle accepted')
 for actions in[[],[1],[0,1]]:
  try:choose([dict(button,clickActions=actions)],'Save')
  except ValueError:pass
  else:raise AssertionError('Unbound click action accepted')
 print('PASS pure selector guards; no GI/desktop/process calls')

PASSIVE_TEXT_ROLES={'static','label','page','footer','status bar','document text','document frame','paragraph','text','timer'}
PROTECTED_TEXT_ROLES={'password text','password-text','protected text','protected-text'}
def read_passive_text(node,row,budget):
 """Read-only standard Text; fake-node tests never load an AT-SPI provider."""
 result={'textInterfaceQueried':False,'textInterfaceAvailable':None,'textCharacterCount':None,'nativeText':None,'textReadComplete':True,'textReadError':None,'textCapHit':False,'textSkipReason':None}
 if row['role']in PROTECTED_TEXT_ROLES:result['textSkipReason']='protected-role';return result
 if row['editable']:result['textSkipReason']='editable-control';return result
 if not(row['showing']and row['visible']):result['textSkipReason']='not-showing-visible';return result
 if row['role']not in PASSIVE_TEXT_ROLES:result['textSkipReason']='role-not-qualified';return result
 result['textInterfaceQueried']=True
 try:
  iface=node.get_text_iface();result['textInterfaceAvailable']=iface is not None
  if iface is None:return result
  count=iface.get_character_count();result['textCharacterCount']=count
  require(type(count)is int and count>=0,'Invalid native Text character count')
  if count>8192 or budget['characters']+count>65536:
   result['textCapHit']=True;raise ValueError('Native Text per-node/aggregate character cap')
  value=iface.get_text(0,count)
  require(isinstance(value,str)and len(value)==count,'Native Text partial/invalid returned range')
  budget['characters']+=count;result['nativeText']=value
 except Exception as error:
  result['textReadComplete']=False;result['textReadError']=(type(error).__name__+': '+str(error))[:512]
 return result

def _successor_attempt(run,baseline,expected_sha):
 """No accessible action; only main-window subtree and verified exporters."""
 from lifecycle import process,same,tree
 import gi,hashlib
 require(os.environ.get('GITHUB_ACTIONS')=='true'and os.environ.get('RUNNER_ENVIRONMENT')=='github-hosted','Hosted own view only')
 gi.require_version('Atspi','2.0')
 from gi.repository import Atspi as a
 a.set_timeout(500,1000);a.init();current=process(baseline['pid'],True);require(same(current,baseline)and current['sha256']==expected_sha,'Successor identity changed before native view')
 descendants=tree(baseline['pid']);allowed={baseline['pid']:current}
 for pid,row in descendants.items():
  require(int(row['startTicks'])>=int(baseline['startTicks']),'Renderer predates own successor');allowed[pid]=row
 desktop=a.get_desktop(0);count=desktop.get_child_count();require(0<=count<=64,'Private accessibility app cap');apps=[]
 for i in range(count):
  app=desktop.get_child_at_index(i)
  try:owner=app.get_process_id()
  except Exception:continue
  if owner==baseline['pid']:apps.append(app)
 require(len(apps)<=1,'Exact successor accessibility app ambiguous')
 if not apps:return{'versionVerified':False,'readiness':'own app not yet exported','main':baseline,'nodes':[],'exporters':[],'startupErrorVisible':False}
 app=apps[0];count=app.get_child_count();require(0<=count<=32,'Successor window cap');windows=[]
 for i in range(count):
  node=app.get_child_at_index(i);name=node.get_name()or'';state=node.get_state_set()
  if node.get_process_id()==baseline['pid']and node.get_role_name()=='frame'and name.endswith('FBones')and state.contains(a.StateType.SHOWING)and state.contains(a.StateType.VISIBLE):windows.append(node)
 require(len(windows)<=1,'Successor main accessible frame ambiguous')
 if not windows:return{'versionVerified':False,'readiness':'own frame not yet showing','main':baseline,'nodes':[],'exporters':[],'startupErrorVisible':False}
 queue=[(windows[0],[])];rows=[];exporters={};end=time.monotonic()+15;text_budget={'characters':0}
 while queue:
  require(len(rows)<4096 and time.monotonic()<end,'Successor accessibility inventory cap');node,p=queue.pop(0);pid=node.get_process_id()
  if pid not in allowed:
   born=tree(baseline['pid']);require(pid in born and int(born[pid]['startTicks'])>=int(baseline['startTicks']),'Accessibility exporter outside verified successor tree');allowed[pid]=born[pid]
  live=process(pid);require(live['startTicks']==allowed[pid]['startTicks']and live['executablePath']==allowed[pid]['executablePath'],'Accessibility exporter identity changed');exporters[pid]=live
  role=node.get_role_name();name=''if role in PROTECTED_TEXT_ROLES else(node.get_name()or'');require(len(name)<=512,'Native accessible label cap');state=node.get_state_set();row={'path':p,'exporterPid':pid,'role':role,'name':name,'showing':state.contains(a.StateType.SHOWING),'visible':state.contains(a.StateType.VISIBLE),'editable':state.contains(a.StateType.EDITABLE)};row.update(read_passive_text(node,row,text_budget));rows.append(row)
  count=node.get_child_count();require(0<=count<=512 and len(p)<=32,'Native accessibility child/depth cap');queue.extend((node.get_child_at_index(i),p+[i])for i in range(count))
 text_complete=all(r['textReadComplete']for r in rows);text=' '.join(value for r in rows if r['showing']and r['visible']for value in[r['name'],r['nativeText']]if value is not None);matches=[{'path':r['path'],'exporterPid':r['exporterPid'],'source':source,'value':r[source]}for r in rows if r['showing']and r['visible']for source in['name','nativeText']if r[source]is not None and re.search(r'(?:Version\s*|Current version:\s*)0\.9\.6\b',r[source])];version=text_complete and bool(matches);error='The viewport could not start.'in text or'Opening workspace…'in text
 proof={'versionVerified':version,'version':'0.9.6'if version else None,'versionMatches':matches,'startupErrorVisible':error,'main':baseline,'exporters':list(exporters.values()),'nodes':rows,'readOnly':True,'accessibleActions':0,'nativeTextReadsComplete':text_complete,'nativeTextCharacters':text_budget['characters'],'nativeTextNodeCharacterCap':8192,'nativeTextAggregateCharacterCap':65536,'nativeTextCapHit':any(r['textCapHit']for r in rows),'nativeTextReadErrors':sum(not r['textReadComplete']for r in rows)}
 require(same(process(baseline['pid'],True),baseline),'Successor identity changed after native view');return proof

def readonly_successor_version(run,baseline,expected_sha):
 end=time.monotonic()+20;attempts=0;last=None
 while time.monotonic()<end:
  attempts+=1;last=_successor_attempt(run,baseline,expected_sha);last['readOnlyAttempts']=attempts;data=json.dumps(last,indent=2,ensure_ascii=True).encode();require(len(data)<=2*1024*1024,'Read-only native inventory byte cap');(Path(run)/'reports/automatic-native-accessibility-progress.json').write_bytes(data+b'\n')
  if last['startupErrorVisible']or last['versionVerified']or last.get('nativeTextReadsComplete')is False:break
  time.sleep(.2)
 require(last is not None,'No automatic native view observation')
 with(Path(run)/'reports/automatic-native-accessibility.json').open('xb')as f:f.write(data+b'\n')
 require(last['versionVerified']and not last['startupErrorVisible'],'Automatic successor visible native0.9.6/startup readiness unproved')
 return{'versionVerified':True,'version':'0.9.6','exporterPids':sorted(r['pid']for r in last['exporters']),'nodeCount':len(last['nodes']),'readOnly':True,'readOnlyAttempts':attempts,'nativeTextReadsComplete':last.get('nativeTextReadsComplete'),'nativeTextCharacters':last.get('nativeTextCharacters'),'versionSources':sorted(set(r['source']for r in last['versionMatches']))}
if __name__=='__main__':
 import sys
 require(sys.argv[1:]==['--selftest'],'Only pure --selftest CLI; provider called by own runner');selftest()
