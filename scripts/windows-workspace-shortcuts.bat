@echo off
setlocal
set "FBONES_SCRIPT_DIR=%~dp0"
powershell.exe -NoLogo -NoProfile -Command "$ErrorActionPreference='Stop'; $root=[IO.Path]::GetFullPath((Join-Path $env:FBONES_SCRIPT_DIR '..\WINDOWS_TEST')); if(!(Test-Path -LiteralPath (Join-Path $root 'FBones.exe'))){throw 'FBones.exe lipseste. Ruleaza acest script din folderul scripts al proiectului.'}; $drives=@(Get-PSDrive -PSProvider FileSystem | Sort-Object @{Expression={if($_.Name -eq 'W'){0}else{1}}},Name); foreach($drive in $drives){$share=$drive.DisplayRoot; if($share -and $root.StartsWith($share.TrimEnd('\')+'\',[StringComparison]::OrdinalIgnoreCase)){$root=$drive.Name+':\'+$root.Substring($share.TrimEnd('\').Length+1); break}}; $desktop=[Environment]::GetFolderPath('Desktop'); $shell=New-Object -ComObject WScript.Shell; $items=@(@('FBones - aplicatie',(Join-Path $root 'FBones.exe')),@('FBones - folder comun',$root)); foreach($item in $items){$path=Join-Path $desktop ($item[0]+'.lnk'); $link=$shell.CreateShortcut($path); if((Test-Path -LiteralPath $path) -and $link.TargetPath -ne $item[1] -and $link.TargetPath -notlike '*\WINDOWS_TEST*' -and $link.Arguments -notlike '*\WINDOWS_TEST\Start-FBones.ps1*'){throw ('Exista deja un shortcut cu alta destinatie: '+$item[0])}; $link.TargetPath=$item[1]; if($item[0] -eq 'FBones - aplicatie'){$link.TargetPath=(Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'); $link.Arguments='-NoLogo -NoProfile -ExecutionPolicy Bypass -File '+[char]34+(Join-Path $root 'Start-FBones.ps1')+[char]34; $link.WindowStyle=7}; $link.WorkingDirectory=$env:SystemRoot; $link.IconLocation=(Join-Path $root 'FBones.exe')+',0'; $link.Save()}; Write-Host 'Shortcut-urile FBones folosesc acum direct buildul din proiect.'"
if errorlevel 1 (
  echo Nu am putut crea shortcut-urile. Vezi mesajul de mai sus.
  pause
  exit /b 1
)
echo Nu mai trebuie copiat folderul WINDOWS_TEST la fiecare build.
pause
