# SpotWave Downloader - Simple & Reliable Version
# This version uses spotify-downloader (spotdl) which is more accurate than yt-dlp alone

$ErrorActionPreference = "Stop"

# Configuration
$InputFile = "downloads\playlist.json"
$OutputDir = "downloads"

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "  SpotWave Playlist Downloader" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# 1. Check for playlist.json
if (-not (Test-Path $InputFile)) {
    Write-Host "Error: Could not find $InputFile" -ForegroundColor Red
    Write-Host "Please export your playlist from SpotWave first!"
    exit
}

# 2. Check if Python is installed
try {
    $pythonVersion = python --version 2>&1
    Write-Host "Found: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "Error: Python is not installed!" -ForegroundColor Red
    Write-Host "Please install Python from https://www.python.org/downloads/" -ForegroundColor Yellow
    Write-Host "Make sure to check 'Add Python to PATH' during installation" -ForegroundColor Yellow
    exit
}

# 3. Check/Install spotdl
Write-Host "Checking for spotdl..." -ForegroundColor Cyan
try {
    $spotdlVersion = spotdl --version 2>&1
    Write-Host "Found: spotdl $spotdlVersion" -ForegroundColor Green
} catch {
    Write-Host "spotdl not found. Installing..." -ForegroundColor Yellow
    Write-Host "This is a one-time installation..." -ForegroundColor Yellow
    pip install spotdl
    Write-Host "spotdl installed successfully!" -ForegroundColor Green
}

# 4. Create downloads folder
if (-not (Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir | Out-Null
}

# 5. Read Playlist
$jsonContent = Get-Content $InputFile -Raw
$playlist = $jsonContent | ConvertFrom-Json

Write-Host ""
Write-Host "Found $($playlist.Count) songs" -ForegroundColor Cyan
Write-Host "Starting download with spotdl (uses Spotify metadata for accuracy)..." -ForegroundColor Cyan
Write-Host ""

# 6. Create a temporary file with Spotify URLs
$spotifyUrls = @()
foreach ($song in $playlist) {
    if ($song.spotifyId) {
        $spotifyUrls += "https://open.spotify.com/track/$($song.spotifyId)"
    }
}

# Save URLs to temp file
$urlFile = ".\temp_urls.txt"
$spotifyUrls | Out-File -FilePath $urlFile -Encoding UTF8

# 7. Download using spotdl
Write-Host "Downloading $($spotifyUrls.Count) tracks..." -ForegroundColor Yellow
Write-Host ""

try {
    # spotdl will automatically:
    # - Search YouTube for the best match using Spotify metadata
    # - Download and convert to MP3
    # - Add proper metadata and album art
    # - Use the correct filename format
    
    spotdl download $urlFile --output "$OutputDir/{artist} - {title}.mp3" --format mp3 --bitrate 320k
    
    Write-Host ""
    Write-Host "Download completed!" -ForegroundColor Green
} catch {
    Write-Host "Error during download: $_" -ForegroundColor Red
} finally {
    # Clean up temp file
    Remove-Item -Path $urlFile -Force -ErrorAction SilentlyContinue
}

# 8. Create ZIP
Write-Host ""
Write-Host "Creating ZIP file..." -ForegroundColor Cyan

$audioFiles = Get-ChildItem -Path $OutputDir -Filter "*.mp3"

if ($audioFiles.Count -gt 0) {
    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $zipName = "playlist_$timestamp.zip"
    $downloadsFolder = [Environment]::GetFolderPath("UserProfile") + "\Downloads"
    $zipPath = Join-Path $downloadsFolder $zipName
    
    Compress-Archive -Path $audioFiles.FullName -DestinationPath $zipPath -Force
    
    Write-Host "Created: $zipName ($($audioFiles.Count) songs)" -ForegroundColor Green
    Write-Host "Location: $zipPath" -ForegroundColor Yellow
    
    # Clean up
    Write-Host ""
    Write-Host "Cleaning up..." -ForegroundColor Cyan
    foreach ($file in $audioFiles) {
        Remove-Item $file.FullName -Force
    }
    Write-Host "Cleaned up $($audioFiles.Count) files" -ForegroundColor Green
} else {
    Write-Host "No MP3 files found" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "All done!" -ForegroundColor Green
Write-Host ""
