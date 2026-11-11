"""Static independent fixed AppImage member measurement, before app/install."""
from pathlib import Path
import hashlib,json,mmap,os,re,struct,subprocess,sys,urllib.request
from assets import get,Redirect

def require(ok,message):
 if not ok:raise ValueError(message)
def squashfs_offset(data):
 require(data[:4]==b'\x7fELF'and data[8:11]==b'AI\x02','Type2 AppImage runtime required');valid=[];pos=data.find(b'hsqs');seen=0
 while pos>=0:
  seen+=1;require(seen<=64,'Squashfs signature count cap')
  if pos+96<=len(data):
   h=struct.unpack_from('<5I6H8Q',data,pos)
   if h[9:11]==(4,0)and h[1]>0 and 4096<=h[3]<=1048576 and h[3]&(h[3]-1)==0 and h[6]==h[3].bit_length()-1 and h[5]in[1,2,3,4,5,6]and 96<=h[12]<=len(data)-pos:valid.append(pos)
  pos=data.find(b'hsqs',pos+1)
 require(len(valid)==1,'Unique valid Squashfs superblock required');return valid[0]
def validate_listing(text):
 require(len(text.encode())<=64*1024,'Member listing byte cap');lines=[s for s in text.splitlines()if s.endswith(' squashfs-root/usr/bin/fbones')];require(len(lines)==1 and re.match(r'^-[-rwxstST]{9}\s+',lines[0]),'Unique fixed regular native member required')
 fields=lines[0].split();require(len(fields)>=6 and fields[-1]=='squashfs-root/usr/bin/fbones'and fields[2].isdigit()and 0<int(fields[2])<=32*1024*1024,'Fixed native member size/path invalid');return int(fields[2])
def validate_native(native,size):
 require(len(native)==size and len(native)>=64 and native[:6]==b'\x7fELF\x02\x01'and struct.unpack_from('<H',native,18)[0]==62,'Native ELF64 x86_64 identity required')
def measure(package):
 require(0<Path(package).stat().st_size<=128*1024*1024,'Static AppImage size bound')
 with Path(package).open('rb')as stream,mmap.mmap(stream.fileno(),0,access=mmap.ACCESS_READ)as data:offset=squashfs_offset(data)
 listing=subprocess.run(['unsquashfs','-ll','-o',str(offset),str(package),'usr/bin/fbones'],stdin=subprocess.DEVNULL,capture_output=True,timeout=30);require(listing.returncode==0,'Static member listing failed');size=validate_listing(listing.stdout.decode('utf-8','strict'))
 extracted=subprocess.run(['unsquashfs','-cat','-o',str(offset),str(package),'usr/bin/fbones'],stdin=subprocess.DEVNULL,capture_output=True,timeout=30);require(extracted.returncode==0,'Static fixed member reader failed');validate_native(extracted.stdout,size)
 return {'nativeMember':'usr/bin/fbones','nativeBytes':size,'nativeSha256':hashlib.sha256(extracted.stdout).hexdigest(),'squashfsOffset':offset,'validSquashfsCount':1,'memberType':'unique-regular-file','nativeFormat':'ELF64-little-endian-x86_64','memberListing':listing.stdout.decode(),'unsquashfsSha256':hashlib.sha256(Path(__import__('shutil').which('unsquashfs')).read_bytes()).hexdigest()}
def main():
 require(os.environ.get('GITHUB_ACTIONS')=='true'and os.environ.get('RUNNER_ENVIRONMENT')=='github-hosted'and os.environ.get('RUNNER_OS')=='Linux','Hosted Linux only');root=Path(sys.argv[1]).resolve();require(root.is_relative_to(Path(os.environ['RUNNER_TEMP']).resolve()),'Private run root required');base=Path(__file__).resolve().parent;target=json.loads((base/'target.json').read_text());asset=target['asset'];require(asset['route']=='linux-appimage'and asset['nativeMemberSha256']is None,'Metadata-only AppImage target required');folder=root/'target-stock';folder.mkdir();meta=json.loads(get('https://api.github.com/repos/'+target['repository']+'/releases/tags/'+target['tag'],1024*1024));require(meta['id']==target['releaseId']and meta['tag_name']==target['tag']and not meta['draft']and not meta['prerelease'],'Target release changed');found=[a for a in meta['assets']if a['name']==asset['name']];require(len(found)==1,'Target asset ambiguous');row=found[0];require(row['id']==asset['id']and row['size']==asset['bytes']and row['digest']=='sha256:'+asset['sha256']and row['browser_download_url']==asset['assetUrl'],'Target stock asset changed');package=folder/asset['name'];count=0;digest=hashlib.sha256()
 with urllib.request.build_opener(Redirect()).open(urllib.request.Request(asset['assetUrl'],headers={'User-Agent':'FBones-native-upgrade-stock-measurement'}),timeout=60)as response,package.open('xb')as output:
  while True:
   block=response.read(65536)
   if not block:break
   count+=len(block);require(count<=asset['bytes'],'Target package size exceeded');digest.update(block);output.write(block)
 require(count==asset['bytes']and digest.hexdigest()==asset['sha256'],'Target full AppImage hash differs');proof={'passed':True,'scope':'INDEPENDENT_PACKAGE_MEMBER_BEFORE_INSTALL_ONLY','version':'0.9.6','route':'linux-appimage','tag':target['tag'],'sourceCommit':target['sourceCommit'],'releaseId':target['releaseId'],'package':asset,**measure(package),'nativeBinaryExecuted':False,'packageInstalled':False,'rawCiRelation':'UNKNOWN_NOT_NEEDED_FOR_FIXED_STOCK_MEMBER_IDENTITY'}
 with(root/'reports/target-member.json').open('x')as output:json.dump(proof,output,indent=2);output.write('\n')
 print(json.dumps({'independentMemberMeasuredBeforeInstall':True,'nativeSha256':proof['nativeSha256']}))
if __name__=='__main__':main()
