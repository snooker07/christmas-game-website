param([int]$Port = 4173)
$ErrorActionPreference = 'Stop'
$taskRuntime = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe'
if (-not (Test-Path -LiteralPath $taskRuntime)) { $taskRuntime = (Get-Command python -ErrorAction Stop).Source }
$taskOutput = Join-Path $PSScriptRoot 'dist'
if (-not (Test-Path -LiteralPath (Join-Path $taskOutput 'index.html'))) { throw 'Build the website first: python build.py' }
Write-Host "Fundelits preview: http://127.0.0.1:$Port/"
Write-Host 'Press Ctrl+C to stop the preview.'
& $taskRuntime -m http.server $Port --bind 127.0.0.1 --directory $taskOutput
