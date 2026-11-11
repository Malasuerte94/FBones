import Foundation
import AppKit
import ApplicationServices
import CryptoKit
import Darwin
import Carbon.HIToolbox
let arguments=CommandLine.arguments
if arguments.count != 5 { fatalError("Expected own installed bundle, reports directory and executable SHA256") }
let bundleURL=URL(fileURLWithPath:arguments[1]), initialReports=URL(fileURLWithPath:arguments[2]), initialExpected=arguments[3], helperDir=URL(fileURLWithPath:arguments[4])
var reports=initialReports;var expected=initialExpected;var currentExecutable:URL?;var automaticPid:pid_t?;var phase="old"
let projectName="Own Debian installed upgrade", defaultName=""
let destination=initialReports.deletingLastPathComponent().appendingPathComponent("projects/own-upgrade.fbones")
var scopedAXWindow:AXUIElement?;var chooserScope=false;var safeToClose=true;var saveDispatchSeconds:UInt64=0;var saveDispatchMicros:UInt64=0
var proof:[String:Any] = ["passed":false,"route":"mac-dmg","stage":"existing-project-core-upgrade-v1","upgradeAttempted":false,"normalClose":false]
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
 guard providerProved,let baseline=nativeKernelBaseline,let exe=currentExecutable else{throw NSError(domain:"Proven provider and owned native baseline required",code:22)}
 let current:KernelIdentity
 if let process=child { current=try readKernel(process,exe) }
 else {guard let pid=automaticPid,let app=owned,!app.isTerminated,app.processIdentifier==pid else{throw error("Automatic own app unavailable")};current=try readDiscoveredKernel(pid,exe)}
 guard OwnMainUser(current.pid,current.startSeconds,current.startMicroseconds)==1 else{throw NSError(domain:"Current native kernel UID/start mismatch",code:27)};guard sameKernel(baseline,current)else{throw NSError(domain:"Stock child's actual kernel start/file identity changed",code:23)}
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
 for(i,w)in windows.enumerated(){let owner=axOwner(w),role=readAX(w,kAXRoleAttribute),title=readAX(w,kAXTitleAttribute),minimized=readAX(w,kAXMinimizedAttribute);let titleText=(title.0 as?String) ?? "";s.rootRows.append(["windowIndex":i,"pid":owner.0,"pidError":owner.1.rawValue,"role":(role.0 as?String) ?? "missing","title":String(titleText.prefix(1024)),"minimized":(minimized.0 as?Bool) ?? true,"titleError":title.1.rawValue,"minimizedError":minimized.1.rawValue]);let acceptedWindow = chooserScope ? (role.0 as?String=="AXWindow" && (minimized.0 as?Bool==false || expectedAbsent(minimized.1))) : (role.0 as?String=="AXWindow" && minimized.0 as?Bool==false && (scopedAXWindow.map{CFEqual($0,w)} ?? (titleText=="FBones")))
 if owner.1 == .success && owner.0==pid && acceptedWindow{candidates.append((w,i))}}
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
  for (key,attr) in [("nativeURL",kAXURLAttribute),("selected",kAXSelectedAttribute)] {let v=readAX(e,attr);row[key+"Error"]=v.1.rawValue;if let u=v.0 as?URL{row[key]=u.absoluteString}else if let t=v.0 as?String{row[key]=String(t.prefix(1024));if t.count>1024{s.complete=false;s.flags.append("url-string-cap")}}else if let n=v.0 as?NSNumber{row[key]=n.boolValue};if v.1 != .success && !expectedAbsent(v.1){s.complete=false;s.flags.append("native-association-provider-error")}}
  let enabled=readAX(e,kAXEnabledAttribute);row["enabled"]=(enabled.0 as?Bool) ?? false;row["enabledError"]=enabled.1.rawValue
  var settable=DarwinBoolean(false);let setStatus=AXUIElementIsAttributeSettable(e,kAXValueAttribute as CFString,&settable);row["valueSettable"]=setStatus == .success && settable.boolValue;row["valueSettableError"]=setStatus.rawValue
  let label=readAX(e,kAXTitleUIElementAttribute);if let ref=label.0,CFGetTypeID(ref)==AXUIElementGetTypeID(){let node=ref as! AXUIElement;let lo=axOwner(node);if lo.1 == .success && lo.0==pid{row["label"]=text(node).joined(separator:" ")}else{s.complete=false;s.flags.append("foreign-field-label")}}
  if let rect=axRect(e){row["rect"]=rect}else{row["rect"]=[] as [Double]}
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


