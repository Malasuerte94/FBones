"""CI-only static NSIS unique-member stream; no installer/member execution."""
from pathlib import Path
import base64,hashlib,json,os,struct,subprocess,sys,threading,time,urllib.request
from assets import get,Redirect

def require(ok,message):
 if not ok:raise ValueError(message)
def digest(path):
 with Path(path).open('rb')as f:return hashlib.file_digest(f,'sha256').hexdigest()
def parse_listing(text):
 require(len(text.encode())<=512*1024,'Listing byte cap');require('\nType = Nsis\n'in '\n'+text.replace('\r\n','\n'),'Actual NSIS archive type required');parts=text.replace('\r\n','\n').split('----------\n');require(len(parts)==2,'Structured archive/member separator required');entries=[]
 for block in parts[1].strip().split('\n\n'):
  row={}
  for line in block.splitlines():
   if' = 'in line:
    k,v=line.split(' = ',1);require(k not in row,'Duplicate member property');row[k]=v
  if row:entries.append(row)
 require(len(entries)<=256,'Archive member cap');hits=[r for r in entries if r.get('Path')=='fbones.exe'];require(len(hits)==1,'One exact fixed NSIS member required');row=hits[0];require(row.get('Folder')!='+'and'D'not in row.get('Attributes','')and not any('Link'in k for k in row),'Regular nonlinked native member required');return row

def validate_pe(prefix,count):
 require(64<=count<=64*1024*1024 and len(prefix)>=64 and prefix[:2]==b'MZ','Bounded PE member required');pe=struct.unpack_from('<I',prefix,60)[0];require(64<=pe<=len(prefix)-24 and prefix[pe:pe+4]==b'PE\0\0'and struct.unpack_from('<H',prefix,pe+4)[0]==0x8664,'PE AMD64 signature required');sections=struct.unpack_from('<H',prefix,pe+6)[0];optional=struct.unpack_from('<H',prefix,pe+20)[0];require(1<=sections<=96 and optional>=112 and pe+24+optional+40*sections<=len(prefix)and struct.unpack_from('<H',prefix,pe+24)[0]==0x20b,'Bounded PE32+ section table required')
 for i in range(sections):
  at=pe+24+optional+40*i;size,offset=struct.unpack_from('<II',prefix,at+16);require(offset<=count and size<=count-offset,'Native section exceeds member bytes')

def measure(package,extractor,reports):
 dll=extractor.with_name('7z.dll');require(extractor.is_file()and dll.is_file(),'Fixed stock7z extractor/dependency required');pins={p.name:{'bytes':p.stat().st_size,'sha256':digest(p)}for p in[extractor,dll]};listing=subprocess.run([str(extractor),'l','-slt',str(package)],stdin=subprocess.DEVNULL,capture_output=True,timeout=30);require(listing.returncode==0 and not listing.stderr,'Static NSIS listing failed');raw=listing.stdout.decode('utf-8','strict');member=parse_listing(raw);(reports/'target-nsis-listing.txt').write_text(raw);state={'count':0,'digest':hashlib.sha256(),'prefix':bytearray(),'error':None};stderr=(reports/'extractor-spool.log').open('xb');child=subprocess.Popen([str(extractor),'x','-so',str(package),'fbones.exe'],stdin=subprocess.DEVNULL,stdout=subprocess.PIPE,stderr=stderr,close_fds=True)
 def drain():
  try:
   while True:
    block=child.stdout.read(65536)
    if not block:break
    state['count']+=len(block);require(state['count']<=64*1024*1024,'Native member stream byte cap');state['digest'].update(block)
    if len(state['prefix'])<65536:state['prefix'].extend(block[:65536-len(state['prefix'])])
  except Exception as error:state['error']=str(error)
 thread=threading.Thread(target=drain,daemon=True);thread.start();thread.join(30)
 require(not thread.is_alive(),'Own console extractor deadline; no installer/app executed');code=child.wait(timeout=3);stderr.close();error_path=reports/'extractor-spool.log'
 with error_path.open('rb')as f:(reports/'extractor-prefix.log').write_bytes(f.read(65536))
 require(code==0 and error_path.stat().st_size==0 and state['error']is None,'Static native-member stream failed');validate_pe(bytes(state['prefix']),state['count'])
 for p in[extractor,dll]:require(digest(p)==pins[p.name]['sha256'],'Extractor source image changed')
 return {'nativeMember':'fbones.exe','nativeBytes':state['count'],'nativeSha256':state['digest'].hexdigest(),'nativeFormat':'PE32+-AMD64','memberListing':member,'extractorPins':pins,'extractorExitCode':code,'streamedOnly':True,'memberFileWritten':False,'nativeBinaryExecuted':False,'rawSpoolHardByteCap':False}

