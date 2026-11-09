import Foundation
import AppKit
import ApplicationServices
import CryptoKit
import Darwin
let arguments=CommandLine.arguments
if arguments.count != 4 { fatalError("Expected own installed bundle, reports directory and executable SHA256") }
let bundleURL=URL(fileURLWithPath:arguments[1]), reports=URL(fileURLWithPath:arguments[2]), expected=arguments[3]
var proof:[String:Any] = ["passed":false,"route":"mac-dmg","stage":"capability-only","upgradeAttempted":false,"normalClose":false]
var owned:NSRunningApplication?
var child:Process?

struct KernelIdentity:Equatable {
 var pid:Int32;var startSeconds:UInt64;var startMicroseconds:UInt64;var device:UInt64;var inode:UInt64;var path:String
 var json:[String:Any]{return ["pid":pid,"startSeconds":startSeconds,"startMicroseconds":startMicroseconds,"device":device,"inode":inode,"actualPath":path]}
}
var nativeKernelBaseline:KernelIdentity?
var providerProved=false
func sameKernel(_ a:KernelIdentity,_ b:KernelIdentity)->Bool{return a.pid==b.pid && a.startSeconds==b.startSeconds && a.startMicroseconds==b.startMicroseconds && a.device==b.device && a.inode==b.inode}
func readKernel(_ process:Process,_ expectedURL:URL)throws->KernelIdentity{
 guard process.isRunning else{throw NSError(domain:"Retained created process is not live for kernel query",code:20)}
 var info=OwnProcessIdentity();let ok=expectedURL.path.withCString{OwnReadProcessIdentity(process.processIdentifier,$0,&info)}
 let path=withUnsafeBytes(of:info.actualPath){String(decoding:$0.prefix{$0 != 0},as:UTF8.self)}
 proof["lastKernelQuery"]=["requestedPid":info.requestedPid,"observedPid":info.observedPid,"infoBytes":info.infoBytes,"infoError":info.infoError,"pathBytes":info.pathBytes,"pathError":info.pathError,"infoValid":info.infoValid,"pathValid":info.pathValid,"sameFile":info.sameFile,"fileIdentityValid":info.fileIdentityValid,"expectedDevice":info.expectedDevice,"expectedInode":info.expectedInode,"actualDevice":info.actualDevice,"actualInode":info.actualInode,"actualPath":path,"startSeconds":info.startSeconds,"startMicroseconds":info.startMicroseconds]
 guard ok==1,process.isRunning,info.requestedPid==process.processIdentifier,info.observedPid==process.processIdentifier else{throw NSError(domain:"Actual SDK kernel PID/start/path/file identity failed",code:21)}
 return KernelIdentity(pid:info.observedPid,startSeconds:info.startSeconds,startMicroseconds:info.startMicroseconds,device:info.actualDevice,inode:info.actualInode,path:path)
}
func verifyNativeKernel()throws->KernelIdentity{
 guard providerProved,let process=child,let exe=process.executableURL,let baseline=nativeKernelBaseline else{throw NSError(domain:"Proven provider and retained stock child baseline required",code:22)}
 let current=try readKernel(process,exe);guard sameKernel(baseline,current)else{throw NSError(domain:"Stock child's actual kernel start/file identity changed",code:23)}
 let image=try Data(contentsOf:URL(fileURLWithPath:current.path));guard image.count<=32*1024*1024,SHA256.hash(data:image).map({String(format:"%02x",$0)}).joined()==expected else{throw NSError(domain:"Actual SDK-reported stock image hash changed",code:24)}
 return current
}
func proveKernelProvider()throws{
 let fixture=Process();fixture.executableURL=URL(fileURLWithPath:"/bin/sleep");fixture.arguments=["2"];fixture.standardInput=FileHandle.nullDevice;fixture.standardOutput=FileHandle.nullDevice;fixture.standardError=FileHandle.nullDevice
 var receipt:[String:Any]=["passed":false,"scope":"One own data-free created sleep2 child, no app/UI/debugger/target-memory access"]
 do{
  try fixture.run();receipt["createdPid"]=fixture.processIdentifier
  let first=try readKernel(fixture,fixture.executableURL!);pump(0.02);let second=try readKernel(fixture,fixture.executableURL!);receipt["first"]=first.json;receipt["second"]=second.json
  guard sameKernel(first,second)else{throw NSError(domain:"Own SDK identity fixture tuple unstable",code:25)}
  let end=Date(timeIntervalSinceNow:5);while fixture.isRunning && Date()<end{pump(0.1)}
  guard !fixture.isRunning,fixture.terminationReason == .exit,fixture.terminationStatus==0 else{throw NSError(domain:"Own SDK identity fixture normal exit0 unobserved; no force",code:26)}
  receipt["terminalObserved"]=true;receipt["exitCode"]=fixture.terminationStatus;receipt["terminationReasonRaw"]=fixture.terminationReason.rawValue;receipt["passed"]=true
  let data=try JSONSerialization.data(withJSONObject:receipt,options:[.prettyPrinted,.sortedKeys]);try data.write(to:reports.appendingPathComponent("kernel-provider-proof.json"),options:.withoutOverwriting);providerProved=true;proof["kernelProviderProvedBeforeApp"]=true
 }catch{
  receipt["error"]=String(describing:error);receipt["lastKernelQuery"]=proof["lastKernelQuery"];let end=Date(timeIntervalSinceNow:5);while fixture.isRunning && Date()<end{pump(0.1)};receipt["isRunning"]=fixture.isRunning;if !fixture.isRunning{receipt["exitCode"]=fixture.terminationStatus;receipt["terminationReasonRaw"]=fixture.terminationReason.rawValue}
  if let data=try? JSONSerialization.data(withJSONObject:receipt,options:[.prettyPrinted,.sortedKeys]){try? data.write(to:reports.appendingPathComponent("kernel-provider-proof.json"),options:.withoutOverwriting)};throw error
 }
}

