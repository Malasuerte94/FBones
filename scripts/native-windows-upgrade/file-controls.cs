using System;using System.Text;using System.Collections.Generic;using System.Runtime.InteropServices;
public static class OwnCoreFileControls {
 [DllImport("shell32.dll",CharSet=CharSet.Unicode,SetLastError=true)]static extern IntPtr CommandLineToArgvW(string command,out int count);
 [DllImport("kernel32.dll")]static extern IntPtr LocalFree(IntPtr value);
 public static string[] Argv(string command){int n;IntPtr p=CommandLineToArgvW(command,out n);if(p==IntPtr.Zero)throw new Exception("Own child argv unavailable");try{if(n<1||n>16)throw new Exception("Own child argv bound");var values=new string[n];for(int i=0;i<n;i++){values[i]=Marshal.PtrToStringUni(Marshal.ReadIntPtr(p,i*IntPtr.Size));if(values[i].Length>16384)throw new Exception("Own child argument bound");}return values;}finally{LocalFree(p);}}
 public delegate bool Callback(IntPtr h,IntPtr p);
 [DllImport("user32.dll")]public static extern bool EnumWindows(Callback cb,IntPtr p);
 [DllImport("user32.dll")]public static extern bool EnumChildWindows(IntPtr root,Callback cb,IntPtr p);
 [DllImport("user32.dll")]public static extern uint GetWindowThreadProcessId(IntPtr h,out uint process);
 [DllImport("user32.dll")]public static extern IntPtr GetParent(IntPtr h);
 [DllImport("user32.dll")]public static extern int GetDlgCtrlID(IntPtr h);
 [DllImport("user32.dll")]public static extern bool IsWindow(IntPtr h);
 [DllImport("user32.dll")]public static extern bool IsWindowVisible(IntPtr h);
 [DllImport("user32.dll")]public static extern bool IsWindowEnabled(IntPtr h);
 [DllImport("user32.dll",CharSet=CharSet.Unicode)]static extern int GetClassName(IntPtr h,StringBuilder text,int max);
 [DllImport("user32.dll",CharSet=CharSet.Unicode)]static extern int GetWindowText(IntPtr h,StringBuilder text,int max);
 [DllImport("user32.dll",CharSet=CharSet.Unicode,SetLastError=true)]static extern IntPtr SendMessageTimeout(IntPtr h,uint msg,IntPtr w,StringBuilder text,uint flags,uint timeout,out IntPtr result);
 [DllImport("user32.dll",EntryPoint="SendMessageTimeoutW",CharSet=CharSet.Unicode,SetLastError=true)]static extern IntPtr SendString(IntPtr h,uint msg,IntPtr w,string text,uint flags,uint timeout,out IntPtr result);
 [DllImport("user32.dll",EntryPoint="SendMessageTimeoutW",SetLastError=true)]static extern IntPtr SendRaw(IntPtr h,uint msg,IntPtr w,IntPtr l,uint flags,uint timeout,out IntPtr result);
 [DllImport("user32.dll")]public static extern bool PostMessage(IntPtr h,uint msg,IntPtr w,IntPtr l);
 public static string Class(IntPtr h){var b=new StringBuilder(256);GetClassName(h,b,b.Capacity);return b.ToString();}
 public static string Text(IntPtr h){var b=new StringBuilder(4096);if(Class(h)=="Edit"){IntPtr result;if(SendMessageTimeout(h,13,(IntPtr)b.Capacity,b,2,1000,out result)==IntPtr.Zero)throw new Exception("Own Edit text unavailable");}else GetWindowText(h,b,b.Capacity);return b.ToString();}
 public static long[] Selection(IntPtr h){IntPtr result;if(SendRaw(h,0xB0,IntPtr.Zero,IntPtr.Zero,2,1000,out result)==IntPtr.Zero)throw new Exception("Own Edit selection unavailable");long v=result.ToInt64();return new[]{v&65535,(v>>16)&65535};}
 public static void SetText(IntPtr h,string text){IntPtr result;if(SendString(h,12,IntPtr.Zero,text,2,1000,out result)==IntPtr.Zero||result==IntPtr.Zero)throw new Exception("Own WM_SETTEXT failed");}
 public static long[] Tops(uint process){var list=new List<long>();if(!EnumWindows((h,p)=>{uint owner;GetWindowThreadProcessId(h,out owner);if(owner==process&&IsWindowVisible(h)&&Class(h)=="#32770")list.Add(h.ToInt64());return true;},IntPtr.Zero))throw new Exception("Native top-level enumeration failed");return list.ToArray();}
 public static long[] Children(IntPtr root){if(!IsWindow(root))throw new Exception("Current native dialog absent before enumeration");var list=new List<long>();bool capped=false;/* SDK: EnumChildWindows return value is unused. Callback cap and current-root guards are authoritative. */EnumChildWindows(root,(h,p)=>{if(list.Count>=256){capped=true;return false;}list.Add(h.ToInt64());return true;},IntPtr.Zero);if(capped||!IsWindow(root))throw new Exception("Native control enumeration cap or dialog changed");return list.ToArray();}
}