def main():
 require(os.environ.get('GITHUB_ACTIONS')=='true'and os.environ.get('RUNNER_ENVIRONMENT')=='github-hosted'and os.environ.get('RUNNER_OS')=='Windows','Fresh hosted Windows only');root=Path(sys.argv[1]).resolve();require(root.is_relative_to(Path(os.environ['RUNNER_TEMP']).resolve()),'Own runner root required');base=Path(__file__).resolve().parent;target=json.loads((base/'target.json').read_text());asset=target['asset'];folder=root/'target-stock';folder.mkdir();meta=json.loads(get('https://api.github.com/repos/'+target['repository']+'/releases/tags/'+target['tag'],1024*1024));require(meta['id']==target['releaseId']and meta['tag_name']==target['tag']and not meta['draft']and not meta['prerelease'],'Target release changed');rows=[r for r in meta['assets']if r['name']==asset['name']];require(len(rows)==1,'Target asset ambiguous');r=rows[0];require(r['id']==asset['id']and r['size']==asset['bytes']and r['digest']=='sha256:'+asset['sha256']and r['browser_download_url']==asset['assetUrl'],'Target asset metadata changed');package=folder/asset['name'];count=0;h=hashlib.sha256()
 with urllib.request.build_opener(Redirect()).open(urllib.request.Request(asset['assetUrl'],headers={'User-Agent':'FBones-own-static-NSIS'}),timeout=60)as response,package.open('xb')as output:
  while True:
   block=response.read(65536)
   if not block:break
   count+=len(block);require(count<=asset['bytes'],'Target asset byte cap');h.update(block);output.write(block)
 require(count==asset['bytes']and h.hexdigest()==asset['sha256'],'Target full installer hash differs');extractor=Path(os.environ['ProgramFiles'])/'7-Zip/7z.exe';proof={'passed':True,'route':'windows-nsis','version':'0.9.6','package':asset,'sourceCommit':target['sourceCommit'],'releaseId':target['releaseId'],**measure(package,extractor,root/'reports'),'installerExecuted':False}
 (root/'reports/target-member.json').write_text(json.dumps(proof,indent=2)+'\n');fixture=json.loads((base/'own-existing-project.json').read_text());raw=base64.b64decode(fixture['base64'],validate=True);require(len(raw)==fixture['bytes']==405 and hashlib.sha256(raw).hexdigest()==fixture['sha256']=='e74a15b08b9cbc85f943ddde46c37c5cbceed3eb70968932ccd416697c6ecb5d','Own portable input changed');projects=root/'projects';projects.mkdir();path=projects/'own-upgrade.fbones';path.write_bytes(raw);reader=base/'parse-project.py';reader_raw=reader.read_bytes();require(len(reader_raw)<=1024*1024,'Reader source diagnostic byte cap');crlf=reader_raw.count(b'\r\n');reader_diagnostic={'readerRepoPath':'scripts/native-windows-upgrade/parse-project.py','rawBytes':len(reader_raw),'rawSha256':hashlib.sha256(reader_raw).hexdigest(),'expectedCanonicalRawSha256':fixture['semanticCheckpoint']['parserSha256'],'lfBytes':reader_raw.count(b'\n'),'crlfPairs':crlf,'bareCrBytes':reader_raw.count(b'\r')-crlf,'standaloneLfBytes':reader_raw.count(b'\n')-crlf,'strictHashNormalizationApplied':False,'checkerRawSha256':digest(base/'own-minimal-checkpoint.py'),'sourceCommit':os.environ.get('GITHUB_SHA'),'repository':os.environ.get('GITHUB_REPOSITORY'),'runId':os.environ.get('GITHUB_RUN_ID'),'runAttempt':os.environ.get('GITHUB_RUN_ATTEMPT'),'sourcePolicy':'scoped parse-project.py text eol=lf; unchanged strict raw checker pin'}
 with(root/'reports/reader-source.json').open('x')as output:json.dump(reader_diagnostic,output,indent=2);output.write('\n')
 subprocess.run([sys.executable,str(base/'own-minimal-checkpoint.py'),str(path),'--project-name',fixture['projectName'],'--bone-name',fixture['boneName'],'--root-x','37.5','--out',str(root/'reports/fixture-checkpoint.json')],check=True,timeout=20)
if __name__=='__main__':main()