var nativeLog:FileHandle?
var nativeLogURL:URL?
var launchSamples:[[String:Any]]=[]
func observeProcess(_ process:Process)->[String:Any]{
 var value:[String:Any]=["processId":process.processIdentifier,"isRunning":process.isRunning,"observedUtc":ISO8601DateFormatter().string(from:Date()),"requestedExecutableURL":process.executableURL?.absoluteString ?? "missing"]
 if !process.isRunning{value["terminationStatus"]=process.terminationStatus;value["terminationReasonRaw"]=process.terminationReason.rawValue}
 if let candidate=NSRunningApplication(processIdentifier:process.processIdentifier){
  value["nsRunningApplicationPresent"]=true;value["observedPid"]=candidate.processIdentifier;value["observedBundleURL"]=candidate.bundleURL?.absoluteString ?? "missing";value["standardizedBundleURL"]=candidate.bundleURL?.standardizedFileURL.absoluteString ?? "missing";value["expectedStandardizedBundleURL"]=bundleURL.standardizedFileURL.absoluteString
  value["bundleURLMatches"]=(candidate.bundleURL?.standardizedFileURL==bundleURL.standardizedFileURL);value["observedExecutableURL"]=candidate.executableURL?.absoluteString ?? "missing";value["bundleIdentifier"]=candidate.bundleIdentifier ?? "missing";value["launchDate"]=candidate.launchDate.map{ISO8601DateFormatter().string(from:$0)} ?? "missing";value["isTerminated"]=candidate.isTerminated;value["isFinishedLaunching"]=candidate.isFinishedLaunching
 }else{value["nsRunningApplicationPresent"]=false}
 let windows=CGWindowListCopyWindowInfo([.optionAll,.excludeDesktopElements],kCGNullWindowID)as?[[String:Any]] ?? []
 value["ownWindows"]=windows.filter{($0[kCGWindowOwnerPID as String]as?Int)==Int(process.processIdentifier)}.prefix(16).map{["windowId":$0[kCGWindowNumber as String] ?? "missing","layer":$0[kCGWindowLayer as String] ?? "missing","onScreen":$0[kCGWindowIsOnscreen as String] ?? "missing"]}
 return value
}
func retainLaunchObservation(_ process:Process){let sample=observeProcess(process);launchSamples.append(sample);if launchSamples.count>32{launchSamples=Array(launchSamples.prefix(16))+Array(launchSamples.suffix(16))};proof["launchObservations"]=launchSamples;proof["lastProcessObservation"]=sample;if let data=try? JSONSerialization.data(withJSONObject:proof,options:[.prettyPrinted,.sortedKeys]){try? data.write(to:reports.appendingPathComponent("mac-progress.json"),options:.atomic)}}
func retainLogPrefix(){
 guard let url=nativeLogURL else{return}
 do{try nativeLog?.synchronize();let reader=try FileHandle(forReadingFrom:url);defer{try? reader.close()};let data=try reader.read(upToCount:65536) ?? Data();let size=(try FileManager.default.attributesOfItem(atPath:url.path)[.size]as?NSNumber)?.uint64Value ?? 0;try data.write(to:reports.appendingPathComponent("native-prefix.log"),options:.withoutOverwriting);proof["diagnosticLog"]=["spoolBytesObserved":size,"retainedPrefixBytes":data.count,"retainedPrefixCap":65536,"rawSpoolHardByteCap":false,"truncated":size>UInt64(data.count)]}catch{proof["logReceiptError"]=String(describing:error)}
}
func writeProof(){if let process=child{retainLaunchObservation(process)};retainLogPrefix();do{let data=try JSONSerialization.data(withJSONObject:proof,options:[.prettyPrinted,.sortedKeys]);try data.write(to:reports.appendingPathComponent("capability.json"),options:.withoutOverwriting)}catch{fputs("Native receipt write failed\n",stderr);exit(3)}}
func pump(_ seconds:Double){RunLoop.current.run(until:Date(timeIntervalSinceNow:seconds))}
func attribute(_ e:AXUIElement,_ name:String)->CFTypeRef? {var v:CFTypeRef?;if AXUIElementCopyAttributeValue(e,name as CFString,&v) != .success{return nil};return v}
func text(_ e:AXUIElement)->[String]{return [kAXTitleAttribute,kAXValueAttribute,kAXDescriptionAttribute].compactMap{attribute(e,$0) as? String}.filter{!$0.isEmpty}}
func inventory(_ root:AXUIElement)->[(AXUIElement,[String])]{var queue=[root],out:[(AXUIElement,[String])]=[];let end=Date(timeIntervalSinceNow:5);var i=0;while i<queue.count && i<4096 && Date()<end{let e=queue[i];i+=1;out.append((e,text(e)));if let children=attribute(e,kAXChildrenAttribute)as?[AXUIElement]{queue.append(contentsOf:children.prefix(4096-queue.count))}};return out}
func closeOwn()->Bool{guard (try? verifyNativeKernel()) != nil,let app=owned else{return false};guard app.bundleURL?.standardizedFileURL==bundleURL.standardizedFileURL && !app.isTerminated else{return false};guard app.terminate()else{return false};let end=Date(timeIntervalSinceNow:20);while (!app.isTerminated || child?.isRunning == true) && Date()<end{pump(0.2)};return app.isTerminated && child?.isRunning == false}
do{
 guard ProcessInfo.processInfo.environment["GITHUB_ACTIONS"]=="true",ProcessInfo.processInfo.environment["RUNNER_ENVIRONMENT"]=="github-hosted"else{throw NSError(domain:"Ephemeral hosted Mac only",code:1)}
 guard let session=CGSessionCopyCurrentDictionary()as?[String:Any],session[kCGSessionOnConsoleKey as String]as?Bool==true else{throw NSError(domain:"No actual Aqua console session",code:2)}
 proof["aquaSession"]=true;proof["axTrusted"]=AXIsProcessTrusted();try proveKernelProvider()
 guard let bundle=Bundle(url:bundleURL),bundle.bundleIdentifier=="studio.fbones.editor",bundle.infoDictionary?["CFBundleShortVersionString"]as?String=="0.9.5",let exe=bundle.executableURL else{throw NSError(domain:"Installed stock bundle/version invalid",code:3)}
 let actual=SHA256.hash(data:try Data(contentsOf:exe)).map{String(format:"%02x",$0)}.joined();guard actual==expected else{throw NSError(domain:"Installed native executable digest mismatch",code:4)}
 proof["installation"]=["stockDmgCopied":true,"version":"0.9.5","executableSha256":actual,"architecture":ProcessInfo.processInfo.machineArchitecture]
 let process=Process();process.executableURL=exe;process.currentDirectoryURL=bundleURL.deletingLastPathComponent();process.standardInput=FileHandle.nullDevice
 let logURL=reports.deletingLastPathComponent().appendingPathComponent("mac-native-spool.log");guard !FileManager.default.fileExists(atPath:logURL.path),FileManager.default.createFile(atPath:logURL.path,contents:nil)else{throw NSError(domain:"Fresh own native log required",code:15)};nativeLogURL=logURL;let logHandle=try FileHandle(forWritingTo:logURL);nativeLog=logHandle;process.standardOutput=logHandle;process.standardError=logHandle
 proof["processRunRequestedUtc"]=ISO8601DateFormatter().string(from:Date());try process.run();child=process;proof["processRunReturnedUtc"]=ISO8601DateFormatter().string(from:Date());proof["createdPid"]=process.processIdentifier;proof["spawnTimeIsOSLaunchDate"]=false;retainLaunchObservation(process);nativeKernelBaseline=try readKernel(process,exe);proof["nativeKernelBaseline"]=nativeKernelBaseline!.json;_ = try verifyNativeKernel()
 let launchEnd=Date(timeIntervalSinceNow:30);while owned==nil && process.isRunning && Date()<launchEnd{retainLaunchObservation(process);if let candidate=NSRunningApplication(processIdentifier:process.processIdentifier),candidate.bundleURL?.standardizedFileURL==bundleURL.standardizedFileURL,candidate.bundleIdentifier=="studio.fbones.editor",candidate.executableURL?.standardizedFileURL==exe.standardizedFileURL,(try? verifyNativeKernel()) != nil{owned=candidate};if owned==nil{pump(0.1)}}
 retainLaunchObservation(process)
 guard let app=owned,app.bundleURL?.standardizedFileURL==bundleURL.standardizedFileURL,!app.isTerminated,(try? verifyNativeKernel()) != nil else{throw NSError(domain:"Owned native app launch unavailable",code:5)}
 proof["native"]=["pid":app.processIdentifier,"launchDate":app.launchDate.map{ISO8601DateFormatter().string(from:$0)} ?? "missing","kernelStart":nativeKernelBaseline!.json,"bundleId":app.bundleIdentifier ?? ""]
 var visible=false;let windowEnd=Date(timeIntervalSinceNow:30)
 while Date()<windowEnd && !visible{let windows=CGWindowListCopyWindowInfo([.optionOnScreenOnly,.excludeDesktopElements],kCGNullWindowID)as?[[String:Any]] ?? [];visible=windows.contains{($0[kCGWindowOwnerPID as String]as?Int)==Int(app.processIdentifier) && ($0[kCGWindowLayer as String]as?Int)==0};if !visible{pump(0.2)}}
 proof["visibleOwnedWindow"]=visible;guard visible else{throw NSError(domain:"No visible owned native Aqua window",code:6)}
 guard AXIsProcessTrusted()else{throw NSError(domain:"AX permission unavailable; no prompt or TCC workaround attempted",code:7)}
 let root=AXUIElementCreateApplication(app.processIdentifier);var before:[(AXUIElement,[String])]=[];let readyEnd=Date(timeIntervalSinceNow:30)
 repeat{before=inventory(root);if before.contains(where:{$0.1.contains(where:{$0.contains("0.9.5")})}) && before.contains(where:{$0.1.contains("Updates")}){break};pump(0.2)}while Date()<readyEnd
 guard !before.contains(where:{$0.1.contains(where:{$0.contains("The viewport could not start.")})})else{throw NSError(domain:"Native viewport reports startup failure",code:13)}
 guard before.contains(where:{(attribute($0.0,kAXRoleAttribute)as?String)=="AXWebArea"}) && before.contains(where:{$0.1.contains("Viewport")})else{throw NSError(domain:"Native WKWebView viewport unavailable",code:12)}
 let buttons=before.filter{(attribute($0.0,kAXRoleAttribute)as?String)==kAXButtonRole && $0.1.contains("Updates")}
 guard buttons.count==1,before.contains(where:{$0.1.contains(where:{$0.contains("0.9.5")})})else{throw NSError(domain:"Native frontend/version/unique Updates AX button unavailable",code:8)}
 let wasPanel=before.contains{$0.1.contains(where:{$0.contains("Current version: 0.9.5")})}
 _ = try verifyNativeKernel()
 guard AXUIElementPerformAction(buttons[0].0,kAXPressAction as CFString) == .success else{throw NSError(domain:"Scoped Updates AXPress failed",code:9)}
 var afterPanel=wasPanel;let toggleEnd=Date(timeIntervalSinceNow:10)
 repeat{afterPanel=inventory(root).contains{$0.1.contains(where:{$0.contains("Current version: 0.9.5")})};if afterPanel != wasPanel{break};pump(0.2)}while Date()<toggleEnd
 guard !inventory(root).contains(where:{$0.1.contains(where:{$0.contains("Automatic updates are unavailable for this copy.")})})else{throw NSError(domain:"Installed stock updater is unsupported",code:14)}
 guard afterPanel != wasPanel else{throw NSError(domain:"One Updates toggle had no observed panel transition",code:10)}
 proof["frontend"]=["version":"0.9.5","provider":"native-WKWebView-AX","oneUpdatesToggle":true,"panelBefore":wasPanel,"panelAfter":afterPanel]
 proof["normalClose"]=closeOwn();proof["exitCode"]=child?.isRunning == false ? child?.terminationStatus : nil;guard proof["normalClose"]as?Bool==true,child?.terminationStatus == 0 else{throw NSError(domain:"Own native normal close unobserved; no force",code:11)};proof["passed"]=true;writeProof();exit(0)
}catch{proof["error"]=String(describing:error);if owned != nil && proof["normalClose"]as?Bool != true{proof["normalClose"]=closeOwn()};writeProof();exit(2)}
extension ProcessInfo{var machineArchitecture:String{var system=utsname();uname(&system);return withUnsafePointer(to:&system.machine){$0.withMemoryRebound(to:CChar.self,capacity:1){String(cString:$0)}}}}
