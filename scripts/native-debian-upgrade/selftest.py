"""Pure selectors/metadata and own synthetic TAR only; no target/provider calls."""
import ast,importlib.util,io,json,struct,sys,tarfile,tempfile,threading
from pathlib import Path
sys.dont_write_bytecode=True
BASE=Path(__file__).resolve().parent
import native_access
from lifecycle import SuccessorObserver,same

native_access.selftest()
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
print(json.dumps({'passed':True,'scope':'pure selector/late-observer/metadata and synthetic package member guards only','targetExecutions':0,'networkOperations':0,'accessibilityProviderCalls':0,'temporaryTarCleaned':True}))
