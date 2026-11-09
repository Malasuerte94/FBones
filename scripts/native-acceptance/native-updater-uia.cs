using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Text.RegularExpressions;
using System.Windows.Automation;

public sealed class OwnUiaRow {
 public int[] Path, RuntimeId;
 public int ProcessId;
 public string Name, Value, ControlType, AutomationId, ClassName, Error, NameVariant, ActionName, ActionNameVariant;
 public bool Enabled, Offscreen, OwnerAllowed, InvokeAvailable, TextTruncated;
 internal AutomationElement Element;
}
public sealed class OwnUiaInventory {
 public List<OwnUiaRow> Rows=new List<OwnUiaRow>();
 public bool Complete=true, NodeCapHit, TimeCapHit, DepthCapHit, StringCapHit, ByteCapHit, ProviderError, ForeignOwner;
 public int OriginalRowCount;
 public int MaxNodes=1024, MaxDepth=32, MaxStringChars=1024, MaxMilliseconds=15000;
 public double ElapsedMilliseconds;
 public int RootPid; public long RootHandle;
 public string RootError;
 internal AutomationElement Root;
}
public static class OwnUpdaterUia {
 // Source-derived closed grammar; byte-progress names deliberately remain unqualified.
 public static string UpdatesNameVariant(string value){
  string normalized=Regex.Replace(value??"",@"\s+"," ").Trim();
  if(normalized=="Updates")return "title";
  if(Regex.IsMatch(normalized,@"\AUpdates ?(?:0|[1-9][0-9]?|100)%\z"))return "integer-percent";
  if(Regex.IsMatch(normalized,@"\AUpdates ?Version 0\.9\.6 is ready to install\.\z"))return "ready-0.9.6";
  return null;
 }
 private sealed class Pending {public AutomationElement Element;public int[] Path;}
 private static bool Allowed(int pid,int[] allowed){foreach(int value in allowed)if(value==pid&&pid>0)return true;return false;}
 private static string Bound(string value,OwnUiaRow row,OwnUiaInventory inventory){if(value==null)return "";if(value.Length>inventory.MaxStringChars){row.TextTruncated=true;inventory.StringCapHit=true;inventory.Complete=false;return value.Substring(0,inventory.MaxStringChars);}return value;}
 public static OwnUiaInventory Capture(long hwnd,int expectedPid,int[] allowedPids) {return CaptureBudget(hwnd,expectedPid,allowedPids,15000);}
 public static OwnUiaInventory CaptureBudget(long hwnd,int expectedPid,int[] allowedPids,int maxMilliseconds) {
  if(maxMilliseconds<1||maxMilliseconds>15000)throw new ArgumentOutOfRangeException("maxMilliseconds");
  var output=new OwnUiaInventory();output.MaxMilliseconds=maxMilliseconds;output.RootHandle=hwnd;var watch=Stopwatch.StartNew();
  try {
   output.Root=AutomationElement.FromHandle(new IntPtr(hwnd));var current=output.Root.Current;output.RootPid=current.ProcessId;
   if(current.ProcessId!=expectedPid||current.NativeWindowHandle!=hwnd)throw new Exception("UIA root does not match retained own HWND/PID");
   var queue=new Queue<Pending>();queue.Enqueue(new Pending{Element=output.Root,Path=new int[0]});var walker=TreeWalker.RawViewWalker;
   while(queue.Count>0){
    if(output.Rows.Count>=output.MaxNodes){output.NodeCapHit=true;output.Complete=false;break;}
    if(watch.ElapsedMilliseconds>=output.MaxMilliseconds){output.TimeCapHit=true;output.Complete=false;break;}
    var item=queue.Dequeue();var row=new OwnUiaRow{Path=item.Path,Element=item.Element};output.Rows.Add(row);
    try {
     var c=item.Element.Current;row.ProcessId=c.ProcessId;row.OwnerAllowed=Allowed(c.ProcessId,allowedPids);if(!row.OwnerAllowed){output.ForeignOwner=true;output.Complete=false;}
     row.Name=Bound(c.Name,row,output);row.NameVariant=UpdatesNameVariant(row.Name);row.ControlType=c.ControlType.ProgrammaticName;row.AutomationId=Bound(c.AutomationId,row,output);row.ClassName=Bound(c.ClassName,row,output);row.Enabled=c.IsEnabled;row.Offscreen=c.IsOffscreen;row.RuntimeId=item.Element.GetRuntimeId();if(row.RuntimeId.Length>64){Array.Resize(ref row.RuntimeId,64);output.Complete=false;output.StringCapHit=true;}
     object pattern;row.InvokeAvailable=item.Element.TryGetCurrentPattern(InvokePattern.Pattern,out pattern);
     if(item.Element.TryGetCurrentPattern(ValuePattern.Pattern,out pattern))row.Value=Bound(((ValuePattern)pattern).Current.Value,row,output);
     var child=walker.GetFirstChild(item.Element);int index=0;
     if(child!=null&&item.Path.Length>=output.MaxDepth){output.DepthCapHit=true;output.Complete=false;continue;}
     while(child!=null){
      if(queue.Count+output.Rows.Count>=output.MaxNodes){output.NodeCapHit=true;output.Complete=false;break;}
      var path=new int[item.Path.Length+1];Array.Copy(item.Path,path,item.Path.Length);path[path.Length-1]=index++;queue.Enqueue(new Pending{Element=child,Path=path});child=walker.GetNextSibling(child);
      if(watch.ElapsedMilliseconds>=output.MaxMilliseconds){output.TimeCapHit=true;output.Complete=false;break;}
     }
    }catch(Exception error){row.Error=Bound(error.GetType().Name+": "+error.Message,row,output);output.ProviderError=true;output.Complete=false;}
   }
  }catch(Exception error){output.RootError=error.GetType().Name+": "+error.Message;output.ProviderError=true;output.Complete=false;}
  output.ElapsedMilliseconds=watch.Elapsed.TotalMilliseconds;return output;
 }
 public static string VisibleText(OwnUiaInventory inventory){var text=new System.Text.StringBuilder();foreach(var row in inventory.Rows)if(row.OwnerAllowed&&!row.Offscreen){text.AppendLine(row.Name??"");text.AppendLine(row.Value??"");}return text.ToString();}
 public static OwnUiaRow UniqueUpdates(OwnUiaInventory inventory){
  if(!inventory.Complete)throw new Exception("Incomplete/errored/foreign UIA scope cannot prove uniqueness or error absence");
  var found=new List<OwnUiaRow>();foreach(var row in inventory.Rows)if(row.ControlType=="ControlType.Button"&&UpdatesNameVariant(row.Name)!=null&&row.Enabled&&!row.Offscreen&&row.OwnerAllowed&&row.InvokeAvailable)found.Add(row);
  if(found.Count!=1)throw new Exception("Unique enabled visible owned Updates InvokePattern unavailable");return found[0];
 }
 public static void InvokeOnce(OwnUiaInventory inventory,OwnUiaRow selected,int expectedPid,int[] allowedPids){
  if(!inventory.Complete)throw new Exception("Complete before inventory required");var freshRoot=AutomationElement.FromHandle(new IntPtr(inventory.RootHandle));var rootInfo=freshRoot.Current;
  if(rootInfo.ProcessId!=expectedPid||rootInfo.NativeWindowHandle!=inventory.RootHandle||!Automation.Compare(freshRoot,inventory.Root))throw new Exception("UIA root changed before scoped action");
  var c=selected.Element.Current;selected.ActionName=c.Name;selected.ActionNameVariant=UpdatesNameVariant(c.Name);if(selected.ActionNameVariant==null||c.ControlType!=ControlType.Button||!c.IsEnabled||c.IsOffscreen||!Allowed(c.ProcessId,allowedPids))throw new Exception("Selected Updates owner/control changed");
  var cursor=selected.Element;bool rooted=false;for(int depth=0;depth<64&&cursor!=null;depth++){if(Automation.Compare(cursor,freshRoot)){rooted=true;break;}cursor=TreeWalker.RawViewWalker.GetParent(cursor);}
  if(!rooted)throw new Exception("Selected element left retained own native root");
  var now=selected.Element.GetRuntimeId();if(now.Length!=selected.RuntimeId.Length)throw new Exception("UIA runtime identity changed");for(int i=0;i<now.Length;i++)if(now[i]!=selected.RuntimeId[i])throw new Exception("UIA runtime identity changed");
  object pattern;if(!selected.Element.TryGetCurrentPattern(InvokePattern.Pattern,out pattern))throw new Exception("InvokePattern disappeared");((InvokePattern)pattern).Invoke();
 }
}
