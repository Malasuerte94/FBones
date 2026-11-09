"""One owned GTK Save action through AT-SPI; imported only by hosted probe."""
import json,os,re,subprocess,time
from pathlib import Path

def require(value,message):
 if not value:raise ValueError(message)
def label(value):return value.replace('_','').strip().rstrip(':').strip()
def choose(rows,kind):
 if kind=='entry':matches=[r for r in rows if r['role']in['entry','text']and r['singleLine']and r['textInterface']and r['editableTextInterface']and r['showing']and r['visible']and r['enabled']and r['sensitive']and r['editable']and 'Name'in [label(s)for s in [r['name'],*r['labels']]]]
 else:matches=[r for r in rows if r['role']=='push button'and r['showing']and r['visible']and r['enabled']and r['sensitive']and label(r['name'])==kind and r['clickActions']==[0]]
 require(len(matches)==1,'Missing/ambiguous own '+kind+' control; no input')
 return matches[0]

class Picker:
 def __init__(self,root,pid,start,main_window,identity,expected_image_sha):
  require(os.environ.get('GITHUB_ACTIONS')=='true'and os.environ.get('RUNNER_ENVIRONMENT')=='github-hosted'and os.environ.get('RUNNER_OS')=='Linux','Hosted private Linux only')
  require(os.environ.get('DBUS_SESSION_BUS_ADDRESS','').startswith('unix:'),'Own dbus-run-session required')
  self.root=Path(root);self.pid=pid;self.start=start;self.main=int(main_window,16);self.identity=identity;self.sha=expected_image_sha;self.began=time.monotonic();self.rows=[];self.nodes={};self.submitted=False;self.dialog=None;self.cancel=None
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
  with(self.root/'reports'/name).open('xb')as f:f.write(raw+b'\n')
 def x_dialog(self):
  self.bound();tree=subprocess.check_output(['xwininfo','-root','-children'],text=True,timeout=3);found=[]
  handles=re.findall(r'^\s*(0x[0-9a-f]+)\s+',tree,re.M);require(len(handles)<=128,'Private display window cap')
  for h in handles:
   props=subprocess.check_output(['xprop','-id',h,'_NET_WM_PID','WM_TRANSIENT_FOR','WM_NAME'],text=True,stderr=subprocess.DEVNULL,timeout=2)
   if not re.search(r'_NET_WM_PID\(CARDINAL\)\s*=\s*'+str(self.pid)+r'\s*$',props,re.M):continue
   parent=re.search(r'WM_TRANSIENT_FOR\(WINDOW\): window id # (0x[0-9a-f]+)',props)
   title=re.search(r'WM_NAME\([^)]*\)\s*=\s*"([^"]*)"',props)
   if not parent or int(parent[1],16)!=self.main or not title or title[1]!='Save a project':continue
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
  return{'path':path,'role':node.get_role_name(),'name':name,'labels':labels,'showing':state.contains(a.StateType.SHOWING),'visible':state.contains(a.StateType.VISIBLE),'enabled':state.contains(a.StateType.ENABLED),'sensitive':state.contains(a.StateType.SENSITIVE),'editable':state.contains(a.StateType.EDITABLE),'singleLine':state.contains(a.StateType.SINGLE_LINE),'textInterface':node.get_text_iface()is not None,'editableTextInterface':node.get_editable_text_iface()is not None,'modal':state.contains(a.StateType.MODAL),'clickActions':click}
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
     if r['role']in['dialog','file chooser']and r['name']=='Save a project'and r['showing']and r['visible']and r['modal']:candidates.append((node,[i]))
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
  self.dialog,dialog_path=candidates[0];self.x=native;queue=[(self.dialog,dialog_path)];self.rows=[];self.nodes={};deadline=time.monotonic()+15
  while queue:
   require(len(self.rows)<512 and time.monotonic()<deadline,'Dialog inventory node/time bound')
   node,p=queue.pop(0);row=self.describe(node,p);self.rows.append(row);self.nodes[tuple(p)]=node;count=node.get_child_count();require(0<=count<=256,'Dialog child count bound')
   require(len(p)<=32,'Dialog depth bound');queue.extend((node.get_child_at_index(i),p+[i])for i in range(count))
  self.output('picker-inventory.json',{'ownedPid':self.pid,'startTicks':self.start,'nativeWindow':self.x,'controls':self.rows,'inputOperations':0})
  self.cancel=choose(self.rows,'Cancel');self.entry=choose(self.rows,'entry');self.save=choose(self.rows,'Save')
 def read_text(self,node):
  text=node.get_text_iface();require(text is not None,'Filename native Text unavailable');count=text.get_character_count();require(0<=count<=8192,'Filename text bound');return text.get_text(0,count)
 def click(self,row):
  node=self.nodes[tuple(row['path'])];current=self.describe(node,row['path']);require(current==row,'Owned native button changed');action=node.get_action_iface();require(action is not None and action.do_action(0),'Scoped native click failed')
 def save_once(self,destination):
  destination=Path(destination);require(destination.is_absolute()and destination.parent==self.root/'projects'and destination.suffix=='.fbones'and not destination.exists(),'New exact own Save destination required')
  self.bound();require(self.x_dialog()==self.x,'Native dialog identity changed')
  node=self.nodes[tuple(self.entry['path'])];before=self.read_text(node);edit=node.get_editable_text_iface();require(edit is not None,'Filename EditableText unavailable')
  self.output('picker-before.json',{'destination':str(destination),'filenameEntry':self.entry,'nativeText':before,'nativeWindow':self.x,'maximumSaveActions':1})
  require(edit.set_text_contents(str(destination)),'Native filename replacement failed');after=self.read_text(node)
  self.output('picker-after.json',{'destination':str(destination),'nativeText':after,'exactReadback':after==str(destination)})
  require(after==str(destination),'Native filename readback differs; no Save')
  self.bound();require(self.x_dialog()==self.x and not destination.exists(),'Owned dialog or destination changed before Save')
  self.output('picker-submit-intent.json',{'destination':str(destination),'ownPid':self.pid,'startTicks':self.start,'nativeWindow':self.x,'saveControl':self.save,'oneSaveAction':True})
  self.submitted=True;self.click(self.save)
  self.output('picker-submitted.json',{'oneSaveAction':True,'destination':str(destination),'actionReturned':True})
 def cancel_before_submit(self):
  if self.submitted or self.dialog is None or self.cancel is None:return False
  self.bound();require(self.x_dialog()==self.x,'Dialog changed before failure Cancel');self.click(self.cancel)
  self.output('picker-failure-cancel.json',{'oneScopedCancel':True,'saveSubmitted':False});return True

