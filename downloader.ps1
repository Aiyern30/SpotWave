
# SpotWave Downloader (PowerShell Version)
$ErrorActionPreference = "Stop"

# Configuration
$InputFile = "downloads\playlist.json"
$OutputDir = "downloads"
$YtDlpUrl = "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe"
$YtDlpExe = ".\yt-dlp.exe"
$FfmpegUrl = "https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip"
$FfmpegExe = ".\ffmpeg.exe"

# 1. Check for playlist.json
if (-not (Test-Path $InputFile)) {
    Write-Host "❌ Error: Could not find $InputFile" -ForegroundColor Red
    Write-Host "Please export your playlist from SpotWave first!"
    exit
}

# 2. Check/Download yt-dlp
if (-not (Test-Path $YtDlpExe)) {
    Write-Host "⬇️ yt-dlp.exe not found. Downloading..." -ForegroundColor Yellow
    Invoke-WebRequest -Uri $YtDlpUrl -OutFile $YtDlpExe
    Write-Host "✅ yt-dlp downloaded." -ForegroundColor Green
}

# 3. Create downloads folder
if (-not (Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir | Out-Null
}

# 4. Read Playlist
$jsonContent = Get-Content $InputFile -Raw
$playlist = $jsonContent | ConvertFrom-Json

Write-Host "🎵 Found $($playlist.Count) songs. Starting download..." -ForegroundColor Cyan

# 5. Loop and Download
$i = 0
foreach ($song in $playlist) {
    $i++
    $safeTitle = "$($song.title) - $($song.artist)" -replace '[\\/*?:"<>|]', ""
    $outputFile = Join-Path $OutputDir "$safeTitle.mp3"

    if (Test-Path $outputFile) {
        Write-Host "[$i/$($playlist.Count)] ⏭️ Skipping: $safeTitle (Already exists)" -ForegroundColor Gray
        continue
    }

    Write-Host "[$i/$($playlist.Count)] ⬇️ Downloading: $safeTitle..." -ForegroundColor Yellow

    try {
        # Use direct command string to avoid PowerShell argument parsing issues
        $searchQuery = "ytsearch1:$($song.query)"
        $outputTemplate = "$OutputDir\%(title)s.%(ext)s"
        
        & $YtDlpExe --extract-audio --audio-format mp3 --audio-quality 0 --no-playlist -o $outputTemplate $searchQuery 2>&1 | Out-Null
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "[$i/$($playlist.Count)] ✅ Downloaded: $safeTitle" -ForegroundColor Green
        } else {
            Write-Host "[$i/$($playlist.Count)] ❌ Failed: $safeTitle" -ForegroundColor Red
        }
    } catch {
        Write-Host "[$i/$($playlist.Count)] ❌ Error: $safeTitle - $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Creating ZIP file..." -ForegroundColor Cyan

# Get all audio files (mp3, webm, m4a)
$audioFiles = Get-ChildItem -Path $OutputDir -Include "*.mp3", "*.webm", "*.m4a" -Recurse

if ($audioFiles.Count -gt 0) {
    # Create ZIP filename with timestamp
    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $zipName = "playlist_$timestamp.zip"
    
    # Save to user's Downloads folder
    $downloadsFolder = [Environment]::GetFolderPath("UserProfile") + "\Downloads"
    $zipPath = Join-Path $downloadsFolder $zipName
    
    # Create the ZIP file with all audio files
    Compress-Archive -Path $audioFiles.FullName -DestinationPath $zipPath -Force
    
    $songCount = $audioFiles.Count
    Write-Host "Created: $zipName ($songCount songs)" -ForegroundColor Green
    Write-Host "Location: $zipPath" -ForegroundColor Yellow
    
    # Clean up: Remove individual audio files after successful ZIP creation
    Write-Host ""
    Write-Host "Cleaning up individual files..." -ForegroundColor Cyan
    foreach ($file in $audioFiles) {
        Remove-Item $file.FullName -Force
    }
    Write-Host "Cleaned up $songCount audio files from downloads folder" -ForegroundColor Green
} else {
    Write-Host "No audio files found to zip." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "All done!" -ForegroundColor Green
