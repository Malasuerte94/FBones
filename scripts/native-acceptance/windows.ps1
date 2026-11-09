param([Parameter(Mandatory=$true)][string]$Root)
$ErrorActionPreference='Stop'
if($env:GITHUB_ACTIONS -ne 'true' -or $env:RUNNER_ENVIRONMENT -ne 'github-hosted' -or $env:RUNNER_OS -ne 'Windows'){throw 'Ephemeral hosted Windows job only'}
$rootPath=[IO.Path]::GetFullPath($Root);$tempPath=[IO.Path]::GetFullPath($env:RUNNER_TEMP).TrimEnd('\')+'\'
if(!$rootPath.StartsWith($tempPath,[StringComparison]::OrdinalIgnoreCase) -or !(Test-Path -LiteralPath (Join-Path $rootPath 'reports\stock-package.json'))){throw 'Verified private runner root required'}
$receipt=Get-Content -Raw -LiteralPath (Join-Path $rootPath 'reports\stock-package.json')|ConvertFrom-Json
if($receipt.route -ne 'windows-nsis' -or $receipt.tag -ne 'v0.9.5-beta.2'){throw 'Wrong initial stock package'}
if(Get-Process -Name FBones -ErrorAction SilentlyContinue){throw 'Fresh runner unexpectedly has FBones process'}
$key='HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\FBones'
if(Test-Path -LiteralPath $key){throw 'Fresh runner unexpectedly has existing FBones installation'}
Add-Type -Path (Join-Path $PSScriptRoot 'nul-gui-launch.cs')
Add-Type @'
using System;using System.Runtime.InteropServices;public static class OwnNativeWindow{
 [DllImport("user32.dll")]public static extern bool IsWindowVisible(IntPtr h);
 [DllImport("user32.dll",SetLastError=true)]public static extern uint GetWindowThreadProcessId(IntPtr h,out uint pid);
 [DllImport("user32.dll",SetLastError=true)]public static extern bool PostMessage(IntPtr h,uint msg,IntPtr w,IntPtr l);
}
'@
$proof=[ordered]@{passed=$false;route='windows-nsis';stage='capability-only';upgradeAttempted=$false;normalClose=$false;currentStage='stock-nsis-install'};$app=$null;$native=$null;$created=[long]0;$closeRequested=$false
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
 $port=9331;if(Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue){throw 'Dedicated CDP port occupied before launch'}
 $env:WEBVIEW2_USER_DATA_FOLDER=Join-Path $rootPath 'webview-profile';$env:WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS="--remote-debugging-port=$port"
 $native=[NativeOwnGui]::Start($image,$installDir);$app=Get-Process -Id $native.ProcessId
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
 $proof.native=[ordered]@{processId=$native.ProcessId;creationFileTime=$created;window=$window.ToInt64();visible=$true;sha256=$receipt.executableSha256;stdio='NUL-handle-allowlist'}
 $proof.currentStage='bind-native-cdp-listener'
 $connection=$null;for($i=0;$i -lt 100;$i++){$connection=Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue;if($connection){break};Start-Sleep -Milliseconds 200}
 if(!$connection -or @($connection).Count -ne 1){throw 'Missing/ambiguous native CDP listener'}
 $listener=Get-CimInstance Win32_Process -Filter "ProcessId=$($connection.OwningProcess)";$cursor=$listener;$seen=@{}
 while($cursor -and $cursor.ProcessId -ne $native.ProcessId){if($seen.ContainsKey([string]$cursor.ProcessId)){throw 'CDP ancestry cycle'};$seen[[string]$cursor.ProcessId]=$true;$cursor=Get-CimInstance Win32_Process -Filter "ProcessId=$($cursor.ParentProcessId)"}
 if(!$listener -or $listener.Name -ne 'msedgewebview2.exe' -or !$cursor){throw 'CDP listener is not a descendant of our created native app'}
 $proof.currentStage='native-frontend-one-toggle'
 & node (Join-Path $PSScriptRoot 'windows-cdp.mjs') $rootPath $port
 if($LASTEXITCODE -ne 0){throw 'Native WebView2 frontend/control probe failed'}
 $frontend=Get-Content -Raw -LiteralPath (Join-Path $rootPath 'reports\frontend.json')|ConvertFrom-Json
 if($frontend.passed -ne $true){throw 'Native frontend probe did not pass'}
 $proof.currentStage='normal-owned-close'
 $app.Refresh();$nowCreated=[long]0
 if($app.HasExited -or ![NativeOwnGui]::GetProcessTimes($native.Process,[ref]$nowCreated,[ref]$exited,[ref]$kernel,[ref]$user) -or $nowCreated -ne $created -or (Get-FileHash -LiteralPath $image -Algorithm SHA256).Hash.ToLowerInvariant() -ne $receipt.executableSha256){throw 'Own window changed before normal close'}
 $windowPid=[uint32]0
 if(![OwnNativeWindow]::GetWindowThreadProcessId($window,[ref]$windowPid) -or $windowPid -ne $native.ProcessId){throw 'Owned window identity changed before WM_CLOSE'}
 $closeRequested=$true
 if(![OwnNativeWindow]::PostMessage($window,0x10,[IntPtr]::Zero,[IntPtr]::Zero)){throw 'Owned WM_CLOSE failed'}
 if([NativeOwnGui]::WaitForSingleObject($native.Process,20000) -ne 0){throw 'Owned native app did not close normally; no force'}
 $exit=[uint32]0;if(![NativeOwnGui]::GetExitCodeProcess($native.Process,[ref]$exit) -or $exit -ne 0){throw 'Owned app terminal exit unavailable/nonzero'}
 $proof.normalClose=$true;$proof.exitCode=$exit;$proof.passed=$true;$proof.currentStage='passed'
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
 $proof|ConvertTo-Json -Depth 8|Set-Content -LiteralPath (Join-Path $rootPath 'reports\capability.json') -Encoding UTF8
}