def selftest():
 base={'path':[0],'role':'entry','name':'Name:','labels':[],'showing':True,'visible':True,'enabled':True,'sensitive':True,'editable':True,'singleLine':True,'textInterface':True,'editableTextInterface':True,'modal':False,'clickActions':[]}
 assert choose([base],'entry')==base
 assert choose([dict(base,name='',labels=['Name:'])],'entry')['labels']==['Name:']
 assert choose([dict(base,role='text')],'entry')['role']=='text'
 for rows in[[],[base,base],[dict(base,name='Search')],[dict(base,visible=False)],[dict(base,editable=False)],[dict(base,singleLine=False)],[dict(base,textInterface=False)],[dict(base,editableTextInterface=False)]]:
  try:choose(rows,'entry')
  except ValueError:pass
  else:raise AssertionError('Ambiguous/unassociated/invisible entry accepted')
 button=dict(base,role='push button',name='Save',clickActions=[0]);assert choose([button],'Save')==button
 for actions in[[],[1],[0,1]]:
  try:choose([dict(button,clickActions=actions)],'Save')
  except ValueError:pass
  else:raise AssertionError('Unbound click action accepted')
 print('PASS pure selector guards; no GI/desktop/process calls')
if __name__=='__main__':
 import sys
 require(sys.argv[1:]==['--selftest'],'Only pure --selftest CLI; provider called by own runner');selftest()