func error(_ message:String)->NSError{NSError(domain:message,code:50)}
func axRect(_ e:AXUIElement)->[Double]?{
 let a=readAX(e,kAXPositionAttribute),b=readAX(e,kAXSizeAttribute);guard a.1 == .success,b.1 == .success,let av=a.0,let bv=b.0,CFGetTypeID(av)==AXValueGetTypeID(),CFGetTypeID(bv)==AXValueGetTypeID()else{return nil}
 var point=CGPoint.zero,size=CGSize.zero;guard AXValueGetValue(av as! AXValue,.cgPoint,&point),AXValueGetValue(bv as! AXValue,.cgSize,&size),point.x.isFinite,point.y.isFinite,size.width.isFinite,size.height.isFinite,size.width>0,size.height>0 else{return nil};return[Double(point.x),Double(point.y),Double(size.width),Double(size.height)]
}
func visibleInWindow(_ row:[String:Any],_ snapshot:AXControlSnapshot)->Bool{
 guard let r=row["rect"]as?[Double],r.count==4,let window=snapshot.window,let w=axRect(window)else{return false}
 return r[0]>=w[0] && r[1]>=w[1] && r[0]+r[2]<=w[0]+w[2] && r[1]+r[3]<=w[1]+w[3]
}
func receipt(_ name:String,_ value:[String:Any])throws{let data=try JSONSerialization.data(withJSONObject:value,options:[.sortedKeys,.prettyPrinted]);guard data.count<=524288 else{throw error("Receipt cap")};try data.write(to:reports.appendingPathComponent(name),options:.withoutOverwriting)}
func requireRoot(_ element:AXUIElement,_ window:AXUIElement,_ pid:pid_t)throws{
 var cursor:AXUIElement?=element;for _ in 0..<64{guard let current=cursor else{break};let owner=axOwner(current);guard owner.1 == .success,owner.0==pid else{throw error("AX parent owner changed")};if CFEqual(current,window){return};let p=readAX(current,kAXParentAttribute);if let next=p.0,p.1 == .success,CFGetTypeID(next)==AXUIElementGetTypeID(){cursor=next as! AXUIElement}else{cursor=nil}}
 throw error("AX target left current owned window")
}
func snapshot(_ name:String,_ root:AXUIElement,_ pid:pid_t)throws->AXControlSnapshot{
 _ = try verifyNativeKernel();let s=inventoryControls(root,pid);try saveAX(s,name+".json");guard s.complete,let w=s.window else{throw error("Complete owned AX inventory required: "+name)};if !chooserScope{if let old=scopedAXWindow{guard CFEqual(old,w)else{throw error("Owned window changed")}}else{scopedAXWindow=w}};return s
}
func unique(_ s:AXControlSnapshot,_ role:String,_ names:Set<String>,description:String?=nil,settable:Bool=false)throws->Int{
 let hits=s.rows.indices.filter{i in let r=s.rows[i];let fields=["title","description","label"].compactMap{r[$0]as?String};return r["role"]as?String==role && r["ownerMatches"]as?Bool==true && r["enabled"]as?Bool==true && fields.contains(where:{names.contains($0)}) && (description==nil || r["description"]as?String==description!) && (!settable || r["valueSettable"]as?Bool==true) && visibleInWindow(r,s)}
 guard hits.count==1 else{throw error("Unique qualified "+role+" "+names.sorted().joined(separator:"|")+" unavailable ("+String(hits.count)+")")};return hits[0]
}
func mainPress(_ root:AXUIElement,_ pid:pid_t,_ names:Set<String>,_ label:String,description:String?=nil)throws{
 let before=try snapshot(label+"-before",root,pid),index=try unique(before,"AXButton",names,description:description);let node=before.nodes[index];guard let window=before.window,(before.rows[index]["actions"]as?[String] ?? []).contains("AXPress")else{throw error("Press interface unavailable")};try requireRoot(node,window,pid);_ = try verifyNativeKernel();let current=inventoryControls(root,pid);guard current.complete,let j=current.nodes.firstIndex(where:{CFEqual($0,node)}),let w=current.window,CFEqual(w,window),visibleInWindow(current.rows[j],current),current.rows[j]["enabled"]as?Bool==true,current.rows[j]["role"]as?String=="AXButton",(current.rows[j]["actions"]as?[String] ?? []).contains("AXPress"),names.contains((current.rows[j]["title"]as?String) ?? ""),(description==nil || current.rows[j]["description"]as?String==description!)else{throw error("Current press target changed")}
 try receipt(label+"-intent.json",["maximumActions":1,"pid":pid,"selected":current.rows[j],"noFallback":true]);let status=AXUIElementPerformAction(node,kAXPressAction as CFString);try receipt(label+"-result.json",["attempted":true,"returned":status == .success,"apiError":status.rawValue]);guard status == .success else{throw error("Native scoped press failed")}
}
func canSetNow(_ node:AXUIElement,_ pid:pid_t)throws{let owner=axOwner(node),role=readAX(node,kAXRoleAttribute),enabled=readAX(node,kAXEnabledAttribute);var settable=DarwinBoolean(false);guard owner.1 == .success,owner.0==pid,role.0 as?String=="AXTextField",enabled.0 as?Bool==true,AXUIElementIsAttributeSettable(node,kAXValueAttribute as CFString,&settable) == .success,settable.boolValue else{throw error("Current owned text setter interface changed")}}

