param([Parameter(Mandatory=$true)][string]$Root)
$ErrorActionPreference='Stop'
if($env:GITHUB_ACTIONS -ne 'true' -or $env:RUNNER_ENVIRONMENT -ne 'github-hosted' -or $env:RUNNER_OS -ne 'Windows'){throw 'Dedicated hosted Windows compiler only'}
$run=[IO.Path]::GetFullPath($Root);$temp=[IO.Path]::GetFullPath($env:RUNNER_TEMP).TrimEnd('\')+'\'
if(!$run.StartsWith($temp,[StringComparison]::OrdinalIgnoreCase) -or !(Test-Path -LiteralPath (Join-Path $run 'reports\stock-package.json'))){throw 'Verified own runner root required'}
$out=Join-Path $run 'legacy-tooling';if(Test-Path -LiteralPath $out){throw 'Fresh own compiler directory required'};New-Item -ItemType Directory -Path $out|Out-Null
$vswhere=Join-Path ${env:ProgramFiles(x86)} 'Microsoft Visual Studio\Installer\vswhere.exe'
$install=@(& $vswhere -latest -products '*' -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath)
if($LASTEXITCODE -ne 0 -or $install.Count -ne 1 -or !(Test-Path -LiteralPath $install[0])){throw 'One actual installed MSVC toolchain required'}
$dev=Join-Path $install[0] 'Common7\Tools\VsDevCmd.bat';$source=Join-Path $PSScriptRoot 'legacy-metadata.cpp';$dll=Join-Path $out 'own-legacy-metadata.dll';$obj=Join-Path $out 'legacy.obj';$lib=Join-Path $out 'legacy.lib';$build=Join-Path $out 'build.cmd';$log=Join-Path $out 'compiler.log'
$lines=@('@echo off',('call "'+$dev+'" -no_logo -arch=x64 -host_arch=x64'),'if errorlevel 1 exit /b 1',('where cl.exe > "'+(Join-Path $out 'compiler-path.txt')+'"'),('echo %WindowsSdkDir%> "'+(Join-Path $out 'sdk-dir.txt')+'"'),('echo %WindowsSDKVersion%> "'+(Join-Path $out 'sdk-version.txt')+'"'),('cl.exe /nologo /std:c++17 /EHsc /W4 /WX /LD /O2 /MD /DUNICODE /D_UNICODE /Fo:"'+$obj+'" /Fe:"'+$dll+'" "'+$source+'" /link ole32.lib oleaut32.lib user32.lib /IMPLIB:"'+$lib+'"'),'exit /b %errorlevel%')
[IO.File]::WriteAllLines($build,$lines,[Text.Encoding]::ASCII)
& cmd.exe /d /c $build *> $log;$exitCode=$LASTEXITCODE
$compilerPaths=@(Get-Content -LiteralPath (Join-Path $out 'compiler-path.txt')|Where-Object{$_})
$sdkDir=(Get-Content -Raw -LiteralPath (Join-Path $out 'sdk-dir.txt')).Trim();$sdkVersion=(Get-Content -Raw -LiteralPath (Join-Path $out 'sdk-version.txt')).Trim().TrimEnd('\')
if($compilerPaths.Count -ne 1 -or $sdkVersion -notmatch '^10\.0\.[0-9]+\.0$'){throw 'Actual compiler/SDK identity missing or ambiguous'}
$pins=[ordered]@{};foreach($p in @($vswhere,$dev,$compilerPaths[0],$source,$build)){ $pins[$p]=[ordered]@{bytes=(Get-Item -LiteralPath $p).Length;sha256=(Get-FileHash -LiteralPath $p -Algorithm SHA256).Hash.ToLowerInvariant()} }
foreach($name in @('UIAutomation.h','UIAutomationClient.h','UIAutomationCore.h','UIAutomationCoreApi.h','oleacc.h')){$p=Join-Path $sdkDir ('Include\'+$sdkVersion+'\um\'+$name);$pins[$p]=[ordered]@{bytes=(Get-Item -LiteralPath $p).Length;sha256=(Get-FileHash -LiteralPath $p -Algorithm SHA256).Hash.ToLowerInvariant()}}
$stream=[IO.File]::OpenRead($log);try{$buffer=New-Object byte[] 65536;$count=$stream.Read($buffer,0,$buffer.Length);$logPrefix=[Text.Encoding]::UTF8.GetString($buffer,0,$count)}finally{$stream.Dispose()}
$proof=[ordered]@{exitCode=$exitCode;sdkVersion=$sdkVersion;compilerVersion=(Get-Item -LiteralPath $compilerPaths[0]).VersionInfo.FileVersion;inputPins=$pins;nativeProviderCalled=$false;dll=$dll;dllSha256=if(Test-Path -LiteralPath $dll){(Get-FileHash -LiteralPath $dll -Algorithm SHA256).Hash.ToLowerInvariant()}else{$null};logPrefix=$logPrefix;retainedLogPrefixBytes=$count;rawLogHardByteCap=$false}
$proof|ConvertTo-Json -Depth 8|Set-Content -LiteralPath (Join-Path $run 'reports\legacy-compiler.json') -Encoding UTF8
if($exitCode -ne 0 -or !(Test-Path -LiteralPath $dll)){throw 'Typed SDK bridge compilation failed; retained compiler receipt'}
foreach($p in @($obj,$lib,(Join-Path $out 'legacy.exp'),(Join-Path $out 'own-legacy-metadata.exp'))){if(Test-Path -LiteralPath $p){Remove-Item -LiteralPath $p}}
