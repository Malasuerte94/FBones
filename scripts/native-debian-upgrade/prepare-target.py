"""Independent fixed stock-package member measurement BEFORE any installation."""
from pathlib import Path
import hashlib,io,json,os,struct,subprocess,sys,tarfile,urllib.request
from assets import get,Redirect

def require(ok,message):
 if not ok:raise ValueError(message)
def member_from_tar(path):
 require(Path(path).stat().st_size<=64*1024*1024,'Static package data size exceeded')
 with tarfile.open(path,'r:')as archive:
  members=archive.getmembers();require(len(members)<=2048,'Package member count bound');matches=[m for m in members if m.name in['usr/bin/fbones','./usr/bin/fbones']]
  require(len(matches)==1 and matches[0].isfile()and 0<matches[0].size<=32*1024*1024,'Unique fixed regular native member required')
  native=archive.extractfile(matches[0]).read(32*1024*1024+1);member=matches[0].name;size=matches[0].size
 require(len(native)==size and native[:6]==b'\x7fELF\x02\x01'and struct.unpack_from('<H',native,18)[0]==62,'Native ELF64 x86_64 identity required')
 return native,member
def main():
 require(os.environ.get('GITHUB_ACTIONS')=='true'and os.environ.get('RUNNER_ENVIRONMENT')=='github-hosted'and os.environ.get('RUNNER_OS')=='Linux','Hosted Linux only')
 root=Path(sys.argv[1]).resolve();require(root.is_relative_to(Path(os.environ['RUNNER_TEMP']).resolve()),'Private run root required')
 base=Path(__file__).resolve().parent;target=json.loads((base/'target.json').read_text());asset=target['asset'];require(asset['route']=='linux-deb'and asset['nativeMemberSha256']is None,'Metadata-only Debian target required')
 folder=root/'target-stock';folder.mkdir();meta=json.loads(get('https://api.github.com/repos/'+target['repository']+'/releases/tags/'+target['tag'],1024*1024))
 require(meta['id']==target['releaseId']and meta['tag_name']==target['tag']and not meta['draft']and not meta['prerelease'],'Target release changed')
 found=[a for a in meta['assets']if a['name']==asset['name']];require(len(found)==1,'Target asset ambiguous');row=found[0]
 require(row['id']==asset['id']and row['size']==asset['bytes']and row['digest']=='sha256:'+asset['sha256']and row['browser_download_url']==asset['assetUrl'],'Target stock asset changed')
 package=folder/asset['name'];count=0;digest=hashlib.sha256()
 with urllib.request.build_opener(Redirect()).open(urllib.request.Request(asset['assetUrl'],headers={'User-Agent':'FBones-native-upgrade-stock-measurement'}),timeout=60)as response,package.open('xb')as output:
  while True:
   block=response.read(65536)
   if not block:break
   count+=len(block);require(count<=asset['bytes'],'Target package size exceeded');digest.update(block);output.write(block)
 require(count==asset['bytes']and digest.hexdigest()==asset['sha256'],'Target package full hash differs')
 # Fixed hash-proved own package; never execute its binary or maintainer scripts.
 archive_path=folder/'data.tar'
 with archive_path.open('xb')as output:
  result=subprocess.run(['dpkg-deb','--fsys-tarfile',str(package)],stdin=subprocess.DEVNULL,stdout=output,stderr=subprocess.PIPE,timeout=30)
 require(result.returncode==0 and not result.stderr and archive_path.stat().st_size<=64*1024*1024,'Static package reader failed/size exceeded')
 native,member=member_from_tar(archive_path)
 proof={'passed':True,'scope':'INDEPENDENT_PACKAGE_MEMBER_BEFORE_INSTALL_ONLY','version':'0.9.6','route':'linux-deb','tag':target['tag'],'sourceCommit':target['sourceCommit'],'releaseId':target['releaseId'],'package':asset,'nativeMember':member,'nativeBytes':len(native),'nativeSha256':hashlib.sha256(native).hexdigest(),'nativeFormat':'ELF64-little-endian-x86_64','nativeBinaryExecuted':False,'packageInstalled':False,'rawCiRelation':'UNKNOWN_NOT_NEEDED_FOR_FIXED_STOCK_MEMBER_IDENTITY'}
 with(root/'reports/target-member.json').open('x')as output:json.dump(proof,output,indent=2);output.write('\n')
 archive_path.unlink() # Disposable static tar; fixed package+member proof retained.
 print(json.dumps({'independentMemberMeasuredBeforeInstall':True,'nativeSha256':proof['nativeSha256']}))
if __name__=='__main__':main()
