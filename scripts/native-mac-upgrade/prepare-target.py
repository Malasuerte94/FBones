"""Strict static own release archive inspection; never extracts/executes an app."""
from pathlib import Path,PurePosixPath
import hashlib,json,os,plistlib,struct,sys,tarfile,urllib.request
from assets import get,Redirect

def require(ok,message):
 if not ok:raise ValueError(message)

def canonical_member(name):
 require(isinstance(name,str) and 0<len(name)<=4096 and '\x00' not in name and '\\' not in name,'Bounded POSIX archive path required')
 value=name[2:] if name.startswith('./') else name
 require(not value.startswith('/') and '//' not in value,'Relative canonical archive path required')
 parts=PurePosixPath(value).parts
 require(parts and all(p not in ['.','..'] for p in value.rstrip('/').split('/')) and parts[0]=='FBones.app','Only canonical own bundle archive paths allowed')
 return '/'.join(parts)

def validate_macho(raw):
 require(32<=len(raw)<=32*1024*1024,'Native Mach-O member size bound')
 variants={b'\xca\xfe\xba\xbe':('>',False),b'\xbe\xba\xfe\xca':('<',False),b'\xca\xfe\xba\xbf':('>',True),b'\xbf\xba\xfe\xca':('<',True)}
 require(raw[:4] in variants,'Published universal Mach-O required')
 endian,wide=variants[raw[:4]];count=struct.unpack_from(endian+'I',raw,4)[0]
 require(count==2,'Exactly universal x86_64/arm64 slices required')
 size=32 if wide else 20;end=8+count*size;require(end<=len(raw),'Truncated universal header')
 slices=[]
 for i in range(count):
  fields=struct.unpack_from(endian+('IIQQII' if wide else 'IIIII'),raw,8+i*size)
  cpu,subtype,offset,length,alignment=fields[:5]
  require(cpu in [0x01000007,0x0100000c] and end<=offset<=len(raw) and 32<=length<=len(raw)-offset and alignment<=32 and offset%(1<<alignment)==0,'Invalid bounded universal slice')
  header=struct.unpack_from('<8I',raw,offset)
  require(header[0]==0xfeedfacf and header[1]==cpu and header[3]==2,'Native little-endian64 executable slice identity differs')
  commands,command_bytes=header[4:6];require(0<commands<=8192 and 0<command_bytes<=4*1024*1024 and 32+command_bytes<=length,'Mach-O load command count/bytes invalid')
  cursor=offset+32;limit=cursor+command_bytes
  for _ in range(commands):
   require(cursor+8<=limit,'Truncated Mach-O load command')
   _,width=struct.unpack_from('<II',raw,cursor);require(width>=8 and width%4==0 and width<=limit-cursor,'Invalid Mach-O load command length');cursor+=width
  require(cursor==limit,'Mach-O load commands not fully consumed')
  slices.append({'cpuType':cpu,'cpuSubtype':subtype,'machCpuSubtype':header[2],'offset':offset,'bytes':length,'loadCommands':commands,'loadCommandBytes':command_bytes})
 require({s['cpuType'] for s in slices}=={0x01000007,0x0100000c},'Both distinct native architectures required')
 ordered=sorted(slices,key=lambda s:s['offset']);require(ordered[0]['offset']+ordered[0]['bytes']<=ordered[1]['offset'],'Universal slices overlap')
 return slices

