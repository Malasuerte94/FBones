import Foundation
import AppKit
import ApplicationServices
import CryptoKit
import Darwin
let arguments=CommandLine.arguments
if arguments.count != 4 { fatalError("Expected own installed bundle, reports directory and executable SHA256") }
let bundleURL=URL(fileURLWithPath:arguments[1]), reports=URL(fileURLWithPath:arguments[2]), expected=arguments[3]
var proof:[String:Any] = ["passed":false,"route":"mac-dmg","stage":"updater-control-capability-v5","updaterControlCapabilityPassed":false,"previousCombinedViewportGatePassed":false,"viewportAccessibilityShapeVerified":"unknown","upgradeAttempted":false,"normalClose":false]
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
// Exact source-derived full-name forms; unbounded/null-total byte progress is declined.
func updatesNameVariant(_ value:String)->String?{
 let n=value.replacingOccurrences(of:"\\s+",with:" ",options:.regularExpression).trimmingCharacters(in:.whitespacesAndNewlines)
 if n=="Updates"{return "title"}
 if n.range(of:"\\AUpdates ?(?:0|[1-9][0-9]?|100)%\\z",options:.regularExpression) != nil{return "integer-percent"}
 if n.range(of:"\\AUpdates ?Version 0\\.9\\.6 is ready to install\\.\\z",options:.regularExpression) != nil{return "ready-0.9.6"}
 return nil
}
struct AXControlSnapshot {
 var rows:[[String:Any]]=[];var nodes:[AXUIElement]=[];var window:AXUIElement?
 var complete=true;var flags:[String]=[];var rootRows:[[String:Any]]=[];var bytes=0
 var texts:[String]{return rows.flatMap{r in ["title","value","description"].compactMap{r[$0]as?String}}}
 var visibleText:String{return texts.joined(separator:"\n")}
 var updates:[Int]{return rows.indices.filter{i in let r=rows[i];return r["role"]as?String=="AXButton" && r["ownerMatches"]as?Bool==true && r["enabled"]as?Bool==true && ["title","value","description"].contains{updatesNameVariant((r[$0]as?String) ?? "") != nil} && (r["actions"]as?[String] ?? []).contains("AXPress")}}
}
func readAX(_ e:AXUIElement,_ name:String)->(CFTypeRef?,AXError){var value:CFTypeRef?;let error=AXUIElementCopyAttributeValue(e,name as CFString,&value);return(value,error)}
func axOwner(_ e:AXUIElement)->(pid_t,AXError){var pid:pid_t=0;let error=AXUIElementGetPid(e,&pid);return(pid,error)}
func expectedAbsent(_ error:AXError)->Bool{return error == .attributeUnsupported || error == .noValue || error == .actionUnsupported}
func inventoryControls(_ root:AXUIElement,_ pid:pid_t)->AXControlSnapshot{
 var s=AXControlSnapshot();let began=Date();let end=Date(timeIntervalSinceNow:15)
 let windowsResult=readAX(root,kAXWindowsAttribute)
 guard windowsResult.1 == .success,let windows=windowsResult.0 as?[AXUIElement],windows.count<=16 else{s.complete=false;s.flags.append("own-AXWindows-unavailable-or-count-cap");return s}
 var candidates:[(AXUIElement,Int)]=[]
 for(i,w)in windows.enumerated(){let owner=axOwner(w),role=readAX(w,kAXRoleAttribute),title=readAX(w,kAXTitleAttribute),minimized=readAX(w,kAXMinimizedAttribute);let titleText=(title.0 as?String) ?? "";s.rootRows.append(["windowIndex":i,"pid":owner.0,"pidError":owner.1.rawValue,"role":(role.0 as?String) ?? "missing","title":String(titleText.prefix(1024)),"minimized":(minimized.0 as?Bool) ?? true,"titleError":title.1.rawValue,"minimizedError":minimized.1.rawValue]);if owner.1 == .success && owner.0==pid && role.0 as?String=="AXWindow" && titleText=="FBones" && minimized.0 as?Bool==false{candidates.append((w,i))}}
 guard candidates.count==1 else{s.complete=false;s.flags.append("unique-owned-nonminimized-FBones-AXWindow-unavailable");return s}
 s.window=candidates[0].0;var queue:[(AXUIElement,[Int])]=[(candidates[0].0,[candidates[0].1])]
 while !queue.isEmpty{
  if s.rows.count>=1024{s.complete=false;s.flags.append("node-cap");break};if Date()>=end{s.complete=false;s.flags.append("time-cap");break}
  let(e,path)=queue.removeFirst();var row:[String:Any]=["path":path];let owner=axOwner(e);row["pid"]=owner.0;row["pidError"]=owner.1.rawValue;row["ownerMatches"]=(owner.1 == .success && owner.0==pid)
  if owner.1 != .success || owner.0 != pid{s.complete=false;s.flags.append("foreign-or-missing-node-owner")}
  let role=readAX(e,kAXRoleAttribute);row["role"]=(role.0 as?String) ?? "missing";row["roleError"]=role.1.rawValue;if role.1 != .success{s.complete=false;s.flags.append("required-role-error")}
  for(key,name)in[("title",kAXTitleAttribute),("value",kAXValueAttribute),("description",kAXDescriptionAttribute)]{
   let result=readAX(e,name);row[key+"Error"]=result.1.rawValue
   if let text=result.0 as?String{row[key]=String(text.prefix(1024));if text.count>1024{s.complete=false;s.flags.append("string-cap")}}
   else if let number=result.0 as?NSNumber{row[key]=number.stringValue}
   if result.1 != .success && !expectedAbsent(result.1){s.complete=false;s.flags.append("attribute-provider-error")}
  }
  let enabled=readAX(e,kAXEnabledAttribute);row["enabled"]=(enabled.0 as?Bool) ?? false;row["enabledError"]=enabled.1.rawValue
  if enabled.1 != .success && (!expectedAbsent(enabled.1) || role.0 as?String=="AXButton"){s.complete=false;s.flags.append("enabled-provider-error")}
  var actions:CFArray?;let actionError=AXUIElementCopyActionNames(e,&actions);let names=(actions as?[String]) ?? [];row["actions"]=names.prefix(16).map{String($0.prefix(1024))};if names.contains(where:{$0.count>1024}){s.complete=false;s.flags.append("action-string-cap")};row["actionError"]=actionError.rawValue
  if names.count>16{s.complete=false;s.flags.append("action-count-cap")};if actionError != .success && !expectedAbsent(actionError){s.complete=false;s.flags.append("action-provider-error")}
  let children=readAX(e,kAXChildrenAttribute);row["childrenError"]=children.1.rawValue;var descendants:[AXUIElement]=[]
  if children.1 == .success{if let values=children.0 as?[AXUIElement]{descendants=values}else{s.complete=false;s.flags.append("children-type-error")}}
  else if !expectedAbsent(children.1){s.complete=false;s.flags.append("children-provider-error")}
  if !descendants.isEmpty && path.count>=32{s.complete=false;s.flags.append("depth-cap");descendants=[]};if descendants.count>256{s.complete=false;s.flags.append("child-count-cap");descendants=Array(descendants.prefix(256))}
  row["childCount"]=descendants.count
  let count=(try? JSONSerialization.data(withJSONObject:row).count) ?? 524289
  if s.bytes+count>480000{s.complete=false;s.flags.append("byte-cap");break};s.bytes+=count;s.rows.append(row);s.nodes.append(e)
  queue.append(contentsOf:descendants.enumerated().map{($0.element,path+[$0.offset])})
 }
 s.rootRows.append(["elapsedSeconds":Date().timeIntervalSince(began),"queuedNodesRemaining":queue.count]);if !queue.isEmpty{s.complete=false};return s
}
func saveAX(_ snapshot:AXControlSnapshot,_ name:String)throws{
 let value:[String:Any]=["scope":"unique nonminimized own FBones AXWindow from exact app AXWindows; complete relevant owned subtree","complete":snapshot.complete,"flags":Array(Set(snapshot.flags)).sorted(),"rootWindows":snapshot.rootRows,"rows":snapshot.rows,"nodeCap":1024,"depthCap":32,"stringCharCap":1024,"byteCap":524288,"loopSeconds":15]
 let data=try JSONSerialization.data(withJSONObject:value,options:[.sortedKeys]);guard data.count<=524288 else{throw NSError(domain:"AX diagnostic byte cap",code:30)};try data.write(to:reports.appendingPathComponent(name),options:.withoutOverwriting)
}
func nativeRendererReady()->Bool{guard let url=nativeLogURL,let handle=try? FileHandle(forReadingFrom:url)else{return false};defer{try? handle.close()};let data=(try? handle.read(upToCount:65536)) ?? Data();return String(decoding:data,as:UTF8.self).contains("FBones UI ready; renderer=webgl")}
func noStartupOrUnsupported(_ value:String)->Bool{let text=value.replacingOccurrences(of:"\\s+",with:" ",options:.regularExpression);return !text.contains("The viewport could not start.") && !text.contains("Opening workspace") && !text.contains("Automatic updates are unavailable for this copy.")}
func panelCurrentVersion(_ value:String)->Bool{return value.range(of:"Current\\s+version:\\s*0\\.9\\.5\\b",options:.regularExpression) != nil}
func controlVersion(_ value:String)->Bool{return value.range(of:"\\b0\\.9\\.5\\b",options:.regularExpression) != nil}

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
 let root=AXUIElementCreateApplication(app.processIdentifier);var before=AXControlSnapshot();let readyEnd=Date(timeIntervalSinceNow:30)
 repeat{before=inventoryControls(root,app.processIdentifier);if before.complete && controlVersion(before.visibleText) && before.updates.count==1 && nativeRendererReady(){break};pump(0.2)}while Date()<readyEnd
 try saveAX(before,"ax-before.json")
 let webArea=before.rows.contains{$0["role"]as?String=="AXWebArea"};let viewport=before.texts.contains("Viewport")
 proof["viewportRoleClassification"]=["webAreaObserved":webArea,"viewportLabelObserved":viewport,"relevantTreeComplete":before.complete,"absenceMeans":before.complete ? "not observed in this qualified native tree" : "unknown due to incomplete tree"]
 proof["viewportAccessibilityShapeVerified"]=before.complete && webArea && viewport
 proof["rendererReady"]=["observed":nativeRendererReady(),"source":"actual stock native frontend_ready stdout from this launch","pixelParityClaimed":false]
 guard before.complete,nativeRendererReady(),controlVersion(before.visibleText),noStartupOrUnsupported(before.visibleText),before.updates.count==1,let ownWindow=before.window else{throw NSError(domain:"Complete owned AX updater controls/version/native renderer evidence unqualified; inventory retained",code:31)}
 let index=before.updates[0];let button=before.nodes[index];let owner=axOwner(button);let enabled=readAX(button,kAXEnabledAttribute);var actions:CFArray?;let actionStatus=AXUIElementCopyActionNames(button,&actions)
 guard owner.1 == .success,owner.0==app.processIdentifier,enabled.0 as?Bool==true,actionStatus == .success,((actions as?[String]) ?? []).contains("AXPress"),text(button).contains(where:{updatesNameVariant($0) != nil})else{throw NSError(domain:"Selected own enabled AX Updates/Press changed",code:32)}
 proof["selectedUpdates"]=["before":before.rows[index],"actionLabels":text(button),"actionVariants":text(button).compactMap{updatesNameVariant($0)}]
 var cursor:AXUIElement?=button;var rooted=false
 for _ in 0..<64{guard let current=cursor else{break};if CFEqual(current,ownWindow){rooted=true;break};let parent=readAX(current,kAXParentAttribute);if parent.1 != .success{cursor=nil}else if let value=parent.0,CFGetTypeID(value)==AXUIElementGetTypeID(){cursor=(value as! AXUIElement)}else{cursor=nil}}
 guard rooted else{throw NSError(domain:"AX Updates left qualified own native window",code:33)}
 _ = try verifyNativeKernel();let wasPanel=panelCurrentVersion(before.visibleText);proof["oneAXPressAttempted"]=true
 guard AXUIElementPerformAction(button,kAXPressAction as CFString) == .success else{throw NSError(domain:"Scoped Updates AXPress failed",code:9)};proof["oneAXPressReturned"]=true
 var after=AXControlSnapshot();var afterPanel=wasPanel;let toggleEnd=Date(timeIntervalSinceNow:15)
 repeat{after=inventoryControls(root,app.processIdentifier);afterPanel=panelCurrentVersion(after.visibleText);if after.complete && afterPanel != wasPanel && controlVersion(after.visibleText) && noStartupOrUnsupported(after.visibleText){break};pump(0.2)}while Date()<toggleEnd
 try saveAX(after,"ax-after.json")
 guard after.complete,afterPanel != wasPanel,controlVersion(after.visibleText),noStartupOrUnsupported(after.visibleText)else{throw NSError(domain:"One actual AX Updates press had no supported current-version panel transition",code:10)}
 proof["updaterControl"]=["version":"0.9.5","provider":"owned native AppKit/WKWebView AX","oneScopedPress":true,"panelBefore":wasPanel,"panelAfter":afterPanel,"actualPanelTransition":true]
 proof["normalClose"]=closeOwn();proof["exitCode"]=child?.isRunning == false ? child?.terminationStatus : nil;guard proof["normalClose"]as?Bool==true,child?.terminationStatus == 0 else{throw NSError(domain:"Own native normal close unobserved; no force",code:11)};proof["updaterControlCapabilityPassed"]=true;proof["status"]="UPDATER_CONTROL_CAPABILITY_PASS";writeProof();exit(0)
}catch{proof["error"]=String(describing:error);if owned != nil && proof["normalClose"]as?Bool != true{proof["normalClose"]=closeOwn()};writeProof();exit(2)}
extension ProcessInfo{var machineArchitecture:String{var system=utsname();uname(&system);return withUnsafePointer(to:&system.machine){$0.withMemoryRebound(to:CChar.self,capacity:1){String(cString:$0)}}}}
