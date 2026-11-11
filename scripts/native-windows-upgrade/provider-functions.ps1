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
