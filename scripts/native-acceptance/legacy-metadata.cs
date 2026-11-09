using System;
using System.Text;
using System.Runtime.InteropServices;
public static class OwnLegacyMetadata {
 private static IntPtr module;
 [DllImport("kernel32.dll",CharSet=CharSet.Unicode,SetLastError=true)]private static extern IntPtr LoadLibraryExW(string name,IntPtr file,uint flags);
 [DllImport("kernel32.dll",CharSet=CharSet.Ansi,ExactSpelling=true,SetLastError=true)]private static extern IntPtr GetProcAddress(IntPtr module,string name);
 [DllImport("kernel32.dll",SetLastError=true)]private static extern bool FreeLibrary(IntPtr module);
 [UnmanagedFunctionPointer(CallingConvention.Cdecl,CharSet=CharSet.Unicode)]private delegate int ProbeCall(StringBuilder output,int capacity);
 [UnmanagedFunctionPointer(CallingConvention.Cdecl,CharSet=CharSet.Unicode)]private delegate int ReadCall(UIntPtr process,UIntPtr window,uint pid,ulong creation,string image,[In]int[] runtime,int runtimeCount,[In]int[] providers,int providerCount,int selectedPid,string selectedName,StringBuilder output,int capacity);
 public static void Load(string path){if(module!=IntPtr.Zero||!System.IO.Path.IsPathRooted(path)||!System.IO.File.Exists(path))throw new Exception("Exact fresh local DLL required");module=LoadLibraryExW(path,IntPtr.Zero,0x100|0x1000);if(module==IntPtr.Zero)throw new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error());}
 private static Delegate Entry(string name,Type type){if(module==IntPtr.Zero)throw new Exception("Own SDK DLL not loaded");var entry=GetProcAddress(module,name);if(entry==IntPtr.Zero)throw new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error());return Marshal.GetDelegateForFunctionPointer(entry,type);}
 public static string Probe(){var output=new StringBuilder(32768);int code=((ProbeCall)Entry("LegacyProbe",typeof(ProbeCall)))(output,output.Capacity);if(code!=0)throw new Exception("Bounded native COM receipt unavailable");return output.ToString();}
 public static string Read(IntPtr process,IntPtr window,uint pid,ulong creation,string image,int[] runtime,int[] providers,int selectedPid,string name){var output=new StringBuilder(32768);int code=((ReadCall)Entry("LegacyRead",typeof(ReadCall)))(new UIntPtr(unchecked((ulong)process.ToInt64())),new UIntPtr(unchecked((ulong)window.ToInt64())),pid,creation,image,runtime,runtime.Length,providers,providers.Length,selectedPid,name,output,output.Capacity);if(code!=0)throw new Exception("Bounded native metadata receipt unavailable");return output.ToString();}
 public static string Press(IntPtr process,IntPtr window,uint pid,ulong creation,string image,int[] runtime,int[] providers,int selectedPid,string name){var output=new StringBuilder(32768);int code=((ReadCall)Entry("LegacyPress",typeof(ReadCall)))(new UIntPtr(unchecked((ulong)process.ToInt64())),new UIntPtr(unchecked((ulong)window.ToInt64())),pid,creation,image,runtime,runtime.Length,providers,providers.Length,selectedPid,name,output,output.Capacity);if(code!=0)throw new Exception("Bounded native Press receipt unavailable");return output.ToString();}
 public static void Unload(){if(module!=IntPtr.Zero){var value=module;module=IntPtr.Zero;if(!FreeLibrary(value))throw new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error());}}
}
