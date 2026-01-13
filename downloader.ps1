
# SpotWave Downloader (PowerShell Version) - Enhanced Edition
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
    Write-Host "Error: Could not find $InputFile" -ForegroundColor Red
    Write-Host "Please export your playlist from SpotWave first!"
    exit
}

# 2. Check/Download yt-dlp
if (-not (Test-Path $YtDlpExe)) {
    Write-Host "yt-dlp.exe not found. Downloading..." -ForegroundColor Yellow
    Invoke-WebRequest -Uri $YtDlpUrl -OutFile $YtDlpExe
    Write-Host "yt-dlp downloaded." -ForegroundColor Green
}

# 3. Create downloads folder
if (-not (Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir | Out-Null
}

# 4. Read Playlist
$jsonContent = Get-Content $InputFile -Raw
$playlist = $jsonContent | ConvertFrom-Json

Write-Host "Found $($playlist.Count) songs. Starting enhanced download..." -ForegroundColor Cyan
Write-Host "Using ISRC codes and metadata for accurate matching" -ForegroundColor Cyan
Write-Host ""

# 5. Loop and Download with Enhanced Search
$i = 0
$successCount = 0
$failCount = 0

foreach ($song in $playlist) {
    $i++
    # Sanitize filename - remove invalid characters
    $safeTitle = "$($song.title) - $($song.artist)" -replace '[\\/:\*\?"<>\|]', ''
    $outputFile = Join-Path $OutputDir "$safeTitle.mp3"

    if (Test-Path $outputFile) {
        Write-Host "[$i/$($playlist.Count)] Skipping: $safeTitle (Already exists)" -ForegroundColor Gray
        $successCount++
        continue
    }

    Write-Host "[$i/$($playlist.Count)] Searching: $safeTitle..." -ForegroundColor Yellow
    
    # Try multiple search strategies in order of accuracy
    $searchQueries = @()
    
    # Strategy 1: ISRC-based search (most accurate)
    if ($song.queries.isrcQuery) {
        $searchQueries += $song.queries.isrcQuery
        Write-Host "  -> Using ISRC code for precise matching" -ForegroundColor Cyan
    }
    
    # Strategy 2: Detailed query with album and year
    if ($song.queries.detailedQuery) {
        $searchQueries += $song.queries.detailedQuery
    }
    
    # Strategy 3: Topic channel (official audio)
    if ($song.queries.topicQuery) {
        $searchQueries += $song.queries.topicQuery
    }
    
    # Strategy 4: Basic query (fallback)
    if ($song.queries.basicQuery) {
        $searchQueries += $song.queries.basicQuery
    }
    
    # If no queries object, use the default query field
    if ($searchQueries.Count -eq 0 -and $song.query) {
        $searchQueries += $song.query
    }

    $downloaded = $false
    $attemptNum = 0
    
    foreach ($searchQuery in $searchQueries) {
        $attemptNum++
        
        if ($downloaded) { break }
        
        try {
            $ytSearchQuery = "ytsearch1:$searchQuery"
            $outputTemplate = "$OutputDir\%(title)s.%(ext)s"
            
            # Download with metadata
            & $YtDlpExe --extract-audio --audio-format mp3 --audio-quality 0 --no-playlist `
                --add-metadata --embed-thumbnail `
                -o $outputTemplate $ytSearchQuery 2>&1 | Out-Null
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "[$i/$($playlist.Count)] Downloaded: $safeTitle" -ForegroundColor Green
                if ($song.album) {
                    Write-Host "  Album: $($song.album)" -ForegroundColor Gray
                }
                if ($song.releaseYear) {
                    Write-Host "  Year: $($song.releaseYear)" -ForegroundColor Gray
                }
                $downloaded = $true
                $successCount++
            }
        } catch {
            if ($attemptNum -lt $searchQueries.Count) {
                Write-Host "  Attempt $attemptNum failed, trying next strategy..." -ForegroundColor Yellow
            }
        }
    }
    
    if (-not $downloaded) {
        Write-Host "[$i/$($playlist.Count)] Failed: $safeTitle (All strategies exhausted)" -ForegroundColor Red
        $failCount++
    }
    
    Write-Host ""
}

Write-Host "Download Summary:" -ForegroundColor Cyan
Write-Host "  Success: $successCount" -ForegroundColor Green
Write-Host "  Failed: $failCount" -ForegroundColor Red
Write-Host ""

Write-Host "Creating ZIP file..." -ForegroundColor Cyan

# Get all audio files (mp3, webm, m4a)
$audioFiles = Get-ChildItem -Path $OutputDir | Where-Object { 
    $_.Extension -in @('.mp3', '.webm', '.m4a') 
}

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
        Write-Host "  Deleted: $($file.Name)" -ForegroundColor Gray
    }
    Write-Host "Cleaned up $songCount audio files from downloads folder" -ForegroundColor Green
} else {
    Write-Host "No audio files found to zip." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "All done!" -ForegroundColor Green
