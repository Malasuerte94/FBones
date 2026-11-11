using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;
using System.Threading;
using System.Windows.Automation;

public sealed class OwnRectPlan {
 public long Root, Child;
 public int RootPid, ProviderPid, Width, Height, ScreenX, ScreenY, ClientX, ClientY;
 public double[] ButtonRect;
 public int[] RuntimeId;
 public string Name;
 public List<long> ChildChain=new List<long>();
 public List<int> ChildOwners=new List<int>();
 public bool CoordinateRoundtrip, PhysicalDpiContext, CurrentUiaHitAssociation;
}
public sealed class OwnMessageAttempt {
 public bool Reserved, Returned;
 public int AttemptedMessages, SuccessfulPosts;
 public long ForegroundBefore, ForegroundAfter, ForegroundObservedFileTime;
 public int ForegroundBeforePid,ForegroundAfterPid;public bool NaturalForegroundPending;
 public List<uint> MessageIds=new List<uint>();
}
public static class OwnRectClick {
 [StructLayout(LayoutKind.Sequential)] public struct Rect {public int L,T,R,B;}
 [StructLayout(LayoutKind.Sequential)] public struct Point {public int X,Y;}
 [DllImport("user32.dll",SetLastError=true)] static extern IntPtr SetThreadDpiAwarenessContext(IntPtr value);
 [DllImport("user32.dll")] static extern IntPtr GetThreadDpiAwarenessContext();
 [DllImport("user32.dll")] static extern int GetAwarenessFromDpiAwarenessContext(IntPtr value);
 [DllImport("user32.dll",SetLastError=true)] static extern bool GetWindowRect(IntPtr h,out Rect value);
 [DllImport("user32.dll",SetLastError=true)] static extern bool GetClientRect(IntPtr h,out Rect value);
 [DllImport("user32.dll",SetLastError=true)] static extern bool ScreenToClient(IntPtr h,ref Point value);
 [DllImport("user32.dll",SetLastError=true)] static extern bool ClientToScreen(IntPtr h,ref Point value);
 [DllImport("user32.dll")] static extern IntPtr ChildWindowFromPointEx(IntPtr h,Point point,uint flags);
 [DllImport("user32.dll")] static extern IntPtr GetAncestor(IntPtr h,uint flags);
 [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr h,out uint pid);
 [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr h);
 [DllImport("user32.dll")] static extern bool IsWindowEnabled(IntPtr h);
 [DllImport("user32.dll")] static extern IntPtr GetForegroundWindow();
 [DllImport("user32.dll",SetLastError=true)] static extern bool PostMessage(IntPtr h,uint message,IntPtr w,IntPtr l);
 [DllImport("user32.dll",SetLastError=true)] static extern bool PrintWindow(IntPtr h,IntPtr dc,uint flags);
 [DllImport("kernel32.dll",SetLastError=true)] static extern bool GetProcessTimes(IntPtr h,out long created,out long exited,out long kernel,out long user);
 [DllImport("kernel32.dll")] static extern uint WaitForSingleObject(IntPtr h,uint milliseconds);
 static readonly HashSet<string> reserved=new HashSet<string>();
 static readonly HashSet<string> permitted=new HashSet<string>{"old-open","old-updates","clean-install","automatic-updates","fresh-open","fresh-updates"};
 public static OwnMessageAttempt LastAttempt;
 public static bool InitializeDpi(){
  if(SetThreadDpiAwarenessContext(new IntPtr(-4))==IntPtr.Zero)throw new Exception("Per-monitor aware thread context unavailable");
  if(GetAwarenessFromDpiAwarenessContext(GetThreadDpiAwarenessContext())!=2)throw new Exception("Physical DPI context not current");return true;
 }
 static bool Allowed(int value,int[] values){foreach(int p in values)if(p==value&&p>0)return true;return false;}
 static bool Equal(int[] a,int[] b){if(a==null||b==null||a.Length!=b.Length)return false;for(int i=0;i<a.Length;i++)if(a[i]!=b[i])return false;return true;}
 static bool Finite(double x){return !Double.IsNaN(x)&&!Double.IsInfinity(x);}
 public static int[] CheckedCenter(double left,double top,double width,double height,int rootLeft,int rootTop,int rootRight,int rootBottom){
  if(!Finite(left)||!Finite(top)||!Finite(width)||!Finite(height)||width<1||height<1||width>4096||height>4096||rootRight<=rootLeft||rootBottom<=rootTop)throw new Exception("Invalid rectangle");
  double right=left+width,bottom=top+height;
  if(!Finite(right)||!Finite(bottom)||left<rootLeft||top<rootTop||right>rootRight||bottom>rootBottom)throw new Exception("Button outside own physical window");
  int x=checked((int)Math.Floor(left+width/2)),y=checked((int)Math.Floor(top+height/2));
  if(x<left||x>=right||y<top||y>=bottom)throw new Exception("No integral interior point");return new[]{x,y};
 }
 public static void Retained(IntPtr process,long created){long a,b,c,d;if(WaitForSingleObject(process,0)!=258||!GetProcessTimes(process,out a,out b,out c,out d)||a!=created)throw new Exception("Retained process identity changed");}
 static void Window(IntPtr root,int pid){uint p;if(!IsWindowVisible(root)||!IsWindowEnabled(root)||GetWindowThreadProcessId(root,out p)==0||p!=pid||GetAncestor(root,2)!=root)throw new Exception("Own visible enabled root identity changed");}
 sealed class Pending {public AutomationElement Element;public int Depth;}
 static AutomationElement Find(IntPtr root,int pid,int[] allowed,int provider,int[] runtime,string name){
  var element=AutomationElement.FromHandle(root);if(element.Current.ProcessId!=pid||element.Current.NativeWindowHandle!=root.ToInt64())throw new Exception("UIA root identity mismatch");
  var q=new Queue<Pending>();q.Enqueue(new Pending{Element=element,Depth=0});var walker=TreeWalker.RawViewWalker;var clock=Stopwatch.StartNew();AutomationElement result=null;int count=0,matches=0;
  while(q.Count>0){
   if(++count>1024||clock.ElapsedMilliseconds>=15000)throw new Exception("Complete current UIA inventory bound exceeded");
   var item=q.Dequeue();var current=item.Element.Current;if(!Allowed(current.ProcessId,allowed))throw new Exception("Foreign UIA provider");
   if(Equal(item.Element.GetRuntimeId(),runtime)){
    matches++;if(current.ProcessId!=provider||current.ControlType!=ControlType.Button||current.Name!=name||!current.IsEnabled||current.IsOffscreen)throw new Exception("Fresh selected UIA button changed");result=item.Element;
   }
   var child=walker.GetFirstChild(item.Element);if(child!=null&&item.Depth>=32)throw new Exception("UIA depth bound");
   while(child!=null){if(q.Count+count>=1024)throw new Exception("UIA node bound");q.Enqueue(new Pending{Element=child,Depth=item.Depth+1});child=walker.GetNextSibling(child);}
  }
  if(matches!=1||result==null)throw new Exception("Exact unique current RuntimeID unavailable");return result;
 }
 public static OwnRectPlan Plan(long rootValue,int pid,int[] allowed,int provider,int[] runtime,string name){
  if(GetAwarenessFromDpiAwarenessContext(GetThreadDpiAwarenessContext())!=2)throw new Exception("Physical thread context changed");
  if(runtime==null||runtime.Length<1||runtime.Length>64||!Allowed(pid,allowed)||!Allowed(provider,allowed))throw new Exception("Invalid owned selection");
  IntPtr root=new IntPtr(rootValue);Window(root,pid);var button=Find(root,pid,allowed,provider,runtime,name);Rect window;
  if(!GetWindowRect(root,out window)||window.R-window.L<100||window.B-window.T<100||window.R-window.L>4096||window.B-window.T>4096)throw new Exception("Own window physical bounds unavailable");
  var bounds=button.Current.BoundingRectangle;var point=CheckedCenter(bounds.Left,bounds.Top,bounds.Width,bounds.Height,window.L,window.T,window.R,window.B);
  var hit=AutomationElement.FromPoint(new System.Windows.Point(point[0],point[1]));bool associated=false;var walker=TreeWalker.RawViewWalker;
  for(int depth=0;depth<64&&hit!=null;depth++){if(!Allowed(hit.Current.ProcessId,allowed))throw new Exception("Foreign current UIA hit/ancestor");if(Equal(hit.GetRuntimeId(),runtime)){associated=true;break;}hit=walker.GetParent(hit);}
  if(!associated)throw new Exception("Physical UIA hit does not resolve to selected button or descendant");
  var result=new OwnRectPlan{Root=rootValue,RootPid=pid,ProviderPid=provider,RuntimeId=runtime,Name=name,Width=window.R-window.L,Height=window.B-window.T,ScreenX=point[0],ScreenY=point[1],ButtonRect=new[]{bounds.Left,bounds.Top,bounds.Width,bounds.Height},PhysicalDpiContext=true,CurrentUiaHitAssociation=true};
  IntPtr h=root;bool finished=false;
  for(int i=0;i<16;i++){
   uint owner;if(GetAncestor(h,2)!=root||!IsWindowVisible(h)||!IsWindowEnabled(h)||GetWindowThreadProcessId(h,out owner)==0||!Allowed((int)owner,allowed))throw new Exception("Foreign or disabled child in own point chain");
   result.ChildChain.Add(h.ToInt64());result.ChildOwners.Add((int)owner);
   Point local=new Point{X=point[0],Y=point[1]};if(!ScreenToClient(h,ref local))throw new Exception("ScreenToClient failed");var roundtrip=local;if(!ClientToScreen(h,ref roundtrip)||roundtrip.X!=point[0]||roundtrip.Y!=point[1])throw new Exception("Physical coordinate roundtrip failed");
   Rect client;if(!GetClientRect(h,out client)||local.X<client.L||local.Y<client.T||local.X>=client.R||local.Y>=client.B||local.X<0||local.Y<0||local.X>32767||local.Y>32767)throw new Exception("Child point outside client or signed message range");
   var next=ChildWindowFromPointEx(h,local,7);if(next==IntPtr.Zero||next==h){result.Child=h.ToInt64();result.ClientX=local.X;result.ClientY=local.Y;result.CoordinateRoundtrip=true;finished=true;break;}h=next;
  }
  if(!finished)throw new Exception("Owned child traversal did not terminate");Window(root,pid);return result;
 }
 public static int Capture(long rootValue,int pid,string output){
  var root=new IntPtr(rootValue);Window(root,pid);Rect r;if(!GetWindowRect(root,out r))throw new Exception("Own capture rectangle missing");int w=r.R-r.L,h=r.B-r.T;if(w<100||h<100||w>4096||h>4096)throw new Exception("Own capture bounds exceeded");
  using(var bitmap=new Bitmap(w,h,PixelFormat.Format32bppArgb)){
   using(var graphics=Graphics.FromImage(bitmap)){IntPtr dc=graphics.GetHdc();try{if(!PrintWindow(root,dc,2))throw new Exception("Owned PrintWindow failed");}finally{graphics.ReleaseHdc(dc);}}
   var colors=new HashSet<int>();for(int y=0;y<h;y+=Math.Max(1,h/20))for(int x=0;x<w;x+=Math.Max(1,w/20))colors.Add(bitmap.GetPixel(x,y).ToArgb());if(colors.Count<3)throw new Exception("Own native capture is blank/unqualified");
   using(var file=new System.IO.FileStream(output,System.IO.FileMode.CreateNew,System.IO.FileAccess.Write)){bitmap.Save(file,ImageFormat.Png);if(file.Length>4*1024*1024)throw new Exception("Own capture exceeds4MiB");}return colors.Count;
  }
 }
 public static string Click(string step,OwnRectPlan prepared,IntPtr process,long created,int[] allowed){
  LastAttempt=null; // A new named step must never report a previous step's submissions.
  if(!permitted.Contains(step))throw new Exception("Unknown finite core action");
  Retained(process,created);var p=Plan(prepared.Root,prepared.RootPid,allowed,prepared.ProviderPid,prepared.RuntimeId,prepared.Name);
  if(p.Child!=prepared.Child||p.ScreenX!=prepared.ScreenX||p.ScreenY!=prepared.ScreenY||p.ClientX!=prepared.ClientX||p.ClientY!=prepared.ClientY||p.Width!=prepared.Width||p.Height!=prepared.Height)throw new Exception("Point/child/window changed after capture");
  for(int i=0;i<4;i++)if(p.ButtonRect[i]!=prepared.ButtonRect[i])throw new Exception("Fresh UIA rectangle changed");
  lock(reserved){if(!reserved.Add(step))throw new Exception("One named targeted click already reserved");}
  var foreground=GetForegroundWindow();var h=new IntPtr(p.Child);var packed=new IntPtr((p.ClientY<<16)|(p.ClientX&65535));
  uint foregroundOwner;GetWindowThreadProcessId(foreground,out foregroundOwner);LastAttempt=new OwnMessageAttempt{Reserved=true,ForegroundBefore=foreground.ToInt64(),ForegroundBeforePid=(int)foregroundOwner};
  foreach(uint message in new uint[]{0x200,0x201,0x202}){Retained(process,created);Window(new IntPtr(p.Root),p.RootPid);uint owner;if(GetAncestor(h,2)!=new IntPtr(p.Root)||GetWindowThreadProcessId(h,out owner)==0||!Allowed((int)owner,allowed))throw new Exception("Target ownership changed before message");LastAttempt.MessageIds.Add(message);LastAttempt.AttemptedMessages++;if(!PostMessage(h,message,message==0x201?new IntPtr(1):IntPtr.Zero,packed))throw new Exception("Targeted message submission failed; no retry");LastAttempt.SuccessfulPosts++;Thread.Sleep(80);}
  LastAttempt.ForegroundAfter=GetForegroundWindow().ToInt64();GetWindowThreadProcessId(new IntPtr(LastAttempt.ForegroundAfter),out foregroundOwner);LastAttempt.ForegroundAfterPid=(int)foregroundOwner;LastAttempt.ForegroundObservedFileTime=DateTime.UtcNow.ToFileTimeUtc();if(LastAttempt.ForegroundAfter!=LastAttempt.ForegroundBefore){if(step!="old-open"&&step!="fresh-open"&&step!="clean-install")throw new Exception("Unexpected foreground change after Updates click");LastAttempt.NaturalForegroundPending=true;}LastAttempt.Returned=true;return "ONE_OWNED_TARGETED_MESSAGE_SEQUENCE_POSTED_EFFECT_REQUIRES_INDEPENDENT_READBACK";
 }
 public static int PureSelftest(){int count=0;var good=CheckedCenter(100,40,20,10,0,0,800,600);if(good[0]!=110||good[1]!=45)throw new Exception("Center test");count++;
  foreach(var bad in new[]{new double[]{Double.NaN,0,20,20},new double[]{0,0,Double.PositiveInfinity,20},new double[]{-1,0,20,20},new double[]{0,0,0,20},new double[]{790,0,20,20}}){bool declined=false;try{CheckedCenter(bad[0],bad[1],bad[2],bad[3],0,0,800,600);}catch{declined=true;}if(!declined)throw new Exception("Invalid rectangle accepted");count++;}return count;}
}
