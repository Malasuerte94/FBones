import Foundation
import AppKit
import ApplicationServices
import CryptoKit
import Darwin
let arguments=CommandLine.arguments
if arguments.count != 5 { fatalError("Expected own installed bundle, reports directory and executable SHA256") }
let bundleURL=URL(fileURLWithPath:arguments[1]), reports=URL(fileURLWithPath:arguments[2]), expected=arguments[3], helperDir=URL(fileURLWithPath:arguments[4])
let projectName="Own macOS native save", defaultName="Own macOS native save.fbones"
let destination=reports.deletingLastPathComponent().appendingPathComponent("projects/own-save.fbones")
var scopedAXWindow:AXUIElement?;var chooserScope=false;var safeToClose=true;var saveDispatchSeconds:UInt64=0;var saveDispatchMicros:UInt64=0
var proof:[String:Any] = ["passed":false,"route":"mac-dmg","stage":"ordinary-new-native-save-v1","updaterControlCapabilityPassed":false,"previousCombinedViewportGatePassed":false,"viewportAccessibilityShapeVerified":"unknown","upgradeAttempted":false,"normalClose":false]
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
 let current=try readKernel(process,exe);guard OwnMainUser(current.pid,current.startSeconds,current.startMicroseconds)==1 else{throw NSError(domain:"Current native kernel UID/start mismatch",code:27)};guard sameKernel(baseline,current)else{throw NSError(domain:"Stock child's actual kernel start/file identity changed",code:23)}
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

