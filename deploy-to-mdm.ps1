# Builds tobeai and copies dist/web.js into the MDM webapp.
#
# Usage:
#   .\deploy-to-mdm.ps1            # yarn build + copy + bump cache-buster
#   .\deploy-to-mdm.ps1 -NoBump    # build + copy only, leave cache-buster alone
#   .\deploy-to-mdm.ps1 -SkipBuild # copy only (assumes dist/web.js is fresh)
#
# The cache-buster is the `?<number>` suffix in the import URL inside chatbot.jsp
# and agent.js. Bumping it forces the browser to re-fetch the new bundle even
# when caching is aggressive.

[CmdletBinding()]
param(
    [switch]$NoBump,
    [switch]$SkipBuild
)

$ErrorActionPreference = 'Stop'

$tobeaiDir = 'D:\tbwaiml_project\tobeai'
$src       = Join-Path $tobeaiDir 'dist\web.js'

if (-not $SkipBuild) {
    Write-Host "Running 'yarn build' in $tobeaiDir ..." -ForegroundColor Cyan
    Push-Location $tobeaiDir
    try {
        # `yarn` 실패 시 PowerShell 이 알아채도록 LASTEXITCODE 검사.
        & yarn build
        if ($LASTEXITCODE -ne 0) {
            throw "yarn build failed (exit $LASTEXITCODE)"
        }
    } finally {
        Pop-Location
    }
}

# MDM 소스 — Maven/IntelliJ 빌드가 deployed exploded WAR 로 propagate 한다.
$mdmSrc = 'D:\tbwplatform_v10\workspace\applications\tbwapp\src\main\webapp\web\flowise\web.js'

# 캐시버스터 가 들어있는 파일들 (소스만).
$busterFiles = @(
    'D:\tbwplatform_v10\workspace\applications\tbwapp\src\main\webapp\web\flowise\chatbot.jsp',
    'D:\tbwplatform_v10\workspace\applications\tbwapp\src\main\webapp\web\flowise\agent.js'
)

if (-not (Test-Path $src)) {
    Write-Error "Source not found: $src — did you run 'yarn build'?"
    exit 1
}

$srcInfo = Get-Item $src
Write-Host "Source: $src" -ForegroundColor Cyan
Write-Host "  size : $($srcInfo.Length) bytes"
Write-Host "  mtime: $($srcInfo.LastWriteTime)"

$dstDir = Split-Path $mdmSrc -Parent
if (-not (Test-Path $dstDir)) {
    Write-Error "MDM source dir missing: $dstDir"
    exit 1
}
Copy-Item -Path $src -Destination $mdmSrc -Force
Write-Host "Copied -> $mdmSrc" -ForegroundColor Green

if ($NoBump) {
    Write-Host "`nCache-buster left untouched (-NoBump)." -ForegroundColor Yellow
    return
}

# 캐시버스터 = 현재 unix 타임스탬프. ?<digits> 패턴을 새 값으로 치환.
$newBuster = [int][double]::Parse((Get-Date -UFormat %s))
$pattern   = 'web\.js\?\d+'
$replace   = "web.js?$newBuster"

Write-Host "`nBumping cache-buster -> $newBuster" -ForegroundColor Cyan
foreach ($f in $busterFiles) {
    if (-not (Test-Path $f)) {
        Write-Warning "  skip (not found): $f"
        continue
    }
    $content = Get-Content -Raw -Path $f -Encoding UTF8
    if ($content -notmatch $pattern) {
        Write-Warning "  skip (no match): $f"
        continue
    }
    $updated = [regex]::Replace($content, $pattern, $replace)
    # JSP 파일은 BOM 없이 UTF-8 로 유지 — Set-Content 의 utf8NoBOM 사용.
    [System.IO.File]::WriteAllText($f, $updated, (New-Object System.Text.UTF8Encoding $false))
    Write-Host "  bumped: $f" -ForegroundColor Green
}

Write-Host "`nDone. Hard-refresh the browser (Ctrl+Shift+R) to verify." -ForegroundColor Cyan
