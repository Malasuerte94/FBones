"""Pure selectors/metadata and own synthetic TAR only; no target/provider calls."""
import ast,importlib.util,io,json,struct,sys,tarfile,tempfile,threading
from pathlib import Path
sys.dont_write_bytecode=True
BASE=Path(__file__).resolve().parent
import native_access
import table_open
from lifecycle import SuccessorObserver,same

native_access.selftest()
open_shape={'role':'push button','name':'Open','showing':True,'visible':True,'enabled':False,'sensitive':False,'clickActions':[0]}
assert table_open.structural_open([open_shape])==open_shape
for rows_bad in[[],[open_shape,open_shape],[dict(open_shape,name='Other')],[dict(open_shape,visible=False)],[dict(open_shape,clickActions=[])]]:
 try:table_open.structural_open(rows_bad)
 except ValueError:pass
 else:raise AssertionError('Unqualified structural Open accepted')
file={'basename':'own.fbones','location':'work/own/projects','sizeLabel':'17 bytes'}
table_row=lambda name,location,size:{'cells':{'Name':{'leaves':name},'Location':{'leaves':location},'Size':{'leaves':size}}}
good_row=table_row(['own.fbones'],['work/own/projects'],['17 bytes']);assert table_open.matching_rows([good_row],file)==[good_row]
for rows_bad in[[table_row(['own.fbones','own.fbones'],['work/own/projects'],['17 bytes'])],[table_row(['own.fbones'],['other'],['17 bytes']),table_row(['other'],['work/own/projects'],['17 bytes'])],[table_row(['own.fbones'],['work/own/projects'],['18 bytes'])]]:assert table_open.matching_rows(rows_bad,file)==[]
large_row={'cells':{name:{'nodes':[{'name':'\u4f60'*512}for _ in range(16)]}for name in['Name','Location','Size']}}
oversize={'complete':True,'error':'own retained cap-negative diagnostic','rows':[large_row for _ in range(6)]};bounded=table_open.bounded_table_proof(oversize);assert not bounded['complete']and bounded['diagnosticByteCapHit']and bounded['diagnosticTruncated']and bounded['originalRecordedRows']==6 and bounded['retainedRecordedRows']<6 and bounded['error']=='own retained cap-negative diagnostic'and len(json.dumps(bounded,ensure_ascii=True).encode())<=500*1024
with tempfile.TemporaryDirectory(prefix='own-table-file-',dir=BASE)as scratch:
 own_root=Path(scratch);(own_root/'projects').mkdir();destination=own_root/'projects/own.fbones';destination.write_bytes(b'own current bytes');digest=__import__('hashlib').sha256(destination.read_bytes()).hexdigest();picker=type('OwnPathOnly',(),{'root':own_root})()
 actual_file=table_open.own_file(picker,destination,digest);assert actual_file['size']==len(b'own current bytes')and actual_file['sizeLabel']==str(len(b'own current bytes'))+' bytes'
 alias=own_root/'projects/alias.fbones';alias.symlink_to(destination)
 for candidate,expected in[(destination,'0'*64),(alias,digest),(own_root/'projects/../projects/own.fbones',digest)]:
  try:table_open.own_file(picker,candidate,expected)
  except ValueError:pass
  else:raise AssertionError('Wrong hash/alias/traversal accepted')
update={'path':[0,1],'exporterPid':1,'role':'push button','name':'Updates','showing':True,'visible':True,'enabled':True,'sensitive':True,'editable':False}
action=dict(update,complete=True,actionInterfaceAvailable=True,actionCount=1,actionNames=['press'])
assert native_access.qualified_updates_action(action)
for delta in[{'name':'Updates extra'},{'role':'toggle button'},{'visible':False},{'enabled':False},{'sensitive':False},{'editable':True},{'complete':False},{'actionInterfaceAvailable':False},{'actionCount':2},{'actionNames':['click']},{'actionNames':['Press']},{'actionNames':['press','press']}]:assert not native_access.qualified_updates_action(dict(action,**delta))
for value in['Current version: 0.9.6',' Current\nversion: 0.9.6 ']:assert native_access.native_version_matches([dict(update,name='',nativeText=value)],True)
for value in['Version 0.9.6','Version 0.9.6 is ready to install.','Current version: 0.9.6-beta.1','Current version: 0.9.60','Current version: 0.9.5','unrelated Current version: 0.9.6 suffix']:assert not native_access.native_version_matches([dict(update,name='',nativeText=value)],True)
class TextNode:
 def __init__(self,value='Version 0.9.6',count=None,available=True,error=False):self.value=value;self.count=len(value)if count is None else count;self.available=available;self.error=error;self.calls=[]
 def get_text_iface(self):self.calls.append('interface');return self if self.available else None
 def get_character_count(self):self.calls.append('count');return self.count
 def get_text(self,start,end):
  self.calls.append(('text',start,end))
  if self.error:raise RuntimeError('own simulated provider error')
  return self.value