func exactCleanTitle(_ s:AXControlSnapshot)->Bool{guard let window=s.window else{return false};let title=readAX(window,kAXTitleAttribute);return title.1 == .success && title.0 as?String==projectName+" — FBones"}
func pollApp(_ root:AXUIElement,_ pid:pid_t,_ name:String,_ predicate:(AXControlSnapshot)->Bool)throws->AXControlSnapshot{
 let deadline=Date(timeIntervalSinceNow:20);var last=AXControlSnapshot();repeat{_ = try verifyNativeKernel();last=inventoryControls(root,pid);if last.complete && predicate(last){try saveAX(last,name+".json");return last};pump(0.2)}while Date()<deadline;try saveAX(last,name+".json");throw error("Bounded app state missing: "+name)
}
func copiedArgs(_ value:OwnPickerChild)throws->[String]{
 var local=value;var buffer=[CChar](repeating:0,count:8192)
 let count=withUnsafePointer(to:&local){pointer in buffer.withUnsafeMutableBufferPointer{output in OwnCopySaveArgv(pointer,output.baseAddress,Int32(output.count))}}
 guard local.complete==1,count>0,count<=8192,count==local.argBytes else{throw error("Bounded C argv getter failed")}
 let bytes=buffer.prefix(Int(count)).map{UInt8(bitPattern:$0)};guard bytes.last==0 else{throw error("Copied argv missing final NUL")}
 let parts=bytes.split(separator:0,omittingEmptySubsequences:false).dropLast();guard parts.count==Int(local.argc)else{throw error("Copied argv count changed")}
 return parts.map{String(decoding:$0,as:UTF8.self)}
}
func findChild()throws->OwnPickerChild{
 _ = try verifyNativeKernel();guard let baseline=nativeKernelBaseline else{throw error("Kernel baseline missing")};var c=OwnPickerChild();let result=OwnFindSaveChild(baseline.pid,baseline.startSeconds,baseline.startMicroseconds,saveDispatchSeconds,saveDispatchMicros,&c)
 proof["pickerChildLastQuery"]=["result":result,"error":c.error,"argError":c.argError,"childCount":c.childCount,"candidates":c.candidates,"mainPid":c.mainPid,"mainUid":c.mainUid]
 guard result==1,c.complete==1,c.childParent==baseline.pid,c.childUid==Int32(getuid()),c.argBytes>0,c.argBytes<=8192 else{throw error("Fresh owned osascript child unqualified")}
 let argv:[String]=try copiedArgs(c)
 let script="on run argv\nreturn POSIX path of (choose file with prompt \"Open a project\")\nend run"
 guard argv==["osascript","-e",script,"--",defaultName]else{try receipt("picker-child-argv-negative.json",["argv":argv,"argc":c.argc]);throw error("Child argv not exact shipped Open operation")}
 _ = try verifyNativeKernel();return c
}
func childTuple(_ c:OwnPickerChild)throws->[String:Any]{let argv:[String]=try copiedArgs(c);return ["argv":argv,"pid":c.childPid,"ppid":c.childParent,"uid":c.childUid,"startSeconds":c.startSeconds,"startMicroseconds":c.startMicroseconds,"device":c.device,"inode":c.inode,"argc":c.argc,"argvBytes":c.argBytes,"complete":c.complete==1]}
func sameChild(_ first:OwnPickerChild)throws{let now=try findChild();guard now.childPid==first.childPid,now.childParent==first.childParent,now.childUid==first.childUid,now.startSeconds==first.startSeconds,now.startMicroseconds==first.startMicroseconds,now.device==first.device,now.inode==first.inode else{throw error("Picker child identity changed")}}
func readDiscoveredKernel(_ pid:pid_t,_ exe:URL)throws->KernelIdentity{
 var i=OwnProcessIdentity();let status=exe.path.withCString{OwnReadProcessIdentity(pid,$0,&i)}
 let path=withUnsafeBytes(of:i.actualPath){String(decoding:$0.prefix{$0 != 0},as:UTF8.self)}
 guard status==1,i.requestedPid==pid,i.observedPid==pid,OwnMainUser(pid,i.startSeconds,i.startMicroseconds)==1 else{throw error("Discovered own app kernel identity unqualified")}
 return KernelIdentity(pid:pid,startSeconds:i.startSeconds,startMicroseconds:i.startMicroseconds,device:i.actualDevice,inode:i.actualInode,path:path)
}
func hash(_ data:Data)->String{SHA256.hash(data:data).map{String(format:"%02x",$0)}.joined()}
func version(_ s:AXControlSnapshot,_ v:String)->Bool{s.visibleText.range(of:"Current\\s+version:\\s*"+NSRegularExpression.escapedPattern(for:v)+"\\b",options:.regularExpression) != nil}
func recheckFile()throws{let data=try Data(contentsOf:destination);guard data.count==405,hash(data)=="e74a15b08b9cbc85f943ddde46c37c5cbceed3eb70968932ccd416697c6ecb5d" else{throw error("Own existing checkpoint changed")}}
func checkSemantic(_ label:String)throws{
 try recheckFile();let p=Process();p.executableURL=URL(fileURLWithPath:"/usr/bin/env");p.arguments=["python3",helperDir.appendingPathComponent("own-minimal-checkpoint.py").path,destination.path,"--project-name",projectName,"--bone-name","Upgrade root","--root-x","37.5","--out",reports.appendingPathComponent(label+"-checkpoint.json").path];p.standardInput=FileHandle.nullDevice;p.standardOutput=FileHandle.nullDevice;p.standardError=FileHandle.nullDevice;try p.run();let until=Date(timeIntervalSinceNow:15);while p.isRunning && Date()<until{pump(0.1)};guard !p.isRunning,p.terminationReason == .exit,p.terminationStatus==0 else{throw error("Strict unchanged checkpoint verification failed/pending")}
}
func focusChooser(_ c:OwnPickerChild,_ app:AXUIElement,_ window:AXUIElement)throws{
 try sameChild(c);let focused=readAX(app,kAXFocusedWindowAttribute)
 guard NSWorkspace.shared.frontmostApplication?.processIdentifier==c.childPid,focused.1 == .success,let f=focused.0,CFGetTypeID(f)==AXUIElementGetTypeID(),CFEqual(f,window),readAX(window,kAXModalAttribute).0 as?Bool==true else{throw error("Owned chooser frontmost/focused modal contract unavailable; no focus repair")}
}
func within(_ node:AXUIElement,_ ancestor:AXUIElement,_ pid:pid_t)->Bool{do{try requireRoot(node,ancestor,pid);return true}catch{return false}}
func pickerPress(_ c:OwnPickerChild,_ app:AXUIElement,_ window:AXUIElement,_ before:AXControlSnapshot,_ index:Int,_ label:String)throws{
 try sameChild(c);try requireRoot(before.nodes[index],window,c.childPid)
 let current=try snapshot(label+"-current",app,c.childPid)
 guard let w=current.window,CFEqual(w,window),let i=current.nodes.firstIndex(where:{CFEqual($0,before.nodes[index])}),current.rows[i]["role"]as?String=="AXButton",current.rows[i]["enabled"]as?Bool==true,visibleInWindow(current.rows[i],current),(current.rows[i]["actions"]as?[String] ?? []).contains("AXPress"),current.rows[i]["title"]as?String==before.rows[index]["title"]as?String else{throw error("Current native picker button association changed")}
 try receipt(label+"-intent.json",["maximumActions":1,"child":try childTuple(c),"selected":current.rows[i],"noFallback":true]);let r=AXUIElementPerformAction(current.nodes[i],kAXPressAction as CFString);try receipt(label+"-result.json",["attempted":true,"apiError":r.rawValue,"returned":r == .success]);guard r == .success else{throw error("One native picker press failed")}
}
func openPicker(_ c:OwnPickerChild)throws{
 chooserScope=true;defer{chooserScope=false};let app=AXUIElementCreateApplication(c.childPid)
 let initial=try snapshot("open-picker-inventory",app,c.childPid)
 guard let window=initial.window,initial.texts.contains("Open a project"),readAX(window,kAXModalAttribute).0 as?Bool==true else{throw error("Exact Open helper/chooser host/modal/prompt unknown")}
 try focusChooser(c,app,window);try recheckFile()
 let sequence:[(CGKeyCode,Bool,String)]=[(CGKeyCode(kVK_Command),true,"Command-down"),(CGKeyCode(kVK_Shift),true,"Shift-down"),(CGKeyCode(kVK_ANSI_G),true,"G-down"),(CGKeyCode(kVK_ANSI_G),false,"G-up"),(CGKeyCode(kVK_Shift),false,"Shift-up"),(CGKeyCode(kVK_Command),false,"Command-up")]
 try receipt("go-folder-chord-intent.json",["child":try childTuple(c),"target":"AX application for exact own osascript PID","maximumChords":1,"sdkKeys":sequence.map{["keyCode":Int($0.0),"down":$0.1,"name":$0.2]},"noGlobalInput":true,"noFocusRepair":true])
 var returns:[[String:Any]]=[];for(key,down,name)in sequence{let r=AXUIElementPostKeyboardEvent(app,0,key,down);returns.append(["name":name,"apiError":Int(r.rawValue)])};try receipt("go-folder-chord-result.json",["attempted":true,"returns":returns]);guard returns.allSatisfy({$0["apiError"]as?Int==0})else{throw error("Scoped chord API failure; no retry")}
 let until=Date(timeIntervalSinceNow:10);var go=AXControlSnapshot();var sheetIndex:Int?
 repeat{try sameChild(c);go=inventoryControls(app,c.childPid);if go.complete{let hits=go.rows.indices.filter{i in guard go.rows[i]["role"]as?String=="AXSheet",visibleInWindow(go.rows[i],go)else{return false};if ["Go to Folder","Go to the folder:","Go to folder:"].contains((go.rows[i]["title"]as?String) ?? ""){return true};return go.rows.indices.contains{j in within(go.nodes[j],go.nodes[i],c.childPid) && ["title","value","description"].contains{field in ["Go to the folder:","Go to Folder"].contains((go.rows[j][field]as?String) ?? "")}}};if hits.count==1{sheetIndex=hits[0];break};if hits.count>1{break}};pump(0.1)}while Date()<until
 try saveAX(go,"go-folder-sheet.json");guard go.complete,let si=sheetIndex,let w=go.window,CFEqual(w,window)else{throw error("Actual same-child Go to Folder sheet unknown/ambiguous")};let sheet=go.nodes[si]
 let fields=go.rows.indices.filter{["AXTextField","AXComboBox"].contains((go.rows[$0]["role"]as?String) ?? "") && go.rows[$0]["enabled"]as?Bool==true && go.rows[$0]["valueSettable"]as?Bool==true && visibleInWindow(go.rows[$0],go) && within(go.nodes[$0],sheet,c.childPid)}
 guard fields.count==1 else{throw error("Unique same-sheet native path field unknown")};let fi=fields[0],dir=destination.deletingLastPathComponent().resolvingSymlinksInPath().path
 try focusChooser(c,app,window);try requireRoot(go.nodes[fi],sheet,c.childPid);var setter=DarwinBoolean(false);guard AXUIElementIsAttributeSettable(go.nodes[fi],kAXValueAttribute as CFString,&setter) == .success,setter.boolValue else{throw error("Current path setter disappeared")}
 try receipt("go-folder-path-intent.json",["selected":go.rows[fi],"directory":dir,"maximumSets":1]);let set=AXUIElementSetAttributeValue(go.nodes[fi],kAXValueAttribute as CFString,dir as CFString);let back=readAX(go.nodes[fi],kAXValueAttribute);try receipt("go-folder-path-result.json",["apiError":set.rawValue,"readbackError":back.1.rawValue,"readback":back.0 as?String ?? "missing"]);guard set == .success,back.1 == .success,back.0 as?String==dir else{throw error("Go path exact readback failed")}
 let accept=try unique(go,"AXButton",["Go"]);guard within(go.nodes[accept],sheet,c.childPid)else{throw error("Go button not in retained same-child sheet")};try pickerPress(c,app,window,go,accept,"go-folder-accept")
 var rows=AXControlSnapshot();var rowIndex:Int?;let rowEnd=Date(timeIntervalSinceNow:10)
 repeat{try sameChild(c);rows=inventoryControls(app,c.childPid);if rows.complete{let hits=rows.rows.indices.filter{i in guard ["AXRow","AXCell"].contains((rows.rows[i]["role"]as?String) ?? ""),let value=rows.rows[i]["nativeURL"]as?String,let url=URL(string:value),url.isFileURL else{return false};return visibleInWindow(rows.rows[i],rows) && url.resolvingSymlinksInPath()==destination.resolvingSymlinksInPath()};if hits.count==1{rowIndex=hits[0];break};if hits.count>1{break}};pump(0.1)}while Date()<rowEnd
 try saveAX(rows,"open-file-row.json");guard rows.complete,let ri=rowIndex,let currentWindow=rows.window,CFEqual(currentWindow,window),rows.texts.contains("Open a project"),!rows.rows.contains(where:{$0["role"]as?String=="AXSheet"}) else{throw error("Exact native URL-bound own file row/current directory unproved")}
 try recheckFile();try sameChild(c);try requireRoot(rows.nodes[ri],window,c.childPid);var selectedSet=DarwinBoolean(false);let selectedBefore=readAX(rows.nodes[ri],kAXSelectedAttribute)
 let currentURL=readAX(rows.nodes[ri],kAXURLAttribute);let url=(currentURL.0 as?URL) ?? (currentURL.0 as?String).flatMap{URL(string:$0)}
 guard currentURL.1 == .success,url?.isFileURL==true,url?.resolvingSymlinksInPath()==destination.resolvingSymlinksInPath(),readAX(window,kAXModalAttribute).0 as?Bool==true,selectedBefore.1 == .success,selectedBefore.0 as?Bool==false,AXUIElementIsAttributeSettable(rows.nodes[ri],kAXSelectedAttribute as CFString,&selectedSet) == .success,selectedSet.boolValue else{throw error("One native row selection interface unavailable or already selected")}
 try receipt("open-row-selection-intent.json",["selected":rows.rows[ri],"path":destination.path,"sha256":"e74a15b08b9cbc85f943ddde46c37c5cbceed3eb70968932ccd416697c6ecb5d","maximumSelections":1]);let sel=AXUIElementSetAttributeValue(rows.nodes[ri],kAXSelectedAttribute as CFString,kCFBooleanTrue);let state=readAX(rows.nodes[ri],kAXSelectedAttribute);try receipt("open-row-selection-result.json",["apiError":sel.rawValue,"readbackError":state.1.rawValue,"selected":state.0 as?Bool ?? false]);guard sel == .success,state.1 == .success,state.0 as?Bool==true else{throw error("Selected native row effect unproved")}
 let ready=try snapshot("open-before-accept",app,c.childPid);let oi=try unique(ready,"AXButton",["Open"]);guard let selected=ready.nodes.firstIndex(where:{CFEqual($0,rows.nodes[ri])}),ready.rows[selected]["selected"]as?Bool==true,ready.rows[selected]["nativeURL"]as?String==rows.rows[ri]["nativeURL"]as?String else{throw error("Fresh selected same own row missing")};try recheckFile();try pickerPress(c,app,window,ready,oi,"open-accept")
}
func verifyProject(_ root:AXUIElement,_ pid:pid_t,_ label:String)throws{
 let s=try pollApp(root,pid,label){exactCleanTitle($0) && noStartupOrUnsupported($0.visibleText)}
 let name=try unique(s,"AXTextField",["Name"],settable:true),x=try unique(s,"AXTextField",["x"],settable:true)
 guard s.rows[name]["value"]as?String=="Upgrade root",s.rows[x]["value"]as?String=="37.5" else{throw error("Clean opened project/root/X semantics unproved")};try checkSemantic(label);safeToClose=true
}
func ordinaryOpen(_ root:AXUIElement,_ pid:pid_t)throws{
 safeToClose=false;let now=Date().timeIntervalSince1970;saveDispatchSeconds=UInt64(now);saveDispatchMicros=UInt64((now-floor(now))*1_000_000)
 try mainPress(root,pid,["Open project"],"toolbar-open",description:"Open project")
 var result:OwnPickerChild?;let end=Date(timeIntervalSinceNow:15);repeat{do{result=try findChild()}catch{if ((proof["pickerChildLastQuery"]as?[String:Any])?["error"]as?Int32) != 10{throw error}};if result==nil{pump(0.1)}}while result==nil && Date()<end
 guard let c=result else{throw error("Fresh exact Open osascript child absent")};try receipt("open-child.json",try childTuple(c));try openPicker(c);try verifyProject(root,pid,"opened-clean")
}
func currentPanel(_ root:AXUIElement,_ pid:pid_t,_ v:String,_ label:String)throws->AXControlSnapshot{
 var s=try snapshot(label+"-initial",root,pid)
 if !version(s,v){guard s.updates.count==1 else{throw error("Unique native Updates control missing")};let raw=s.rows[s.updates[0]]["title"]as?String ?? "";guard updatesNameVariant(raw) != nil else{throw error("Updates caption outside closed grammar")};try mainPress(root,pid,[raw],label+"-updates")}
 s=try pollApp(root,pid,label+"-current"){version($0,v) && noStartupOrUnsupported($0.visibleText)};return s
}
func bundleVersion()throws->String{let raw=try Data(contentsOf:bundleURL.appendingPathComponent("Contents/Info.plist"));guard raw.count<1024*1024,let value=try PropertyListSerialization.propertyList(from:raw,format:nil)as?[String:Any],value["CFBundleIdentifier"]as?String=="studio.fbones.editor",let version=value["CFBundleShortVersionString"]as?String else{throw error("Fresh installed plist/version unqualified")};return version}
func visibleOwn(_ pid:pid_t)->Bool{let values=CGWindowListCopyWindowInfo([.optionOnScreenOnly,.excludeDesktopElements],kCGNullWindowID)as?[[String:Any]] ?? [];return values.contains{($0[kCGWindowOwnerPID as String]as?Int)==Int(pid) && ($0[kCGWindowLayer as String]as?Int)==0}}
func startSession(_ v:String,_ sha:String,_ label:String)throws->AXUIElement{
 phase=label;reports=initialReports.appendingPathComponent(label);try FileManager.default.createDirectory(at:reports,withIntermediateDirectories:false);expected=sha;automaticPid=nil;child=nil;owned=nil;scopedAXWindow=nil;nativeKernelBaseline=nil;safeToClose=true
 guard try bundleVersion()==v,NSWorkspace.shared.runningApplications.allSatisfy({$0.bundleURL?.standardizedFileURL != bundleURL.standardizedFileURL})else{throw error("Fresh own bundle version/absence required")}
 let exe=bundleURL.appendingPathComponent("Contents/MacOS/fbones");guard hash(try Data(contentsOf:exe))==sha else{throw error("Installed native member hash mismatch")};currentExecutable=exe
 let process=Process();process.executableURL=exe;process.currentDirectoryURL=bundleURL.deletingLastPathComponent();process.standardInput=FileHandle.nullDevice
 let logURL=reports.appendingPathComponent("native-spool.log");guard FileManager.default.createFile(atPath:logURL.path,contents:nil)else{throw error("Fresh native spool creation failed")};let handle=try FileHandle(forWritingTo:logURL);nativeLog=handle;nativeLogURL=logURL;process.standardOutput=handle;process.standardError=handle
 try process.run();child=process;nativeKernelBaseline=try readKernel(process,exe);_ = try verifyNativeKernel();try receipt("created.json",["kernel":nativeKernelBaseline!.json,"expectedVersion":v,"expectedNativeSha256":sha,"stdio":"NUL stdin/direct own file stdout+stderr"])
 let end=Date(timeIntervalSinceNow:30);repeat{retainLaunchObservation(process);if let candidate=NSRunningApplication(processIdentifier:process.processIdentifier),candidate.bundleURL?.standardizedFileURL==bundleURL.standardizedFileURL,candidate.executableURL?.standardizedFileURL==exe.standardizedFileURL,candidate.bundleIdentifier=="studio.fbones.editor",!candidate.isTerminated,visibleOwn(candidate.processIdentifier),AXIsProcessTrusted(){owned=candidate;let root=AXUIElementCreateApplication(candidate.processIdentifier);let s=inventoryControls(root,candidate.processIdentifier);if s.complete,noStartupOrUnsupported(s.visibleText),s.visibleText.contains(v),nativeRendererReady(),let w=s.window{scopedAXWindow=w;try saveAX(s,"initial-ready.json");return root}};pump(0.1)}while process.isRunning && Date()<end
 throw error("Created native app readiness/AX/kernel/version unproved")
}
func normalCloseRetained(_ label:String)throws{
 guard safeToClose,let app=owned,let process=child,(try? verifyNativeKernel()) != nil else{throw error("Safe retained normal close unavailable")};safeToClose=false
 try receipt(label+"-close-intent.json",["pid":app.processIdentifier,"kernel":nativeKernelBaseline!.json,"maximumNormalRequests":1]);let returned=app.terminate();let end=Date(timeIntervalSinceNow:20);while process.isRunning && Date()<end{pump(0.1)};try receipt(label+"-terminal.json",["requested":true,"requestReturned":returned,"isRunning":process.isRunning,"terminationStatus":process.isRunning ? -999:process.terminationStatus,"terminationReason":process.isRunning ? -999:process.terminationReason.rawValue,"noForce":true]);guard returned,!process.isRunning,process.terminationReason == .exit,process.terminationStatus==0 else{throw error("Retained native terminal0 unproved")}
}
func closeAutomatic()throws{
 guard safeToClose,let app=owned,child==nil,let baseline=nativeKernelBaseline,let exe=currentExecutable else{throw error("Qualified live automatic close required")};_ = try verifyNativeKernel();var reg=OwnNativeExitRegistration()
 let ok=exe.path.withCString{OwnRegisterNativeExit(baseline.pid,baseline.startSeconds,baseline.startMicroseconds,$0,&reg)}
 defer{OwnCloseNativeExit(&reg)}
 try receipt("automatic-exit-registration.json",["returned":ok,"attempted":reg.attempted,"active":reg.active,"registered":reg.registered,"pid":reg.pid,"uid":reg.uid,"startSeconds":reg.startSeconds,"startMicroseconds":reg.startMicroseconds,"device":reg.device,"inode":reg.inode,"error":reg.error,"systemError":reg.systemError,"registrationReturn":reg.registrationReturn,"registrationError":reg.registrationError,"postRegistrationIdentityVerified":reg.postRegistrationIdentityVerified,"receiptIdent":reg.receiptIdent,"receiptFilter":reg.receiptFilter,"receiptFlags":reg.receiptFlags,"receiptFflags":reg.receiptFflags,"receiptData":reg.receiptData,"registeredMonotonicNanoseconds":reg.registeredMonotonicNanoseconds,"sdkSizeofKevent":reg.sdkSizeofKevent,"sdkNoteExit":reg.sdkNoteExit,"sdkNoteExitStatus":reg.sdkNoteExitStatus])
 guard ok==1,reg.registered==1,reg.postRegistrationIdentityVerified==1 else{throw error("Actual SDK nonchild exit registration failed; no close")};_ = try verifyNativeKernel();safeToClose=false
 try receipt("automatic-close-intent.json",["pid":baseline.pid,"kernel":baseline.json,"maximumNormalRequests":1,"registrationProvedBeforeClose":true]);let requested=app.terminate();var result=OwnNativeExitResult();var status:Int32=0;let end=Date(timeIntervalSinceNow:20)
 repeat{status=OwnPollNativeExit(&reg,100,&result);if status != 0{break};pump(0.01)}while Date()<end
 try receipt("automatic-terminal.json",["requestReturned":requested,"state":status,"error":result.error,"apiReturn":result.apiReturn,"systemError":result.systemError,"pid":result.pid,"eventIdent":result.eventIdent,"eventFilter":result.eventFilter,"eventFlags":result.eventFlags,"eventFflags":result.eventFflags,"eventData":result.eventData,"terminalObserved":result.terminalObserved,"normalExit":result.normalExit,"exitCode":result.exitCode,"noForce":true])
 guard requested,status==1,result.terminalObserved==1,result.normalExit==1,result.exitCode==0 else{throw error("Actual registered automatic native normal0 unproved")}
}
func executeCore()throws{
 guard ProcessInfo.processInfo.environment["GITHUB_ACTIONS"]=="true",ProcessInfo.processInfo.environment["RUNNER_ENVIRONMENT"]=="github-hosted",let session=CGSessionCopyCurrentDictionary()as?[String:Any],session[kCGSessionOnConsoleKey as String]as?Bool==true,AXIsProcessTrusted() else{throw error("Hosted own Aqua/AX capability required; no permission bypass")}
 proof["aquaSession"]=true;proof["axTrusted"]=true;try proveKernelProvider();try checkSemantic("initial")
 let targetData=try Data(contentsOf:initialReports.appendingPathComponent("target-member.json"));guard targetData.count<=1024*1024,let target=try JSONSerialization.jsonObject(with:targetData)as?[String:Any],target["passed"]as?Bool==true,target["route"]as?String=="mac-updater-app",target["bundleVersion"]as?String=="0.9.6",target["bundleIdentifier"]as?String=="studio.fbones.editor",let newSHA=target["nativeSha256"]as?String,newSHA.count==64 else{throw error("Independent published target-member proof absent")}
 proof["targetMember"]=target
 let root=try startSession("0.9.5",initialExpected,"old");guard let old=child,let oldApp=owned,let oldBaseline=nativeKernelBaseline else{throw error("Retained stock old session missing")}
 proof["currentStage"]="old-native-open";try ordinaryOpen(root,oldApp.processIdentifier)
 // Stock background download/authentication is unchanged. Wait Ready without guessing panel state.
 var ready=AXControlSnapshot();let readyEnd=Date(timeIntervalSinceNow:180)
 repeat{_ = try verifyNativeKernel();ready=inventoryControls(root,oldApp.processIdentifier);if ready.complete,noStartupOrUnsupported(ready.visibleText),ready.updates.count==1,ready.visibleText.contains("Version 0.9.6 is ready to install."){break};pump(0.2)}while Date()<readyEnd
 try saveAX(ready,"stable-ready.json");guard ready.complete,ready.visibleText.contains("Version 0.9.6 is ready to install.")else{throw error("Actual stock signed Ready0.9.6 unproved")}
 _ = try currentPanel(root,oldApp.processIdentifier,"0.9.5","old");try verifyProject(root,oldApp.processIdentifier,"before-install-clean")
 var notifications:[[String:Any]]=[];var launched:[pid_t:NSRunningApplication]=[:];var overflow=false
 let installMoment=Date().timeIntervalSince1970
 let observer=NSWorkspace.shared.notificationCenter.addObserver(forName:NSWorkspace.didLaunchApplicationNotification,object:nil,queue:.main){note in
  guard let app=note.userInfo?[NSWorkspace.applicationUserInfoKey]as?NSRunningApplication,app.bundleURL?.standardizedFileURL==bundleURL.standardizedFileURL else{return};if notifications.count>=32{overflow=true;return};notifications.append(["pid":app.processIdentifier,"bundleURL":app.bundleURL?.absoluteString ?? "missing","bundleIdentifier":app.bundleIdentifier ?? "missing","executableURL":app.executableURL?.absoluteString ?? "missing","observedUtc":ISO8601DateFormatter().string(from:Date())]);if app.processIdentifier != oldBaseline.pid{launched[app.processIdentifier]=app}
 }
 defer{NSWorkspace.shared.notificationCenter.removeObserver(observer)}
 proof["currentStage"]="one-stock-clean-install";proof["upgradeAttempted"]=true;safeToClose=false;try mainPress(root,oldApp.processIdentifier,["Install and restart"],"clean-install")
 // Do not rehash the replaced pathname as the old mapped image after Install.
 let exitEnd=Date(timeIntervalSinceNow:180);while old.isRunning && Date()<exitEnd{pump(0.1)}
 try receipt("old-terminal.json",["pid":oldBaseline.pid,"kernelAtCreation":oldBaseline.json,"isRunning":old.isRunning,"terminationStatus":old.isRunning ? -999:old.terminationStatus,"terminationReason":old.isRunning ? -999:old.terminationReason.rawValue,"postInstallOldPathRehashed":false]);guard !old.isRunning,old.terminationReason == .exit,old.terminationStatus==0 else{throw error("Actual retained old exit0 unproved")}
 proof["oldRetainedExit0"]=true;child=nil;owned=nil;scopedAXWindow=nil;nativeKernelBaseline=nil;automaticPid=nil;expected=newSHA
 let autoEnd=Date(timeIntervalSinceNow:60);var successor: NSRunningApplication?;var successorKernel:KernelIdentity?
 repeat{
  guard !overflow,launched.count<=1 else{throw error("Ambiguous own-bundle automatic notifications")}
  if let app=launched.values.first,app.bundleIdentifier=="studio.fbones.editor",app.bundleURL?.standardizedFileURL==bundleURL.standardizedFileURL,let exe=app.executableURL,exe.standardizedFileURL==bundleURL.appendingPathComponent("Contents/MacOS/fbones").standardizedFileURL,!app.isTerminated,let k=try? readDiscoveredKernel(app.processIdentifier,exe),Double(k.startSeconds)+Double(k.startMicroseconds)/1_000_000>=installMoment,hash(try Data(contentsOf:exe))==newSHA,try bundleVersion()=="0.9.6",visibleOwn(app.processIdentifier){successor=app;successorKernel=k;break};pump(0.1)
 }while Date()<autoEnd
 try receipt("automatic-notifications.json",["notifications":notifications,"overflow":overflow,"uniqueNewPids":launched.keys.map{Int($0)},"discovery":"NSWorkspace notification scoped to unique own canonical bundle; no global PID search/manual app launch","sourcePredictedLaunchRoute":"Tauri packaged macOS open -n; immediate parent not observed here"])
 guard let auto=successor,let autoKernel=successorKernel else{throw error("Genuine unique automatic own-bundle target successor unproved")}
 phase="automatic";reports=initialReports.appendingPathComponent(phase);try FileManager.default.createDirectory(at:reports,withIntermediateDirectories:false);automaticPid=auto.processIdentifier;owned=auto;nativeKernelBaseline=autoKernel;currentExecutable=auto.executableURL;nativeLogURL=nil;nativeLog=nil;safeToClose=false
 try receipt("identity.json",["kernel":autoKernel.json,"bundleURL":auto.bundleURL!.absoluteString,"nativeSha256":newSHA,"freshPlistVersion":try bundleVersion(),"automaticNotification":true,"immediateParentObserved":false])
 let autoRoot=AXUIElementCreateApplication(auto.processIdentifier);_ = try pollApp(autoRoot,auto.processIdentifier,"ready"){$0.updates.count==1 && noStartupOrUnsupported($0.visibleText)}
 _ = try currentPanel(autoRoot,auto.processIdentifier,"0.9.6","automatic");try recheckFile();safeToClose=true;try closeAutomatic();proof["automaticUpgradePassed"]=true;proof["automaticRegisteredExit0"]=true
 // A distinct manual control session begins ONLY after actual SDK automatic terminal0.
 proof["currentStage"]="separate-fresh-installed-open";let fresh=try startSession("0.9.6",newSHA,"fresh");guard let freshApp=owned else{throw error("Separate fresh app unavailable")};try ordinaryOpen(fresh,freshApp.processIdentifier);_ = try currentPanel(fresh,freshApp.processIdentifier,"0.9.6","fresh");try verifyProject(fresh,freshApp.processIdentifier,"final-clean");try normalCloseRetained("fresh");try recheckFile();proof["separateFreshPersistencePassed"]=true;proof["freshRetainedExit0"]=true;proof["normalClose"]=true;proof["passed"]=true;proof["status"]="OWN_MAC_CORE90_STOCK_UPGRADE_AND_SEPARATE_NATIVE_OPEN_PASS";proof["limits"]=["New/numeric authoring/dirtyCancel/Save UX deferred final100%","No automatic project restore or cross-restart AX control rebind","No immediate parent observation inferred from NSWorkspace notification"]
}
do{try executeCore();reports=initialReports;writeProof();exit(0)}catch{proof["error"]=String(describing:error);proof["currentPhase"]=phase;proof["safeToClose"]=safeToClose;if safeToClose,child != nil,owned != nil{do{try normalCloseRetained("failure");proof["failureNormalClose"]=true}catch{proof["failureCloseError"]=String(describing:error)}}else{proof["failureCleanup"]="Unknown chooser/install/automatic state preserved; no recovery input or force"};reports=initialReports;writeProof();exit(2)}
extension ProcessInfo{var machineArchitecture:String{var system=utsname();uname(&system);return withUnsafePointer(to:&system.machine){$0.withMemoryRebound(to:CChar.self,capacity:1){String(cString:$0)}}}}
