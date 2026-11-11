function Get-OwnUiaProviders{
 $automatic=$script:providerBindingPhase -ceq 'automatic'
 if($automatic){
  if(!$job -or !$job.Assigned -or $job.ObserverError -or !$script:defaultProfileNamespace -or !$script:defaultProfileNamespace.beforeAnyApp -or !$script:defaultProfileNamespace.beforeInstall -or $expectedSha -ne $target.nativeSha256){throw 'Automatic default profile requires two absence receipts and proven target Job native'}
  $nativeMembers=@($job.Rows|Where-Object {$_.Pid -eq $native.ProcessId -and $_.Created -eq $created -and $_.MembershipVerified -and $_.Sha256 -eq $target.nativeSha256})
  if($nativeMembers.Count -ne 1 -or !$job.SameInstalledFile($native.ProcessId,$image) -or $job.HandleOf($native.ProcessId) -ne $native.Process -or [NativeOwnGui]::WaitForSingleObject($native.Process,0) -ne 258){throw 'Automatic retained Job native changed'}
 }
 $rows=@();$queue=@([uint32]$native.ProcessId);$visited=@{};$count=0
 while($queue.Count -gt 0 -and $count -lt 64){$parent=[uint32]$queue[0];$queue=@($queue|Select-Object -Skip 1);if($visited.ContainsKey([string]$parent)){continue};$visited[[string]$parent]=$true
  foreach($row in @(Get-CimInstance Win32_Process -Filter "ParentProcessId=$parent")){$count++;if($count -gt 64){break};$queue+=@([uint32]$row.ProcessId);$valid=$false;$stamp=$null;$actualImage=$null;$memberOk=$false;$memberProof=$null;$qualificationError=$null
   try{
    $child=Get-Process -Id $row.ProcessId;$stamp=$child.StartTime.ToUniversalTime().ToFileTimeUtc();$valid=($stamp -ge $created -and $row.Name -eq 'msedgewebview2.exe')
    if($automatic -and $valid){
     $actualImage=$child.MainModule.FileName;$members=@($job.Rows|Where-Object {$_.Pid -eq $row.ProcessId -and $_.Created -eq $stamp -and $_.MembershipVerified -and [string]::Equals($_.Image,$actualImage,[StringComparison]::OrdinalIgnoreCase)})
     if($members.Count -ne 1){throw 'Provider not a matching retained genuine Job member'}
     $handle=$job.HandleOf([int]$row.ProcessId);$a=[long]0;$b=[long]0;$c=[long]0;$d=[long]0
     if([NativeOwnGui]::WaitForSingleObject($handle,0) -ne 258 -or ![NativeOwnGui]::GetProcessTimes($handle,[ref]$a,[ref]$b,[ref]$c,[ref]$d) -or $a -ne $stamp -or [IO.Path]::GetFileName($actualImage) -ine 'msedgewebview2.exe'){throw 'Retained provider live kernel/image identity failed'}
     $memberOk=$true;$memberProof=[ordered]@{pid=$members[0].Pid;created=$members[0].Created;image=$members[0].Image;membershipVerified=$members[0].MembershipVerified;retainedLiveKernelRechecked=$true};$valid=$valid -and $memberOk
    }
   }catch{$valid=$false;$qualificationError=$_.Exception.Message.Substring(0,[Math]::Min(1024,$_.Exception.Message.Length))}
   $line=[string]$row.CommandLine;$profile=$false;$parsed=$null;$profileError=$null;$userDataDir=$null
   if(!$automatic){$profile=$line.IndexOf($env:WEBVIEW2_USER_DATA_FOLDER,[StringComparison]::OrdinalIgnoreCase) -ge 0}
   elseif($valid -and $parent -eq $native.ProcessId){
    try{
     if($line.Length -eq 0 -or $line.Length -gt 4096){throw 'Direct browser command line unavailable/bounded'}
     $parsed=@([OwnCoreFileControls]::Argv($line));$values=@()
     for($i=0;$i -lt $parsed.Count;$i++){
      if($parsed[$i] -ceq '--user-data-dir'){if($i+1 -ge $parsed.Count){throw 'Missing profile argument'};$i++;$values+=@($parsed[$i])}
      elseif($parsed[$i].StartsWith('--user-data-dir=',[StringComparison]::Ordinal)){$values+=@($parsed[$i].Substring(16))}
     }
     if($values.Count -ne 1 -or [string]::IsNullOrWhiteSpace($values[0]) -or ![IO.Path]::IsPathRooted($values[0])){throw 'Exactly one absolute user-data-dir required'}
     $userDataDir=[IO.Path]::GetFullPath($values[0]);$profile=[string]::Equals($userDataDir,$script:defaultProfileNamespace.path,[StringComparison]::OrdinalIgnoreCase)
     if(!$profile){throw 'Automatic profile is not the exact absent-before-run SDK EBWebView child'}
    }catch{$profile=$false;$profileError=$_.Exception.Message.Substring(0,[Math]::Min(1024,$_.Exception.Message.Length))}
   }
   $rows+=@([ordered]@{pid=$row.ProcessId;parent=$row.ParentProcessId;name=$row.Name;start=$stamp;actualImage=$actualImage;validCreatedWebview=$valid;profileMentioned=$profile;commandLine=$line.Substring(0,[Math]::Min(4096,$line.Length));commandLineTruncated=$line.Length -gt 4096;parsedDirectBrowserArgs=$parsed;exactUserDataDir=$userDataDir;profileError=$profileError;jobMember=$memberProof;qualificationError=$qualificationError})
  }
 }
 $allowed=@([int]$native.ProcessId)
 foreach($row in $rows){if(!$row.validCreatedWebview){continue};$cursor=[uint32]$row.pid;$profile=$false;$seen=@{}
  while($cursor -ne $native.ProcessId -and !$seen.ContainsKey([string]$cursor)){$seen[[string]$cursor]=$true;$matches=@($rows|Where-Object {$_.pid -eq $cursor});if($matches.Count -ne 1 -or !$matches[0].validCreatedWebview){break};if($matches[0].profileMentioned){$profile=$true};$cursor=[uint32]$matches[0].parent}
  if($profile -and $cursor -eq $native.ProcessId){$allowed+=@([int]$row.pid)}
 }
 return [ordered]@{allowedPids=[int[]]$allowed;createdDescendants=$rows;cap=64;bindingPhase=$script:providerBindingPhase;automaticDefaultException=$automatic;defaultNamespace=if($automatic){$script:defaultProfileNamespace}else{$null};descendantsInheritOnlyQualifiedBrowserProfile=$automatic}
}
