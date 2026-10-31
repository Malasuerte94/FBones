$ErrorActionPreference = 'Stop'

# Resolve the shared folder through an existing mapped drive. Do not create a
# drive or change machine settings; W: is preferred only when it maps this share.
function Resolve-FBonesMappedPath([string] $Path) {
    if (!$Path.StartsWith('\\')) { return $Path }
    $drives = @(Get-PSDrive -PSProvider FileSystem | Sort-Object @{Expression={if ($_.Name -eq 'W') {0} else {1}}}, Name)
    foreach ($drive in $drives) {
        $share = $drive.DisplayRoot
        if (!$share) { continue }
        $share = $share.TrimEnd('\')
        if ($Path.StartsWith($share + '\', [StringComparison]::OrdinalIgnoreCase)) {
            return $drive.Name + ':\' + $Path.Substring($share.Length + 1)
        }
    }
    return $Path
}

try {
    $folder = Resolve-FBonesMappedPath $PSScriptRoot
    $application = Join-Path $folder 'FBones.exe'
    $manifestPath = Join-Path $folder 'build-info.json'
    if (Test-Path -LiteralPath $manifestPath -PathType Leaf) {
        $manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
        if ($manifest.executable) {
            if ($manifest.executable -notmatch '^builds[/\\][0-9a-f]{64}[/\\]FBones\.exe$') {
                throw 'Calea executabilului din build-info.json nu este valida.'
            }
            $application = Join-Path $folder $manifest.executable
            if (!(Test-Path -LiteralPath $application -PathType Leaf)) { throw 'Buildul curent lipseste. Reconstruieste WINDOWS_TEST.' }
            if ((Get-FileHash -LiteralPath $application -Algorithm SHA256).Hash.ToLowerInvariant() -ne $manifest.sha256) {
                throw 'Executabilul nu corespunde buildului publicat.'
            }
        }
    }
    if (!(Test-Path -LiteralPath $application -PathType Leaf)) {
        throw ('FBones.exe lipseste din ' + $folder)
    }
    # CreateProcess avoids the Shell's network-share warning/UNC working-folder
    # handling. This changes no Windows zone, execution-policy or drive settings.
    $start = New-Object System.Diagnostics.ProcessStartInfo
    $start.FileName = $application
    $start.WorkingDirectory = $env:SystemRoot
    $start.UseShellExecute = $false
    # Do not bind the GUI lifetime to anonymous pipes owned by this launcher.
    # In WSL those handles can be closed while WebView2 is still starting.
    $start.CreateNoWindow = $true
    $process = [System.Diagnostics.Process]::Start($start)
    $deadline = [DateTime]::UtcNow.AddSeconds(15)
    do {
        Start-Sleep -Milliseconds 200
        $process.Refresh()
        if ($process.HasExited) { throw ('FBones s-a inchis cu codul ' + $process.ExitCode) }
    } while ($process.MainWindowHandle -eq 0 -and [DateTime]::UtcNow -lt $deadline)
    if ($process.MainWindowHandle -eq 0) { throw 'FBones ruleaza, dar fereastra nu a aparut in 15 secunde.' }
    [PSCustomObject]@{ Path=$application; ProcessId=$process.Id; WindowHandle=$process.MainWindowHandle.ToInt64(); Title=$process.MainWindowTitle } | ConvertTo-Json -Compress
} catch {
    Write-Error $_
    exit 1
}
