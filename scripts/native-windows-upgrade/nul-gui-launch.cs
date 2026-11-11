using System;
using System.Text;
using System.Runtime.InteropServices;
public static class NativeOwnGui {
 [StructLayout(LayoutKind.Sequential)] public struct SA {public int Length;public IntPtr Descriptor;[MarshalAs(UnmanagedType.Bool)]public bool Inherit;}
 [StructLayout(LayoutKind.Sequential,CharSet=CharSet.Unicode)] public struct SI {public int cb;public string Reserved,Desktop,Title;public int X,Y,XSize,YSize,XChars,YChars,Fill,Flags;public short Show,Reserved2;public IntPtr ReservedPtr,Input,Output,Error;}
 [StructLayout(LayoutKind.Sequential,CharSet=CharSet.Unicode)] public struct SIEX {public SI StartupInfo;public IntPtr AttributeList;}
 [StructLayout(LayoutKind.Sequential)] public struct PI {public IntPtr Process,Thread;public uint ProcessId,ThreadId;}
 [DllImport("kernel32.dll",CharSet=CharSet.Unicode,SetLastError=true)] static extern IntPtr CreateFile(string name,uint access,uint share,ref SA sa,uint disposition,uint flags,IntPtr template);
 [DllImport("kernel32.dll",EntryPoint="CreateProcessW",CharSet=CharSet.Unicode,SetLastError=true)] static extern bool CreateProcess(string image,StringBuilder command,IntPtr pa,IntPtr ta,bool inherit,uint flags,IntPtr env,string cwd,ref SIEX si,out PI pi);
 [DllImport("kernel32.dll",SetLastError=true)] static extern bool InitializeProcThreadAttributeList(IntPtr list,int count,int flags,ref UIntPtr size);
 [DllImport("kernel32.dll",SetLastError=true)] static extern bool UpdateProcThreadAttribute(IntPtr list,uint flags,UIntPtr attribute,IntPtr value,UIntPtr size,IntPtr previous,IntPtr returned);
 [DllImport("kernel32.dll")] static extern void DeleteProcThreadAttributeList(IntPtr list);
 [DllImport("kernel32.dll",SetLastError=true)] public static extern bool CloseHandle(IntPtr handle);
 [DllImport("kernel32.dll",SetLastError=true)] public static extern uint WaitForSingleObject(IntPtr handle,uint milliseconds);
 [DllImport("kernel32.dll",SetLastError=true)] public static extern bool GetExitCodeProcess(IntPtr handle,out uint code);
 [DllImport("kernel32.dll",SetLastError=true)] public static extern bool GetProcessTimes(IntPtr handle,out long created,out long exited,out long kernel,out long user);
 private static string Quote(string arg) {
  if(arg==null||arg.IndexOf('\0')>=0)throw new ArgumentException("Invalid process argument");
  var b=new StringBuilder("\"");int slashes=0;
  foreach(char c in arg){if(c=='\\'){slashes++;continue;}if(c=='\"'){b.Append('\\',slashes*2+1).Append(c);}else{b.Append('\\',slashes).Append(c);}slashes=0;}
  return b.Append('\\',slashes*2).Append('\"').ToString();
 }
 public static PI Start(string image,string workingDirectory) {return Start(image,workingDirectory,new string[0]);}
 public static PI Start(string image,string workingDirectory,string[] arguments) {
  var cmd=new StringBuilder(Quote(image));foreach(var arg in arguments)cmd.Append(" ").Append(Quote(arg));return StartCommand(image,workingDirectory,cmd);
 }
 public static PI StartNsis(string image,string workingDirectory,string installDirectory) {
  if(!System.IO.Path.IsPathRooted(installDirectory)||installDirectory.IndexOfAny(new char[]{'\"','\0','\r','\n'})>=0)throw new ArgumentException("Valid absolute own install directory required");
  // NSIS explicitly requires /D to be LAST and UNQUOTED, including paths with spaces.
  return StartCommand(image,workingDirectory,new StringBuilder(Quote(image)+" /S /NS /D="+installDirectory));
 }
 public static PI StartWithOwnedLog(string image,string workingDirectory,string logPath) {
  if(!System.IO.Path.IsPathRooted(logPath)||System.IO.File.Exists(logPath))throw new ArgumentException("Fresh own absolute direct log required");
  return StartCommand(image,workingDirectory,new StringBuilder(Quote(image)),logPath);
 }
 private static PI StartCommand(string image,string workingDirectory,StringBuilder cmd) {return StartCommand(image,workingDirectory,cmd,null);}
 private static PI StartCommand(string image,string workingDirectory,StringBuilder cmd,string logPath) {
  if(!System.IO.Path.IsPathRooted(image)||!System.IO.File.Exists(image)||!System.IO.Directory.Exists(workingDirectory))throw new ArgumentException("Own absolute image and existing working directory required");
  var sa=new SA{Length=Marshal.SizeOf(typeof(SA)),Inherit=true};
  var nul=CreateFile("NUL",0xc0000000,3,ref sa,3,0x80,IntPtr.Zero);
  if(nul==new IntPtr(-1))throw new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error());
  IntPtr list=IntPtr.Zero,handles=IntPtr.Zero,log=IntPtr.Zero;bool initialized=false;
  try {
   if(logPath!=null){log=CreateFile(logPath,0x40000000,3,ref sa,1,0x80,IntPtr.Zero);if(log==new IntPtr(-1)){log=IntPtr.Zero;throw new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error());}}
   int count=log==IntPtr.Zero?1:2;
   UIntPtr bytes=UIntPtr.Zero;InitializeProcThreadAttributeList(IntPtr.Zero,1,0,ref bytes);
   if(bytes==UIntPtr.Zero)throw new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error());
   list=Marshal.AllocHGlobal(checked((int)bytes.ToUInt64()));
   if(!InitializeProcThreadAttributeList(list,1,0,ref bytes))throw new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error());
   initialized=true;handles=Marshal.AllocHGlobal(IntPtr.Size*count);Marshal.WriteIntPtr(handles,nul);if(count==2)Marshal.WriteIntPtr(handles,IntPtr.Size,log);
   if(!UpdateProcThreadAttribute(list,0,new UIntPtr(0x20002),handles,new UIntPtr((uint)(IntPtr.Size*count)),IntPtr.Zero,IntPtr.Zero))throw new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error());
   var si=new SIEX{StartupInfo=new SI{cb=Marshal.SizeOf(typeof(SIEX)),Flags=0x100,Input=nul,Output=log==IntPtr.Zero?nul:log,Error=log==IntPtr.Zero?nul:log},AttributeList=list}; PI pi;
   if(!CreateProcess(image,cmd,IntPtr.Zero,IntPtr.Zero,true,0x80200,IntPtr.Zero,workingDirectory,ref si,out pi))throw new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error());
   CloseHandle(pi.Thread); pi.Thread=IntPtr.Zero; return pi;
  } finally {if(initialized)DeleteProcThreadAttributeList(list);if(handles!=IntPtr.Zero)Marshal.FreeHGlobal(handles);if(list!=IntPtr.Zero)Marshal.FreeHGlobal(list);if(log!=IntPtr.Zero)CloseHandle(log);CloseHandle(nul);}
 }
}
