param([switch]$Check)

$ErrorActionPreference = 'Stop'
$taskRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$taskToolDirectory = Join-Path $taskRoot '.local/tools'
$taskFormatter = Join-Path $taskToolDirectory 'google-java-format.jar'
if (-not (Test-Path -LiteralPath $taskFormatter)) {
    [IO.Directory]::CreateDirectory($taskToolDirectory) | Out-Null
    Invoke-WebRequest -Uri 'https://github.com/google/google-java-format/releases/download/v1.37.0/google-java-format-1.37.0-all-deps.jar' -OutFile $taskFormatter
}

$taskSourceDirectory = Join-Path $taskRoot 'backend/mindforge-server/src'
$taskSourcePaths = @(Get-ChildItem -LiteralPath $taskSourceDirectory -Recurse -File -Filter '*.java' | ForEach-Object { $_.FullName })
$taskSourcePaths += @(Get-ChildItem -LiteralPath (Join-Path $taskRoot 'scripts') -File -Filter '*.java' | ForEach-Object { $_.FullName })
foreach ($taskSourcePath in $taskSourcePaths) {
    $taskSourceText = [IO.File]::ReadAllText($taskSourcePath)
    if ($taskSourceText.Contains("`r")) {
        if ($Check) {
            throw "Java source must use LF line endings: $taskSourcePath"
        }
        [IO.File]::WriteAllText($taskSourcePath, $taskSourceText.Replace("`r`n", "`n").Replace("`r", "`n"), [Text.UTF8Encoding]::new($false))
    }
}
$taskFormatterArguments = @('-jar', $taskFormatter, '--aosp', '--max-line-length', '120', '--skip-reflowing-long-strings')
if ($Check) {
    $taskFormatterArguments += @('--dry-run', '--set-exit-if-changed')
} else {
    $taskFormatterArguments += '--replace'
}

& java @taskFormatterArguments @taskSourcePaths
if ($LASTEXITCODE -ne 0) {
    throw 'Java formatting check failed.'
}
