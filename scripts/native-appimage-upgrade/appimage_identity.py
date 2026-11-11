"""Read-only own AppImage/FUSE association; no launch, extraction or global PID scan."""
from pathlib import Path
import hashlib,json,os,re

def require(ok,message):
 if not ok:raise ValueError(message)
def sha(path):
 digest=hashlib.sha256()
 with Path(path).open('rb')as stream:
  for block in iter(lambda:stream.read(1024*1024),b''):digest.update(block)
 return digest.hexdigest()
def installed_path(root):return Path(root).resolve()/'installed/FBones.AppImage'
def native_candidate(row):return row['executablePath'].removesuffix(' (deleted)').endswith('/usr/bin/fbones')
def unescape_mount(value):
 return re.sub(r'\\([0-7]{3})',lambda m:chr(int(m[1],8)),value)
def associate(pid,root,native_sha,outer_sha):
 root=Path(root).resolve();outer=installed_path(root);require(outer.is_file()and not outer.is_symlink()and outer.resolve()==outer,'Exact own regular installed image required');require(sha(outer)==outer_sha,'Whole installed AppImage hash changed')
 proc=Path('/proc')/str(pid);stat_before=(proc/'stat').read_text();start_before=stat_before[stat_before.rfind(')')+2:].split()[19];require(proc.stat().st_uid==os.getuid(),'Native UID differs from own runner');raw=(proc/'environ').read_bytes();require(len(raw)<=128*1024,'Native environment byte bound');entries=[v.split(b'=',1)for v in raw.split(b'\0')if b'='in v];values={}
 for key in[b'APPIMAGE',b'APPDIR']:
  matches=[v for k,v in entries if k==key];require(len(matches)==1 and 0<len(matches[0])<=4096,'Unique bounded '+key.decode()+' required');values[key.decode()]=os.fsdecode(matches[0])
 require(values['APPIMAGE']==str(outer),'Native APPIMAGE differs from exact own image');directory=Path(values['APPDIR']);require(directory.is_absolute()and directory.resolve()==directory and directory.is_dir(),'Canonical live APPDIR required')
 native=directory/'usr/bin/fbones';exe=proc/'exe';actual=os.readlink(exe);require(not actual.endswith(' (deleted)')and actual==str(native),'Mounted native path differs from APPDIR fixed member');a=exe.stat();b=native.stat();require(a.st_ino>0 and(a.st_dev,a.st_ino)==(b.st_dev,b.st_ino)and 0<a.st_size<=32*1024*1024 and sha(exe)==native_sha,'Mounted native member file identity/hash differs')
 text=(proc/'mountinfo').read_text();require(len(text.encode())<=512*1024,'Own mount metadata byte bound');mounts=[]
 for line in text.splitlines():
  fields=line.split();separator=fields.index('-');require(len(fields)>=separator+4,'Malformed own mount entry')
  if unescape_mount(fields[4])==str(directory):mounts.append({'mountId':fields[0],'parentMountId':fields[1],'majorMinor':fields[2],'root':unescape_mount(fields[3]),'mountPoint':unescape_mount(fields[4]),'fileSystem':fields[separator+1],'source':unescape_mount(fields[separator+2]),'options':fields[5]})
 require(len(mounts)==1 and(mounts[0]['fileSystem']=='fuse'or mounts[0]['fileSystem'].startswith('fuse.')),'Unique actual FUSE APPDIR mount required')
 stat=outer.stat();stat_after=(proc/'stat').read_text();require(stat_after[stat_after.rfind(')')+2:].split()[19]==start_before,'Native kernel start changed during association');return{'startTicks':start_before,'pid':pid,'uid':os.getuid(),'appimage':str(outer),'outerSha256':outer_sha,'outerBytes':stat.st_size,'outerDevice':stat.st_dev,'outerInode':stat.st_ino,'appdir':str(directory),'nativePath':actual,'nativeSha256':native_sha,'nativeBytes':a.st_size,'nativeDevice':a.st_dev,'nativeInode':a.st_ino,'mount':mounts[0],'association':'same-created-descendant environment APPIMAGE + live APPDIR FUSE mount + exact native member file identity','mountSourceEqualsOuterPath':mounts[0]['source']==str(outer),'extractAndRun':False}
def expected_outer(root,phase):
 root=Path(root)
 if phase=='old-0.9.5':return json.loads((root/'reports/stock-package.json').read_text())['asset']['sha256']
 require(phase=='fresh-0.9.6-persistence','Unknown fixed AppImage phase');return json.loads((root/'reports/target-member.json').read_text())['package']['sha256']
