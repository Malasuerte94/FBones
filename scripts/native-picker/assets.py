"""Fetch one exact already-verified public stock installer, never execute it."""
import argparse,hashlib,json,os,platform,urllib.request,urllib.parse
from pathlib import Path
BASE=Path(__file__).resolve().parent
class Redirect(urllib.request.HTTPRedirectHandler):
 def redirect_request(self,req,fp,code,msg,headers,url):
  parsed=urllib.parse.urlparse(url)
  if parsed.scheme!='https' or not(parsed.hostname=='github.com' or (parsed.hostname or '').endswith('.githubusercontent.com')):raise ValueError('Unexpected download origin')
  return super().redirect_request(req,fp,code,msg,headers,url)
class MetadataNoRedirect(urllib.request.HTTPRedirectHandler):
 def redirect_request(self,req,fp,code,msg,headers,url):raise ValueError('Authenticated metadata redirect refused')
def get(url,limit):
 parsed=urllib.parse.urlparse(url)
 if parsed.scheme!='https'or parsed.hostname!='api.github.com'or parsed.port is not None:raise ValueError('Exact HTTPS api.github.com metadata origin required')
 token=os.environ.get('FBONES_METADATA_TOKEN')
 if not token:raise ValueError('Ephemeral Actions read-only metadata token required')
 request=urllib.request.Request(url,headers={'User-Agent':'FBones-native-capability','Accept':'application/vnd.github+json','Authorization':'Bearer '+token})
 with urllib.request.build_opener(MetadataNoRedirect()).open(request,timeout=60)as r:data=r.read(limit+1)
 if len(data)>limit:raise ValueError('Bounded metadata response exceeded')
 return data
def main():
 p=argparse.ArgumentParser();p.add_argument('route');p.add_argument('--root',required=True,type=Path);a=p.parse_args();pins=json.loads((BASE/'assets.json').read_text());row=pins['routes'][a.route];asset=row['asset'];root=a.root.resolve()
 if os.environ.get('GITHUB_ACTIONS')!='true' or os.environ.get('RUNNER_ENVIRONMENT')!='github-hosted':raise ValueError('Dedicated ephemeral GitHub-hosted VM required; never run on personal host')
 if not root.is_relative_to(Path(os.environ['RUNNER_TEMP']).resolve()) or root.exists():raise ValueError('Fresh private runner TEMP directory required')
 root.mkdir();(root/'reports').mkdir();repo=pins['repository'];meta=json.loads(get(f'https://api.github.com/repos/{repo}/releases/tags/{pins["oldTag"]}',1024*1024))
 if meta['id']!=pins['oldReleaseId'] or meta['tag_name']!=pins['oldTag']or meta['draft']or meta['prerelease']:raise ValueError('Stock release identity changed')
 current=next(x for x in meta['assets']if x['name']==asset['name']);url=f'https://github.com/{repo}/releases/download/{pins["oldTag"]}/{asset["name"]}'
 if current['id']!=asset['id']or current['size']!=asset['bytes']or current['digest']!='sha256:'+asset['sha256']or current['browser_download_url']!=url:raise ValueError('Published stock asset changed')
 digest=hashlib.sha256();count=0
 with urllib.request.build_opener(Redirect()).open(urllib.request.Request(url,headers={'User-Agent':'FBones-native-capability'}),timeout=60)as r,(root/asset['name']).open('xb')as f:
  while True:
   b=r.read(1024*1024)
   if not b:break
   count+=len(b)
   if count>asset['bytes']:raise ValueError('Stock asset size exceeded')
   f.write(b);digest.update(b)
 if count!=asset['bytes']or digest.hexdigest()!=asset['sha256']:raise ValueError('Stock package digest mismatch')
 receipt={'stage':'capability-only','route':a.route,'runner':{k:os.environ.get(k)for k in ['GITHUB_RUN_ID','GITHUB_RUN_ATTEMPT','GITHUB_JOB','RUNNER_OS','RUNNER_ARCH','RUNNER_ENVIRONMENT']},'platform':platform.platform(),'tag':pins['oldTag'],'sourceCommit':pins['oldCommit'],'asset':asset,'executableSha256':row['executableSha256'],'ciReportExecutableSha256':row['ciReportExecutableSha256'],'bundleMemberIdentity':row['bundleMemberIdentity'],'noUpgradeAttempted':True}
 (root/'reports/stock-package.json').write_text(json.dumps(receipt,indent=2)+'\n');print(json.dumps({'stockPackageVerified':True,'route':a.route,'bytes':count}))
if __name__=='__main__':main()
