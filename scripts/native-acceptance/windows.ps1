param([Parameter(Mandatory=$true)][string]$Root)
$ErrorActionPreference='Stop'
if($env:GITHUB_ACTIONS -ne 'true' -or $env:RUNNER_ENVIRONMENT -ne 'github-hosted' -or $env:RUNNER_OS -ne 'Windows'){throw 'Ephemeral hosted Windows job only'}
$rootPath=[IO.Path]::GetFullPath($Root);$tempPath=[IO.Path]::GetFullPath($env:RUNNER_TEMP).TrimEnd('\')+'\'
if(!$rootPath.StartsWith($tempPath,[StringComparison]::OrdinalIgnoreCase) -or !(Test-Path -LiteralPath (Join-Path $rootPath 'reports\stock-package.json'))){throw 'Verified private runner root required'}
$receipt=Get-Content -Raw -Encoding UTF8 -LiteralPath (Join-Path $rootPath 'reports\stock-package.json')|ConvertFrom-Json
if($receipt.route -ne 'windows-nsis' -or $receipt.tag -ne 'v0.9.5-beta.2'){throw 'Wrong initial stock package'}
if(Get-Process -Name FBones -ErrorAction SilentlyContinue){throw 'Fresh runner unexpectedly has FBones process'}
$key='HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\FBones'
if(Test-Path -LiteralPath $key){throw 'Fresh runner unexpectedly has existing FBones installation'}
Add-Type -Path (Join-Path $PSScriptRoot 'nul-gui-launch.cs')
Add-Type -AssemblyName UIAutomationClient,UIAutomationTypes,WindowsBase
$uiaReferences=@([System.Diagnostics.Stopwatch].Assembly.Location,[System.Linq.Enumerable].Assembly.Location,[System.Windows.Automation.AutomationElement].Assembly.Location,[System.Windows.Automation.AutomationElementIdentifiers].Assembly.Location,[System.Windows.DependencyObject].Assembly.Location)|Sort-Object -Unique
Add-Type -Path (Join-Path $PSScriptRoot 'native-updater-uia.cs') -ReferencedAssemblies $uiaReferences
function Write-OwnUiaJson([string]$Name,$Value){
 $path=Join-Path $rootPath ('reports\'+$Name);$json=$Value|ConvertTo-Json -Depth 20;$bytes=[Text.Encoding]::UTF8.GetBytes($json)
 if($bytes.Length -gt 524288){throw 'Own diagnostic JSON exceeds512KiB'}
 $file=[IO.File]::Open($path,[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::Read);try{$file.Write($bytes,0,$bytes.Length)}finally{$file.Dispose()}
}
function Write-OwnUiaInventory([string]$Name,$Value){
 $Value.OriginalRowCount=$Value.Rows.Count
 while([Text.Encoding]::UTF8.GetByteCount(($Value|ConvertTo-Json -Depth 20)) -gt 524288){$Value.ByteCapHit=$true;$Value.Complete=$false;if($Value.Rows.Count -lt 2){throw 'Bounded UIA inventory cannot be serialized'};$keep=[int][Math]::Floor($Value.Rows.Count/2);$Value.Rows.RemoveRange($keep,$Value.Rows.Count-$keep)}
 Write-OwnUiaJson $Name $Value
}
function Own-VisibleText($Snapshot){return [OwnUpdaterUia]::VisibleText($Snapshot)}
function Own-PanelPresent($Snapshot){return (Own-VisibleText $Snapshot) -match 'Current\s+version:\s*0\.9\.5\b'}
function Assert-OwnNativeIdentity{
 $app.Refresh();$a=[long]0;$b=[long]0;$c=[long]0;$d=[long]0;$pidOwner=[uint32]0
 if($app.HasExited -or [NativeOwnGui]::WaitForSingleObject($native.Process,0) -ne 258 -or ![NativeOwnGui]::GetProcessTimes($native.Process,[ref]$a,[ref]$b,[ref]$c,[ref]$d) -or $a -ne $created -or $app.StartTime.ToUniversalTime().ToFileTimeUtc() -ne $created -or $app.MainModule.FileName -ne $image -or $app.MainWindowHandle -ne $window -or ![OwnNativeWindow]::IsWindowVisible($window) -or ![OwnNativeWindow]::GetWindowThreadProcessId($window,[ref]$pidOwner) -or $pidOwner -ne $native.ProcessId -or (Get-FileHash -LiteralPath $image -Algorithm SHA256).Hash.ToLowerInvariant() -ne $receipt.executableSha256){throw 'Retained own native process/start/image/window changed'}
}
function Get-OwnUiaProviders{
 $rows=@();$queue=@([uint32]$native.ProcessId);$visited=@{};$count=0
 while($queue.Count -gt 0 -and $count -lt 64){$parent=[uint32]$queue[0];$queue=@($queue|Select-Object -Skip 1);if($visited.ContainsKey([string]$parent)){continue};$visited[[string]$parent]=$true
  foreach($row in @(Get-CimInstance Win32_Process -Filter "ParentProcessId=$parent")){$count++;if($count -gt 64){break};$queue+=@([uint32]$row.ProcessId);$valid=$false;$stamp=$null
   try{$child=Get-Process -Id $row.ProcessId;$stamp=$child.StartTime.ToUniversalTime().ToFileTimeUtc();$valid=($stamp -ge $created -and $row.Name -eq 'msedgewebview2.exe')}catch{}
   $line=[string]$row.CommandLine;$rows+=@([ordered]@{pid=$row.ProcessId;parent=$row.ParentProcessId;name=$row.Name;start=$stamp;validCreatedWebview=$valid;profileMentioned=($line.IndexOf($env:WEBVIEW2_USER_DATA_FOLDER,[StringComparison]::OrdinalIgnoreCase) -ge 0);commandLine=$line.Substring(0,[Math]::Min(4096,$line.Length))})
  }
 }
 $allowed=@([int]$native.ProcessId)
 foreach($row in $rows){if(!$row.validCreatedWebview){continue};$cursor=[uint32]$row.pid;$profile=$false;$seen=@{}
  while($cursor -ne $native.ProcessId -and !$seen.ContainsKey([string]$cursor)){$seen[[string]$cursor]=$true;$matches=@($rows|Where-Object {$_.pid -eq $cursor});if($matches.Count -ne 1 -or !$matches[0].validCreatedWebview){break};if($matches[0].profileMentioned){$profile=$true};$cursor=[uint32]$matches[0].parent}
  if($profile -and $cursor -eq $native.ProcessId){$allowed+=@([int]$row.pid)}
 }
 return [ordered]@{allowedPids=[int[]]$allowed;createdDescendants=$rows;cap=64}
}
function Read-OwnNativeBytes{
 if(!(Test-Path -LiteralPath $nativeLogPath)){return ,([byte[]]@())};$file=[IO.File]::Open($nativeLogPath,[IO.FileMode]::Open,[IO.FileAccess]::Read,[IO.FileShare]::ReadWrite);try{$buffer=New-Object byte[] 65536;$n=$file.Read($buffer,0,$buffer.Length);$slice=New-Object byte[] $n;[Array]::Copy($buffer,$slice,$n);return ,$slice}finally{$file.Dispose()}
}
function Read-OwnNativePrefix{return [Text.Encoding]::UTF8.GetString([byte[]](Read-OwnNativeBytes))}
Add-Type @'
using System;using System.Runtime.InteropServices;public static class OwnNativeWindow{
 [DllImport("user32.dll")]public static extern bool IsWindowVisible(IntPtr h);
 [DllImport("user32.dll",SetLastError=true)]public static extern uint GetWindowThreadProcessId(IntPtr h,out uint pid);
 [DllImport("user32.dll",SetLastError=true)]public static extern bool PostMessage(IntPtr h,uint msg,IntPtr w,IntPtr l);
}
'@
$proof=[ordered]@{passed=$false;route='windows-nsis';stage='updater-control-capability-v5';updaterControlCapabilityPassed=$false;viewportAccessibilityShapeVerified='unknown';previousCombinedViewportGatePassed=$false;upgradeAttempted=$false;normalClose=$false;currentStage='stock-nsis-install'};$app=$null;$native=$null;$created=[long]0;$closeRequested=$false
try{
 $installer=Join-Path $rootPath $receipt.asset.name
 if((Get-FileHash -LiteralPath $installer -Algorithm SHA256).Hash.ToLowerInvariant() -ne $receipt.asset.sha256){throw 'Installer hash changed'}
 $installDir=Join-Path $rootPath 'installed';if(Test-Path -LiteralPath $installDir){throw 'Install path must be new'}
 $ownedInstaller=[NativeOwnGui]::StartNsis($installer,$env:SystemRoot,$installDir)
 try{
  if([NativeOwnGui]::WaitForSingleObject($ownedInstaller.Process,120000) -ne 0){throw 'Installer did not finish normally before deadline; no force'}
  $exit=[uint32]0;if(![NativeOwnGui]::GetExitCodeProcess($ownedInstaller.Process,[ref]$exit) -or $exit -ne 0){throw 'Stock NSIS installer failed'}
  $proof.installerExitCode=$exit
 }finally{[NativeOwnGui]::CloseHandle($ownedInstaller.Process)|Out-Null}
 $proof.currentStage='verify-installed-native-identity'
 $registry=Get-ItemProperty -LiteralPath $key;$image=Join-Path $installDir 'FBones.exe'
 $installedExists=Test-Path -LiteralPath $image -PathType Leaf;$installedSha=if($installedExists){(Get-FileHash -LiteralPath $image -Algorithm SHA256).Hash.ToLowerInvariant()}else{$null}
 $proof.observedInstallation=[ordered]@{registryVersion=$registry.DisplayVersion;registryInstallLocation=$registry.InstallLocation;nativeExecutableExists=$installedExists;actualNativeSha256=$installedSha;expectedBundledNativeSha256=$receipt.executableSha256;rawCiExecutableSha256=$receipt.ciReportExecutableSha256;bundleMemberIdentity=$receipt.bundleMemberIdentity}
 if($registry.DisplayVersion -ne '0.9.5' -or $installedSha -ne $receipt.executableSha256){throw 'Installed version/executable identity differs'}
 $proof.installation=[ordered]@{stockNsisExecuted=$true;registryVersion=$registry.DisplayVersion;executableSha256=$receipt.executableSha256}
 $proof.currentStage='launch-owned-native-gui'
 $env:WEBVIEW2_USER_DATA_FOLDER=Join-Path $rootPath 'webview-profile'
 $nativeLogPath=Join-Path $rootPath 'native-spool.log'
 $native=[NativeOwnGui]::StartWithOwnedLog($image,$installDir,$nativeLogPath);$app=Get-Process -Id $native.ProcessId
 $created=[long]0;$exited=[long]0;$kernel=[long]0;$user=[long]0
 if(![NativeOwnGui]::GetProcessTimes($native.Process,[ref]$created,[ref]$exited,[ref]$kernel,[ref]$user) -or $created -le 0){throw 'New retained child creation identity unavailable'}
 $deadline=[DateTime]::UtcNow.AddSeconds(30);$ready=$false;$samples=@();$observed=$null
 do{
  $observed=[ordered]@{checkedUtc=[DateTime]::UtcNow.ToString('o');processId=$native.ProcessId;expectedCreationFileTime=$created;expectedImage=$image;ready=$false}
  try{
   $app.Refresh();$observed.hasExited=$app.HasExited;$observed.retainedWait=[NativeOwnGui]::WaitForSingleObject($native.Process,0)
   if($app.HasExited){$terminalCode=[uint32]0;$observed.exitCodeAvailable=[NativeOwnGui]::GetExitCodeProcess($native.Process,[ref]$terminalCode);$observed.exitCode=$terminalCode;$proof.windowObservation=$observed;throw 'Installed native app exited before readiness'}
   $pollCreated=[long]0;$pollExited=[long]0;$pollKernel=[long]0;$pollUser=[long]0
   $observed.processTimesAvailable=[NativeOwnGui]::GetProcessTimes($native.Process,[ref]$pollCreated,[ref]$pollExited,[ref]$pollKernel,[ref]$pollUser)
   $observed.processTimesWin32Error=[Runtime.InteropServices.Marshal]::GetLastWin32Error();$observed.observedCreationFileTime=$pollCreated;$observed.createdMatches=($observed.processTimesAvailable -and $pollCreated -eq $created)
   $observed.dotNetStartFileTime=$app.StartTime.ToUniversalTime().ToFileTimeUtc();$observed.dotNetStartMatches=($observed.dotNetStartFileTime -eq $created)
   $observed.actualImage=$app.MainModule.FileName;$observed.imagePathMatches=($observed.actualImage -eq $image)
   $window=$app.MainWindowHandle;$observed.window=$window.ToInt64();$windowPid=[uint32]0
   $observed.windowVisible=($window -ne [IntPtr]::Zero -and [OwnNativeWindow]::IsWindowVisible($window))
   $observed.windowThread=if($window -ne [IntPtr]::Zero){[OwnNativeWindow]::GetWindowThreadProcessId($window,[ref]$windowPid)}else{0};$observed.windowOwnerPid=$windowPid;if($observed.windowThread -eq 0 -and $window -ne [IntPtr]::Zero){$observed.windowThreadWin32Error=[Runtime.InteropServices.Marshal]::GetLastWin32Error()};$observed.windowPidMatches=($observed.windowThread -ne 0 -and $windowPid -eq $native.ProcessId)
   $ready=($observed.retainedWait -eq 258 -and $observed.createdMatches -and $observed.dotNetStartMatches -and $observed.imagePathMatches -and $observed.window -ne 0 -and $observed.windowVisible -and $observed.windowPidMatches)
   $observed.ready=$ready
  }catch{$observed.observationError=$_.Exception.Message;$observed.win32Error=[Runtime.InteropServices.Marshal]::GetLastWin32Error()}
  $samples+=@($observed);if($samples.Count -gt 32){$samples=@($samples[0..15]) + @($samples[($samples.Count-16)..($samples.Count-1)])}
  $proof.windowObservation=$observed;$proof.windowPollSamples=$samples
  if($ready){break};if($app.HasExited){break};Start-Sleep -Milliseconds 200
 }while([DateTime]::UtcNow -lt $deadline)
 if(!$ready){throw 'Native full window identity/visibility readiness did not pass before deadline; see observed tuple'}
 $proof.native=[ordered]@{processId=$native.ProcessId;creationFileTime=$created;window=$window.ToInt64();visible=$true;sha256=$receipt.executableSha256;stdio='NULstdin-direct-owned-file-output-handle-allowlist'}
 $proof.currentStage='actual-native-renderer-ready';$readyDeadline=[DateTime]::UtcNow.AddSeconds(20);$rendererReady=$false
 do{Assert-OwnNativeIdentity;$nativeText=Read-OwnNativePrefix;$rendererReady=$nativeText.Contains('FBones UI ready; renderer=webgl');if($rendererReady){break};Start-Sleep -Milliseconds 200}while([DateTime]::UtcNow -lt $readyDeadline)
 $proof.rendererReady=[ordered]@{observed=$rendererReady;source='stock native frontend_ready stdout from this created process';pixelParityClaimed=$false}
 if(!$rendererReady){throw 'Actual stock native renderer-ready signal unavailable'}
 $proof.currentStage='owned-uia-inventory';$provider=Get-OwnUiaProviders;Write-OwnUiaJson 'uia-providers.json' $provider
 $before=[OwnUpdaterUia]::Capture($window.ToInt64(),[int]$native.ProcessId,[int[]]$provider.allowedPids);Write-OwnUiaInventory 'uia-before.json' $before
 if(!$before.Complete){throw 'UIA inventory incomplete/foreign/errored; no action'}
 $beforeText=Own-VisibleText $before
 if($beforeText -notmatch '0\.9\.5\b' -or $beforeText.Contains('The viewport could not start.') -or $beforeText.Contains('Opening workspace') -or $beforeText.Contains('Automatic updates are unavailable for this copy.')){throw 'Native version/startup/updater-support evidence unqualified'}
 $selected=[OwnUpdaterUia]::UniqueUpdates($before);$beforePanel=Own-PanelPresent $before
 Assert-OwnNativeIdentity;$currentProvider=Get-OwnUiaProviders;$proof.currentStage='one-native-updates-invoke';$proof.invokeAttempted=$true
 try{[OwnUpdaterUia]::InvokeOnce($before,$selected,[int]$native.ProcessId,[int[]]$currentProvider.allowedPids)}finally{$proof.selectedUpdates=[ordered]@{beforeName=$selected.Name;beforeVariant=$selected.NameVariant;actionName=$selected.ActionName;actionVariant=$selected.ActionNameVariant;runtimeId=$selected.RuntimeId}}
 $proof.invokeReturned=$true;$after=$null;$changed=$false;$transitionDeadline=[DateTime]::UtcNow.AddSeconds(15)
 do{
  Assert-OwnNativeIdentity;$after=[OwnUpdaterUia]::Capture($window.ToInt64(),[int]$native.ProcessId,[int[]]$currentProvider.allowedPids)
  if($after.Complete){$text=Own-VisibleText $after;$afterPanel=Own-PanelPresent $after;$changed=($afterPanel -ne $beforePanel -and $text -match '0\.9\.5\b' -and !$text.Contains('The viewport could not start.') -and !$text.Contains('Opening workspace') -and !$text.Contains('Automatic updates are unavailable for this copy.'))}
  if($changed){break};Start-Sleep -Milliseconds 200
 }while([DateTime]::UtcNow -lt $transitionDeadline)
 Write-OwnUiaInventory 'uia-after.json' $after
 $proof.updaterControl=[ordered]@{provider='owned native UIAutomationClient InvokePattern';beforePanel=$beforePanel;afterPanel=if($after.Complete){Own-PanelPresent $after}else{$null};actualPanelTransition=$changed;oneInvokeAttempt=$true;afterComplete=$after.Complete;version='0.9.5'}
 if(!$changed -or !$after.Complete){throw 'One scoped Updates Invoke did not prove actual supported current-version panel transition'}
 $proof.currentStage='normal-owned-close'
 $app.Refresh();$nowCreated=[long]0
 if($app.HasExited -or ![NativeOwnGui]::GetProcessTimes($native.Process,[ref]$nowCreated,[ref]$exited,[ref]$kernel,[ref]$user) -or $nowCreated -ne $created -or (Get-FileHash -LiteralPath $image -Algorithm SHA256).Hash.ToLowerInvariant() -ne $receipt.executableSha256){throw 'Own window changed before normal close'}
 $windowPid=[uint32]0
 if(![OwnNativeWindow]::GetWindowThreadProcessId($window,[ref]$windowPid) -or $windowPid -ne $native.ProcessId){throw 'Owned window identity changed before WM_CLOSE'}
 $closeRequested=$true
 if(![OwnNativeWindow]::PostMessage($window,0x10,[IntPtr]::Zero,[IntPtr]::Zero)){throw 'Owned WM_CLOSE failed'}
 if([NativeOwnGui]::WaitForSingleObject($native.Process,20000) -ne 0){throw 'Owned native app did not close normally; no force'}
 $exit=[uint32]0;if(![NativeOwnGui]::GetExitCodeProcess($native.Process,[ref]$exit) -or $exit -ne 0){throw 'Owned app terminal exit unavailable/nonzero'}
 $proof.normalClose=$true;$proof.exitCode=$exit;$proof.updaterControlCapabilityPassed=$true;$proof.status='UPDATER_CONTROL_CAPABILITY_PASS';$proof.currentStage='updater-control-passed'
}catch{
 $proof.error=$_.Exception.Message
 $cleanup=[ordered]@{attempted=$false;normalClose=$false;noForce=$true}
 try{
  if($native -and $created -gt 0 -and !$closeRequested){
   $currentCreated=[long]0;$currentExited=[long]0;$currentKernel=[long]0;$currentUser=[long]0
   if([NativeOwnGui]::WaitForSingleObject($native.Process,0) -eq 258 -and [NativeOwnGui]::GetProcessTimes($native.Process,[ref]$currentCreated,[ref]$currentExited,[ref]$currentKernel,[ref]$currentUser) -and $currentCreated -eq $created){
    $current=Get-Process -Id $native.ProcessId
    if($current.StartTime.ToUniversalTime().ToFileTimeUtc() -eq $created -and $current.MainModule.FileName -eq $image -and (Get-FileHash -LiteralPath $image -Algorithm SHA256).Hash.ToLowerInvariant() -eq $receipt.executableSha256){
     $ownedWindow=$current.MainWindowHandle;$ownedPid=[uint32]0
     if($ownedWindow -and [OwnNativeWindow]::GetWindowThreadProcessId($ownedWindow,[ref]$ownedPid) -and $ownedPid -eq $native.ProcessId){
      $cleanup.attempted=$true;$closeRequested=$true
      if([OwnNativeWindow]::PostMessage($ownedWindow,0x10,[IntPtr]::Zero,[IntPtr]::Zero) -and [NativeOwnGui]::WaitForSingleObject($native.Process,20000) -eq 0){
       $terminalCode=[uint32]0;if([NativeOwnGui]::GetExitCodeProcess($native.Process,[ref]$terminalCode)){$cleanup.exitCode=$terminalCode;$cleanup.normalClose=($terminalCode -eq 0);$proof.normalClose=$cleanup.normalClose}
      }
     }else{$cleanup.reason='No verified own native main window; retained without force'}
    }else{$cleanup.reason='Own image/start identity changed; no close'}
   }else{$cleanup.reason='Retained child identity/liveness unavailable; no close'}
  }elseif($closeRequested){$cleanup.reason='One close was already requested; no repeat or force'}else{$cleanup.reason='No bound own GUI was created'}
 }catch{$cleanup.error=$_.Exception.Message}
 $proof.failureCleanup=$cleanup
 throw
}finally{
 if($native){[NativeOwnGui]::CloseHandle($native.Process)|Out-Null}
 if($nativeLogPath -and (Test-Path -LiteralPath $nativeLogPath)){$bytes=[byte[]](Read-OwnNativeBytes);[IO.File]::WriteAllBytes((Join-Path $rootPath 'reports\native-prefix.log'),$bytes);$size=(Get-Item -LiteralPath $nativeLogPath).Length;$proof.diagnosticLog=[ordered]@{spoolBytesObserved=$size;retainedPrefixBytes=$bytes.Length;retainedPrefixCap=65536;rawSpoolHardByteCap=$false}}
 Write-OwnUiaJson 'capability.json' $proof
}
