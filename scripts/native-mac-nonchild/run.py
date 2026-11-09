"""Actual SDK compile + ONE own fixture, dedicated hosted macOS only. No product."""
from pathlib import Path
import hashlib,json,os,platform,subprocess,sys,time
if not(sys.platform=='darwin'and os.environ.get('GITHUB_ACTIONS')=='true'and os.environ.get('RUNNER_ENVIRONMENT')=='github-hosted'and os.environ.get('RUNNER_OS')=='macOS'):raise SystemExit('Dedicated hosted macOS only; no work elsewhere')
base=Path(__file__).resolve().parent;parent=Path(os.environ['RUNNER_TEMP']).resolve();root=parent/('fbones-own-nonchild-'+os.environ['GITHUB_RUN_ID']+'-'+os.environ['GITHUB_RUN_ATTEMPT']);root.mkdir(mode=0o700);reports=root/'reports';reports.mkdir(mode=0o700);image=root/'own-nonchild';source=base/'own-nonchild.c';started=time.monotonic()
def pin(path):
 p=Path(path);return{'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()}
def write(name,value):
 raw=json.dumps(value,indent=2).encode();assert len(raw)<=65536
 with(reports/name).open('xb')as out:out.write(raw+b'\n')
def prefix(path,name):
 p=Path(path)
 target=reports/name
 if p.is_file()and not target.exists():
  remaining=max(0,65536-sum(q.stat().st_size for q in reports.glob('*-prefix.log')))
  with p.open('rb')as stream:raw=stream.read(remaining)
  target.write_bytes(raw)
proof={'passed':False,'scope':'actualSDK_compile_and_one_OWN_nonchild_only','productLaunched':False,'guiLaunched':False,'networkUsedByOwnCode':False,'signalsSent':0,'sourceBefore':pin(source),'actualMachine':platform.machine(),'actualMacVersion':platform.mac_ver()[0],'actualDarwinRelease':platform.release(),'rawLogHardByteCap':False,'aggregateRetainedLogPrefixCap':65536}
try:
 sdk=Path(subprocess.check_output(['xcrun','--sdk','macosx','--show-sdk-path'],text=True,timeout=10).strip());compiler=Path(subprocess.check_output(['xcrun','--find','clang'],text=True,timeout=10).strip());proof['compiler']=pin(compiler);proof['compilerPath']=str(compiler);proof['sdkPath']=str(sdk);proof['sdkHeaders']={n:pin(sdk/'usr/include'/n)for n in['sys/event.h','sys/proc_info.h','sys/proc.h','sys/wait.h','libproc.h','spawn.h']}
 command=[str(compiler),'-isysroot',str(sdk),'-std=gnu11','-Wall','-Wextra','-Werror','-O2',str(source),'-lproc','-o',str(image)];proof['compileCommand']=command
 with(root/'compiler.log').open('xb')as log:compiled=subprocess.run(command,stdin=subprocess.DEVNULL,stdout=log,stderr=subprocess.STDOUT,timeout=30)
 proof['compilerExitCode']=compiled.returncode;prefix(root/'compiler.log','compiler-prefix.log');write('compile.json',proof);assert compiled.returncode==0,'Actual SDK compile failed'
 image.chmod(0o500);proof['imageBefore']=pin(image);assert proof['sourceBefore']==pin(source),'Own source changed before start';write('launch-intent.json',proof)
 with(root/'controller.log').open('xb')as log:
  child=subprocess.Popen([str(image),str(root)],stdin=subprocess.DEVNULL,stdout=log,stderr=subprocess.STDOUT,close_fds=True);proof['createdControllerPid']=child.pid
  try:proof['controllerExitCode']=child.wait(timeout=55);proof['controllerTerminalObserved']=True
  except subprocess.TimeoutExpired:
   proof['controllerTerminalObserved']=False;proof['ownedControllerPreservedWithoutForce']=True;write('controller-pending.json',proof)
   # Retain this known-created child handle; never send a signal or substitute PID.
   child.wait();proof['controllerExitCode']=child.returncode;proof['controllerEventuallyExited']=True
 assert proof.get('controllerTerminalObserved')and proof['controllerExitCode']==0,'Own controller terminal0 unavailable'
 result=json.loads((reports/'result.json').read_text());proof['sourceAfter']=pin(source);proof['imageAfter']=pin(image);assert proof['sourceBefore']==proof['sourceAfter']and proof['imageBefore']==proof['imageAfter'],'Own executable/source changed';assert result['passed']and result['scope']=='OWN_known_nonchild_exit_only'and result['launcherNormalZero']and result['workerWaitpidReturn']==-1 and result['workerWaitpidErrno']==result['sdkECHILD']and result['oneAckWritten']and result['workerTerminalObserved']and result['sdkNormalExit']and result['sdkExitCode']==7 and result['signalsSent']==0 and not result['noteTrackUsed'],'Own capability receipt did not prove exact contract';assert result['controller']['pid']==child.pid and result['controller']['uid']==os.getuid(),'Retained controller identity mismatch';proof['passed']=True
except Exception as error:proof['error']=type(error).__name__+': '+str(error)
finally:
 for raw_name in ['ready.bin','ack','controller-bound']:
  raw_path=root/raw_name
  if raw_path.is_file():
   with raw_path.open('rb')as stream:raw=stream.read(4097)
   assert len(raw)<=4096,'Own tiny protocol artifact bound'
   (reports/('protocol-'+raw_name)).write_bytes(raw)
 prefix(root/'compiler.log','compiler-prefix.log');prefix(root/'controller.log','controller-prefix.log');prefix(root/'launcher.log','launcher-prefix.log');proof['seconds']=time.monotonic()-started;write('run.json',proof)
raise SystemExit(0 if proof['passed']else 2)
