// Exactly ONE semantic Install invocation. No hit-test, Legacy/global input or fallback.
using System;using System.Collections.Generic;using System.Diagnostics;using System.Runtime.InteropServices;using System.Text;using System.Text.RegularExpressions;using System.Threading;using System.Windows.Automation;
public sealed class OwnInstallInvokeState {
 public bool Reserved,PreflightVerified,PatternAvailable,Attempted,Returned,Completed,HasExceptionResult;
 public int LeaseState,CapturedNodes,ExceptionHResult,RootPid,ProviderPid;
 public long Root,Created;public int[] RuntimeId;public string Name,Apartment="MTA",Error,ExceptionType,AttemptedUtc,ReturnedUtc;
 public OwnInstallInvokeState Copy(){return (OwnInstallInvokeState)MemberwiseClone();}
}
public static class OwnInstallInvoke {
 [DllImport("kernel32.dll")]static extern uint WaitForSingleObject(IntPtr h,uint timeout);
 [DllImport("kernel32.dll",SetLastError=true)]static extern bool GetProcessTimes(IntPtr h,out long a,out long b,out long c,out long d);
 [DllImport("user32.dll")]static extern bool IsWindowVisible(IntPtr h);
 [DllImport("user32.dll")]static extern bool IsWindowEnabled(IntPtr h);
 [DllImport("user32.dll")]static extern uint GetWindowThreadProcessId(IntPtr h,out uint pid);
 [DllImport("user32.dll")]static extern IntPtr GetAncestor(IntPtr h,uint flags);
 static readonly object gate=new object();static int started,lease;static OwnInstallInvokeState state;static Thread worker;
 public static bool Started {get{return Interlocked.CompareExchange(ref started,0,0)!=0;}}
 public static OwnInstallInvokeState Status(){lock(gate){if(state==null)return null;var copy=state.Copy();copy.LeaseState=Interlocked.CompareExchange(ref lease,0,0);return copy;}}
 public static bool CancelPending(){return Interlocked.CompareExchange(ref lease,2,0)==0;} // 0Pending -> 2Canceled beats a late preflight.
 static bool Allowed(int p,int[] values){foreach(int n in values)if(n==p&&p>0)return true;return false;}
 static bool Equal(int[] a,int[] b){if(a==null||b==null||a.Length!=b.Length)return false;for(int i=0;i<a.Length;i++)if(a[i]!=b[i])return false;return true;}
 static void Retained(IntPtr process,long created,IntPtr root,int pid){long a,b,c,d;uint owner;if(WaitForSingleObject(process,0)!=258||!GetProcessTimes(process,out a,out b,out c,out d)||a!=created||!IsWindowVisible(root)||!IsWindowEnabled(root)||GetWindowThreadProcessId(root,out owner)==0||owner!=pid||GetAncestor(root,2)!=root)throw new Exception("Retained own Install process/start/root changed");}
 sealed class Pending {public AutomationElement Element;public int Depth;}
 static AutomationElement Find(IntPtr root,int pid,int[] allowed,int provider,int[] runtime){
  var first=AutomationElement.FromHandle(root);var f=first.Current;if(f.ProcessId!=pid||f.NativeWindowHandle!=root.ToInt64()||f.ControlType!=ControlType.Window||f.ClassName!="Tauri Window"||f.Name!="FBones")throw new Exception("Exact owned blank FBones root required");
  var queue=new Queue<Pending>();queue.Enqueue(new Pending{Element=first,Depth=0});var walker=TreeWalker.RawViewWalker;var clock=Stopwatch.StartNew();int count=0,matches=0;AutomationElement selected=null;var text=new StringBuilder();
  while(queue.Count>0){if(++count>1024||clock.ElapsedMilliseconds>=15000)throw new Exception("Complete Install preflight node/time cap");if(Interlocked.CompareExchange(ref lease,0,0)==2)throw new OperationCanceledException("Pending Install canceled before call");var item=queue.Dequeue();var c=item.Element.Current;if(!Allowed(c.ProcessId,allowed))throw new Exception("Foreign Install UIA provider");var name=c.Name??"";if(name.Length>1024)throw new Exception("Install UIA string cap");if(!c.IsOffscreen){if(text.Length+name.Length+1>65536)throw new Exception("Install visible metadata character cap");text.AppendLine(name);}
   var id=item.Element.GetRuntimeId();if(id==null||id.Length<1||id.Length>64)throw new Exception("Install RuntimeID bound");
   if(Equal(id,runtime)){matches++;if(c.ProcessId!=provider||c.ControlType!=ControlType.Button||name!="Install and restart"||!c.IsEnabled||c.IsOffscreen)throw new Exception("Current exact Install button changed");selected=item.Element;}
   var child=walker.GetFirstChild(item.Element);if(child!=null&&item.Depth>=32)throw new Exception("Install UIA depth cap");while(child!=null){if(queue.Count+count>=1024)throw new Exception("Install UIA node cap");queue.Enqueue(new Pending{Element=child,Depth=item.Depth+1});child=walker.GetNextSibling(child);}
   lock(gate){state.CapturedNodes=count;}
  }
  var visible=text.ToString();if(matches!=1||selected==null||!Regex.IsMatch(visible,@"Current\s+version:\s*0\.9\.5\b")||!visible.Contains("Version 0.9.6 is ready to install.")||visible.Contains("The viewport could not start.")||visible.Contains("Opening workspace")||visible.Contains("Automatic updates are unavailable for this copy."))throw new Exception("Complete clean Current0.9.5/Ready0.9.6 Install state unqualified");return selected;
 }
 public static void Begin(long hwnd,int pid,IntPtr process,long created,int[] allowed,int provider,int[] runtime){
  if(Interlocked.CompareExchange(ref started,1,0)!=0)throw new Exception("One Install Invoke slot already consumed");
  lock(gate){state=new OwnInstallInvokeState{Reserved=true,Root=hwnd,RootPid=pid,Created=created,ProviderPid=provider,RuntimeId=runtime==null?null:(int[])runtime.Clone(),Name="Install and restart"};}
  if(hwnd==0||pid<=0||created<=0||runtime==null||runtime.Length<1||runtime.Length>64||!Allowed(pid,allowed)||!Allowed(provider,allowed)){CancelPending();lock(gate){state.Completed=true;state.Error="Invalid Install Invoke reservation";}throw new Exception("Invalid Install reservation");}
  var owners=(int[])allowed.Clone();var wanted=(int[])runtime.Clone();
  worker=new Thread(()=>{
   try{
    var root=new IntPtr(hwnd);Retained(process,created,root,pid);var element=Find(root,pid,owners,provider,wanted);object raw;
    if(!element.TryGetCurrentPattern(InvokePattern.Pattern,out raw)||!(raw is InvokePattern))throw new Exception("Current SDK InvokePattern unavailable");
    var c=element.Current;if(c.ProcessId!=provider||c.ControlType!=ControlType.Button||c.Name!="Install and restart"||!c.IsEnabled||c.IsOffscreen||!Equal(element.GetRuntimeId(),wanted))throw new Exception("Immediate pre-call Install element changed");Retained(process,created,root,pid);
    lock(gate){state.PreflightVerified=true;state.PatternAvailable=true;}
    // Atomic Pending -> Invoking commits the sole call; a prior caller cancellation prevents dispatch.
    if(Interlocked.CompareExchange(ref lease,1,0)!=0)throw new OperationCanceledException("Canceled Install lease; no call");
    Retained(process,created,root,pid);lock(gate){state.Attempted=true;state.AttemptedUtc=DateTime.UtcNow.ToString("o");}
    ((InvokePattern)raw).Invoke();lock(gate){state.Returned=true;state.ReturnedUtc=DateTime.UtcNow.ToString("o");}
   }catch(Exception error){lock(gate){state.Error=error.Message.Length>2048?error.Message.Substring(0,2048):error.Message;state.ExceptionType=error.GetType().FullName;state.HasExceptionResult=true;state.ExceptionHResult=error.HResult;}}
   finally{lock(gate){state.Completed=true;}}
  });worker.IsBackground=true;worker.SetApartmentState(ApartmentState.MTA);
  try{worker.Start();}catch{CancelPending();lock(gate){state.Completed=true;state.Error="Own Invoke worker could not start";}throw;}
 }
}