def measure_archive(path):
 require(0<Path(path).stat().st_size<=32*1024*1024,'Published archive size bound')
 selected={};count=total=0;native='FBones.app/Contents/MacOS/fbones';info='FBones.app/Contents/Info.plist'
 with tarfile.open(path,'r:gz') as archive:
  for member in archive:
   count+=1;require(count<=8192 and 0<=member.size<=64*1024*1024,'Archive member count/size bound')
   total+=member.size;require(total<=256*1024*1024,'Archive declared total size bound')
   name=canonical_member(member.name)
   if name not in [native,info]:continue
   require(name not in selected and member.isfile() and not member.issym() and not member.islnk(),'Unique regular fixed native/plist members required')
   limit=32*1024*1024 if name==native else 1024*1024
   require(0<member.size<=limit,'Selected member byte bound');stream=archive.extractfile(member);require(stream is not None,'Selected regular member unreadable')
   with stream:raw=stream.read(limit+1)
   require(len(raw)==member.size,'Selected member length differs');selected[name]=(member.name,raw)
 require(set(selected)=={native,info},'Exactly native and Info.plist required')
 native_name,native_raw=selected[native];plist_name,plist_raw=selected[info];plist=plistlib.loads(plist_raw)
 require(isinstance(plist,dict) and plist.get('CFBundleIdentifier')=='studio.fbones.editor' and plist.get('CFBundleShortVersionString')=='0.9.6' and plist.get('CFBundleExecutable')=='fbones','Actual target bundle identity/version/executable differs')
 slices=validate_macho(native_raw)
 return {'nativeMember':native_name,'nativeBytes':len(native_raw),'nativeSha256':hashlib.sha256(native_raw).hexdigest(),'nativeFormat':'universal-Mach-O64-x86_64-arm64','nativeSlices':slices,'infoPlistMember':plist_name,'infoPlistBytes':len(plist_raw),'infoPlistSha256':hashlib.sha256(plist_raw).hexdigest(),'bundleIdentifier':plist['CFBundleIdentifier'],'bundleVersion':plist['CFBundleShortVersionString'],'bundleExecutable':plist['CFBundleExecutable'],'archiveMembers':count,'archiveDeclaredBytes':total,'selectedMembersWritten':False,'archiveExtractedToFilesystem':False,'nativeBinaryExecuted':False,'rawCiRelation':'UNKNOWN_NOT_NEEDED_FOR_EXACT_ARCHIVE_MEMBER_IDENTITY'}

def main():
 require(os.environ.get('GITHUB_ACTIONS')=='true' and os.environ.get('RUNNER_ENVIRONMENT')=='github-hosted' and os.environ.get('RUNNER_OS')=='macOS','Fresh hosted macOS only')
 root=Path(sys.argv[1]).resolve();require(root.is_relative_to(Path(os.environ['RUNNER_TEMP']).resolve()) and root!=Path(os.environ['RUNNER_TEMP']).resolve(),'Exact own runner root required')
 base=Path(__file__).resolve().parent;target=json.loads((base/'target.json').read_text());asset=target['asset']
 require(target['releaseId']==439062261 and target['tag']=='v0.9.6-beta.1' and asset['route']=='mac-updater-app' and asset['id']==727275932 and asset['nativeMemberSha256'] is None,'Frozen metadata-only updater target required')
 folder=root/'target-stock';folder.mkdir();meta=json.loads(get('https://api.github.com/repos/'+target['repository']+'/releases/tags/'+target['tag'],1024*1024))
 require(meta['id']==target['releaseId'] and meta['tag_name']==target['tag'] and not meta['draft'] and not meta['prerelease'],'Published target changed')
 rows=[r for r in meta['assets'] if r['name']==asset['name']];require(len(rows)==1,'Target archive ambiguous');row=rows[0]
 require(row['id']==asset['id'] and row['size']==asset['bytes'] and row['digest']=='sha256:'+asset['sha256'] and row['browser_download_url']==asset['assetUrl'],'Exact published target archive metadata differs')
 path=folder/asset['name'];count=0;digest=hashlib.sha256()
 with urllib.request.build_opener(Redirect()).open(urllib.request.Request(asset['assetUrl'],headers={'User-Agent':'FBones-own-static-mac-updater'}),timeout=60) as response,path.open('xb') as output:
  while True:
   block=response.read(65536)
   if not block:break
   count+=len(block);require(count<=asset['bytes'],'Target archive byte cap');digest.update(block);output.write(block)
 require(count==asset['bytes'] and digest.hexdigest()==asset['sha256'],'Exact full published archive hash differs')
 proof={'passed':True,'scope':'INDEPENDENT_MAC_UPDATER_ARCHIVE_MEMBER_BEFORE_APP_OR_INSTALL','route':'mac-updater-app','version':'0.9.6','sourceCommit':target['sourceCommit'],'releaseId':target['releaseId'],'package':asset,**measure_archive(path),'packageInstalled':False,'appLaunchedByPremeasure':False,'sourceCommitOfHelper':os.environ.get('GITHUB_SHA')}
 with(root/'reports/target-member.json').open('x') as output:json.dump(proof,output,indent=2);output.write('\n')
 print(json.dumps({'independentTargetBundleMeasured':True,'nativeSha256':proof['nativeSha256'],'nativeBytes':proof['nativeBytes']}))

if __name__=='__main__':main()