func closeOwn()->Bool{guard (try? verifyNativeKernel()) != nil,let app=owned else{return false};guard app.bundleURL?.standardizedFileURL==bundleURL.standardizedFileURL && !app.isTerminated else{return false};guard app.terminate()else{return false};let end=Date(timeIntervalSinceNow:20);while (!app.isTerminated || child?.isRunning == true) && Date()<end{pump(0.2)};return app.isTerminated && child?.isRunning == false}

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
func mainFill(_ root:AXUIElement,_ pid:pid_t,_ names:Set<String>,_ value:String,_ label:String)throws{
 let s=try snapshot(label+"-before",root,pid),i=try unique(s,"AXTextField",names,settable:true);guard let window=s.window else{throw error("Field window absent")};try requireRoot(s.nodes[i],window,pid);_ = try verifyNativeKernel();try canSetNow(s.nodes[i],pid);try receipt(label+"-intent.json",["maximumSets":1,"selected":s.rows[i],"value":value]);let status=AXUIElementSetAttributeValue(s.nodes[i],kAXValueAttribute as CFString,value as CFString);let back=readAX(s.nodes[i],kAXValueAttribute);try receipt(label+"-result.json",["attempted":true,"returned":status == .success,"apiError":status.rawValue,"readback":(back.0 as?String) ?? "missing","readbackError":back.1.rawValue]);guard status == .success,back.1 == .success,back.0 as?String==value else{throw error("AX value setter/readback failed")}
}
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
 let script="on run argv\nreturn POSIX path of (choose file name with prompt \"Save a project\" default name (item 1 of argv))\nend run"
 guard argv==["osascript","-e",script,"--",defaultName]else{try receipt("picker-child-argv-negative.json",["argv":argv,"argc":c.argc]);throw error("Child argv not exact shipped Save operation")}
 _ = try verifyNativeKernel();return c
}
func childTuple(_ c:OwnPickerChild)throws->[String:Any]{let argv:[String]=try copiedArgs(c);return ["argv":argv,"pid":c.childPid,"ppid":c.childParent,"uid":c.childUid,"startSeconds":c.startSeconds,"startMicroseconds":c.startMicroseconds,"device":c.device,"inode":c.inode,"argc":c.argc,"argvBytes":c.argBytes,"complete":c.complete==1]}
func sameChild(_ first:OwnPickerChild)throws{let now=try findChild();guard now.childPid==first.childPid,now.childParent==first.childParent,now.childUid==first.childUid,now.startSeconds==first.startSeconds,now.startMicroseconds==first.startMicroseconds,now.device==first.device,now.inode==first.inode else{throw error("Picker child identity changed")}}
func savePicker(_ c:OwnPickerChild)throws{
 chooserScope=true;defer{chooserScope=false};let app=AXUIElementCreateApplication(c.childPid);let initial=try snapshot("picker-inventory",app,c.childPid);guard let window=initial.window,initial.texts.contains("Save a project"),readAX(window,kAXModalAttribute).0 as?Bool==true else{throw error("Chooser exact host/window/modal/prompt association unknown")};try sameChild(c)
 let filename=try unique(initial,"AXTextField",["Save As:","Save As"],settable:true),directory=try unique(initial,"AXTextField",["Where:","Where"],settable:true),save=try unique(initial,"AXButton",["Save"]);guard filename != directory,initial.rows[filename]["value"]as?String==defaultName,let oldDir=initial.rows[directory]["value"]as?String,oldDir.hasPrefix("/"),(initial.rows[save]["actions"]as?[String] ?? []).contains("AXPress")else{throw error("Native filename/directory contract unknown; no picker input")};var isDirectory=ObjCBool(false);guard FileManager.default.fileExists(atPath:oldDir,isDirectory:&isDirectory),isDirectory.boolValue else{throw error("Current native directory value is not an actual directory")}
 for(i,value,label)in[(directory,destination.deletingLastPathComponent().path,"directory"),(filename,destination.lastPathComponent,"filename")]{try sameChild(c);try requireRoot(initial.nodes[i],window,c.childPid);try canSetNow(initial.nodes[i],c.childPid);try receipt("picker-"+label+"-intent.json",["selected":initial.rows[i],"value":value,"maximumSets":1]);let status=AXUIElementSetAttributeValue(initial.nodes[i],kAXValueAttribute as CFString,value as CFString);let back=readAX(initial.nodes[i],kAXValueAttribute);try receipt("picker-"+label+"-result.json",["apiError":status.rawValue,"readbackError":back.1.rawValue,"readback":(back.0 as?String) ?? "missing"]);guard status == .success,back.1 == .success,back.0 as?String==value else{throw error("Native picker exact readback failed")}}
 let current=try snapshot("picker-before-accept",app,c.childPid);let fi=try unique(current,"AXTextField",["Save As:","Save As"],settable:true),di=try unique(current,"AXTextField",["Where:","Where"],settable:true),si=try unique(current,"AXButton",["Save"]);guard let currentWindow=current.window,CFEqual(currentWindow,window),current.texts.contains("Save a project"),readAX(currentWindow,kAXModalAttribute).0 as?Bool==true,CFEqual(initial.nodes[filename],current.nodes[fi]),CFEqual(initial.nodes[directory],current.nodes[di]),CFEqual(initial.nodes[save],current.nodes[si]),(current.rows[si]["actions"]as?[String] ?? []).contains("AXPress"),current.rows[fi]["value"]as?String==destination.lastPathComponent,current.rows[di]["value"]as?String==destination.deletingLastPathComponent().path,!FileManager.default.fileExists(atPath:destination.path)else{throw error("Picker destination/current controls changed")};try sameChild(c);try requireRoot(current.nodes[si],window,c.childPid);try receipt("picker-accept-intent.json",["maximumActions":1,"child":childTuple(c),"destination":destination.path,"filename":current.rows[fi],"directory":current.rows[di],"save":current.rows[si],"noFallback":true]);let result=AXUIElementPerformAction(current.nodes[si],kAXPressAction as CFString);try receipt("picker-accept-result.json",["attempted":true,"returned":result == .success,"apiError":result.rawValue]);guard result == .success else{throw error("One native Save acceptance failed")}
}
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
 scopedAXWindow=ownWindow
 proof["currentStage"]="ordinary-new-project";safeToClose=false;try mainPress(root,app.processIdentifier,["New project"],"new",description:"New project");safeToClose=false
 _ = try pollApp(root,app.processIdentifier,"new-dialog"){$0.texts.contains("Start a new project")};try mainFill(root,app.processIdentifier,["Project name"],projectName,"project-name");try mainPress(root,app.processIdentifier,["Create project"],"create")
 _ = try pollApp(root,app.processIdentifier,"created"){$0.visibleText.contains(projectName) && !$0.texts.contains("Start a new project")};try mainFill(root,app.processIdentifier,["x"],"37.5","root-x")
 try FileManager.default.createDirectory(at:destination.deletingLastPathComponent(),withIntermediateDirectories:false);guard !FileManager.default.fileExists(atPath:destination.path)else{throw error("Fresh own destination required")}
 proof["currentStage"]="ordinary-save-and-new-child";let moment=Date().timeIntervalSince1970;saveDispatchSeconds=UInt64(moment);saveDispatchMicros=UInt64((moment-floor(moment))*1_000_000);try mainPress(root,app.processIdentifier,["Save"],"save",description:"Save")
 var chooser:OwnPickerChild?;let childEnd=Date(timeIntervalSinceNow:15);repeat{do{chooser=try findChild()}catch{if ((proof["pickerChildLastQuery"]as?[String:Any])?["error"]as?Int32) != 10{throw error}};if chooser==nil{pump(0.1)}}while chooser==nil && Date()<childEnd
 guard let picker=chooser else{throw error("New osascript Save child not observed")};try receipt("picker-child.json",childTuple(picker));proof["currentStage"]="native-picker-metadata-and-one-save";try savePicker(picker)
 let fileEnd=Date(timeIntervalSinceNow:15);while !FileManager.default.fileExists(atPath:destination.path) && Date()<fileEnd{_ = try verifyNativeKernel();pump(0.1)}
 let data=try Data(contentsOf:destination);guard data.count>0,data.count<=1024*1024 else{throw error("Own saved file absent or oversized")};for _ in 0..<3{pump(0.15);guard try Data(contentsOf:destination)==data else{throw error("Own saved file unstable")}}
 let after=try pollApp(root,app.processIdentifier,"saved-clean"){exactCleanTitle($0) && $0.visibleText.contains(projectName) && !$0.texts.contains("*") && $0.visibleText.contains("Project saved")};let xi=try unique(after,"AXTextField",["x"],settable:true);guard after.rows[xi]["value"]as?String=="37.5"else{throw error("Saved authored X readback absent")}
 let checker=Process();checker.executableURL=URL(fileURLWithPath:"/usr/bin/env");checker.arguments=["python3",helperDir.appendingPathComponent("own-minimal-checkpoint.py").path,destination.path,"--project-name",projectName,"--bone-name","root","--root-x","37.5","--out",reports.appendingPathComponent("checkpoint.json").path];checker.standardInput=FileHandle.nullDevice;checker.standardOutput=FileHandle.nullDevice;checker.standardError=FileHandle.nullDevice;try checker.run();let checkerEnd=Date(timeIntervalSinceNow:15);while checker.isRunning && Date()<checkerEnd{pump(0.1)};guard !checker.isRunning,checker.terminationReason == .exit,checker.terminationStatus==0 else{throw error("Independent saved checkpoint failed/pending; no force")}
 var helperAfter=OwnPickerChild();let helperQuery=OwnFindSaveChild(app.processIdentifier,nativeKernelBaseline!.startSeconds,nativeKernelBaseline!.startMicroseconds,saveDispatchSeconds,saveDispatchMicros,&helperAfter);proof["helperOutcomeAfterSave"]=["queryReturned":helperQuery,"queryError":helperAfter.error,"candidateCount":helperAfter.candidates,"exitStatus":"unobserved here; application parent owns reap; no disappearance-to-exit0 claim"]
 proof["savedCleanNativeWindowTitle"]=(readAX(after.window!,kAXTitleAttribute).0 as?String) ?? "missing"
 proof["savedOwnFile"]=["path":destination.path,"bytes":data.count,"sha256":SHA256.hash(data:data).map{String(format:"%02x",$0)}.joined(),"stableReads":4,"independentCheckpointPassed":true];safeToClose=true
 proof["normalClose"]=closeOwn();proof["exitCode"]=child?.isRunning == false ? child?.terminationStatus : nil;guard proof["normalClose"]as?Bool==true,child?.terminationReason == .exit,child?.terminationStatus==0 else{throw error("Own native normal exit0 unproved")};proof["passed"]=true;proof["status"]="OWN_NEW_NATIVE_SAVE_CHECKPOINT_PASS";writeProof();exit(0)
}catch{proof["error"]=String(describing:error);proof["safeToClose"]=safeToClose;if safeToClose && owned != nil{proof["normalClose"]=closeOwn()}else{proof["failureCleanup"]="Dirty/unknown/native-dialog state retained without force or recovery input"};writeProof();exit(2)}
extension ProcessInfo{var machineArchitecture:String{var system=utsname();uname(&system);return withUnsafePointer(to:&system.machine){$0.withMemoryRebound(to:CChar.self,capacity:1){String(cString:$0)}}}}