row_text={'role':'footer','editable':False,'showing':True,'visible':True}
node=TextNode();budget={'characters':0};result=native_access.read_passive_text(node,row_text,budget);assert result['nativeText']=='Version 0.9.6'and result['textReadComplete']and budget['characters']==13
timer=TextNode();timer_read=native_access.read_passive_text(timer,dict(row_text,role='timer'),{'characters':0});assert timer_read['nativeText']=='Version 0.9.6'and timer_read['textReadComplete']and timer.calls==['interface','count',('text',0,13)]
node=TextNode(available=False);result=native_access.read_passive_text(node,row_text,{'characters':0});assert result['textInterfaceAvailable']is False and result['textReadComplete']
for delta in[{'role':'password text'},{'role':'protected text'},{'editable':True},{'visible':False},{'showing':False},{'role':'push button'}]:
 node=TextNode();result=native_access.read_passive_text(node,dict(row_text,**delta),{'characters':0});assert result['textSkipReason']and not node.calls
for node,budget in[(TextNode(count=8193),{'characters':0}),(TextNode(),{'characters':65530}),(TextNode(count=-1),{'characters':0}),(TextNode(count=14),{'characters':0}),(TextNode(error=True),{'characters':0})]:
 result=native_access.read_passive_text(node,row_text,budget);assert not result['textReadComplete']and result['nativeText']is None and result['textReadError']
row={'pid':1,'ppid':2,'startTicks':'3','executablePath':'/usr/bin/fbones','sha256':'a'*64,'device':1,'inode':2}
assert same(row,dict(row,ppid=4))
for key,value in[('pid',2),('startTicks','4'),('sha256','b'*64),('inode',3)]:assert not same(row,dict(row,**{key:value}))
class JoinedThread:
 def join(self,timeout):pass
 def is_alive(self):return False
observer=SuccessorObserver.__new__(SuccessorObserver);observer.stop_event=threading.Event();observer.thread=JoinedThread();observer.error='late second successor'
try:observer.finish()
except ValueError:pass
else:raise AssertionError('Late observer failure promoted to success')
spec=importlib.util.spec_from_file_location('own_static_target',BASE/'prepare-target.py');target=importlib.util.module_from_spec(spec);spec.loader.exec_module(target)
elf=bytearray(64);elf[:6]=b'\x7fELF\x02\x01';struct.pack_into('<H',elf,18,62)
with tempfile.TemporaryDirectory(prefix='fbones-own-native-tar-')as folder:
 def archive(names,binary=bytes(elf),symlink=False):
  path=Path(folder)/'own.tar'
  with tarfile.open(path,'w:')as tar:
   for name in names:
    item=tarfile.TarInfo(name)
    if symlink:item.type=tarfile.SYMTYPE;item.linkname='elsewhere'
    else:item.size=len(binary)
    tar.addfile(item,None if symlink else io.BytesIO(binary))
  return path
 for name in['usr/bin/fbones','./usr/bin/fbones']:assert target.member_from_tar(archive([name]))[0]==bytes(elf)
 for names,binary,link in[([],bytes(elf),False),(['../usr/bin/fbones'],bytes(elf),False),(['usr/bin/fbones','./usr/bin/fbones'],bytes(elf),False),(['usr/bin/fbones'],bytes(elf),True),(['usr/bin/fbones'],b'not an executable',False)]:
  try:target.member_from_tar(archive(names,binary,link))
  except(ValueError,struct.error):pass
  else:raise AssertionError('Invalid/ambiguous package native member accepted')
for path in BASE.glob('*.py'):ast.parse(path.read_text())
print(json.dumps({'passed':True,'scope':'pure Table-own-row/path/alias plus press-only strictUpdates/currentVersion selectors, late-observer/nativeText-fakeNode/metadata and synthetic package member guards only','targetExecutions':0,'networkOperations':0,'accessibilityProviderCalls':0,'temporaryTarCleaned':True}))
