param(
    [string]$BackendDirectory = (Join-Path $PSScriptRoot '../backend/mindforge-server')
)

$ErrorActionPreference = 'Stop'
$taskBackendPath = [IO.Path]::GetFullPath($BackendDirectory)
$taskSecretDirectory = Join-Path $taskBackendPath '.local'
$taskSecretPath = Join-Path $taskSecretDirectory 'application-secrets.yml'
if (Test-Path -LiteralPath $taskSecretPath) {
    Write-Output 'Local encryption configuration already exists; preserved.'
    exit 0
}

[IO.Directory]::CreateDirectory($taskSecretDirectory) | Out-Null
$taskSecretBytes = [byte[]]::new(32)
$taskRandom = [Security.Cryptography.RandomNumberGenerator]::Create()
try {
    $taskRandom.GetBytes($taskSecretBytes)
} finally {
    $taskRandom.Dispose()
}
$taskKey = [Convert]::ToBase64String($taskSecretBytes)
$taskKeyProperty = '${MINDFORGE_AI_ENCRYPTION_KEY:' + $taskKey + '}'
$taskConfiguration = "mindforge:`n  ai:`n    encryption-key: '$taskKeyProperty'`n"
[IO.File]::WriteAllText($taskSecretPath, $taskConfiguration, [Text.UTF8Encoding]::new($false))
[Array]::Clear($taskSecretBytes)
Write-Output 'Created local encryption configuration. Keep this file when moving the database.'
