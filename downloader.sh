#!/bin/bash

# SpotWave Downloader (Bash Version)
# Works on: Git Bash (Windows), macOS, Linux

# Configuration
INPUT_FILE="downloads/playlist.json"
OUTPUT_DIR="downloads"
YT_DLP_URL="https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp"

# Detect OS
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    # Windows (Git Bash)
    YT_DLP_EXE="./yt-dlp.exe"
    YT_DLP_URL="https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe"
    DOWNLOADS_FOLDER="$USERPROFILE/Downloads"
    JQ_EXE="./jq.exe"
    JQ_URL="https://github.com/jqlang/jq/releases/latest/download/jq-windows-amd64.exe"
else
    # macOS/Linux
    YT_DLP_EXE="./yt-dlp"
    DOWNLOADS_FOLDER="$HOME/Downloads"
    JQ_EXE="jq"
fi

# 1. Check/Download jq (for Windows)
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    if [ ! -f "$JQ_EXE" ]; then
        echo "⬇️ jq.exe not found. Downloading..."
        curl -L "$JQ_URL" -o "$JQ_EXE"
        chmod +x "$JQ_EXE"
        echo "✅ jq downloaded."
    fi
fi

# 2. Check for playlist.json
if [ ! -f "$INPUT_FILE" ]; then
    echo "❌ Error: Could not find $INPUT_FILE"
    echo "Please export your playlist from SpotWave first!"
    exit 1
fi

# 2. Check/Download yt-dlp
if [ ! -f "$YT_DLP_EXE" ]; then
    echo "⬇️ yt-dlp not found. Downloading..."
    curl -L "$YT_DLP_URL" -o "$YT_DLP_EXE"
    chmod +x "$YT_DLP_EXE"
    echo "✅ yt-dlp downloaded."
fi

# 3. Create downloads folder
mkdir -p "$OUTPUT_DIR"

# 4. Read Playlist
SONG_COUNT=$("$JQ_EXE" 'length' "$INPUT_FILE")
echo "🎵 Found $SONG_COUNT songs. Starting download..."

# 5. Loop and Download
i=0
while IFS= read -r song; do
    ((i++))
    
    title=$(echo "$song" | "$JQ_EXE" -r '.title')
    artist=$(echo "$song" | "$JQ_EXE" -r '.artist')
    query=$(echo "$song" | "$JQ_EXE" -r '.query')
    
    # Create safe filename
    safe_title=$(echo "$title - $artist" | tr -d '\\/*?:"<>|')
    output_file="$OUTPUT_DIR/$safe_title.mp3"
    
    if [ -f "$output_file" ]; then
        echo "[$i/$SONG_COUNT] ⏭️ Skipping: $safe_title (Already exists)"
        continue
    fi
    
    echo "[$i/$SONG_COUNT] ⬇️ Downloading: $safe_title..."
    
    # Run yt-dlp and capture output
    "$YT_DLP_EXE" --extract-audio --audio-format mp3 --audio-quality 0 \
        --no-playlist -o "$OUTPUT_DIR/%(title)s.%(ext)s" \
        "ytsearch1:$query" 2>&1 | grep -v "WARNING" | grep -v "deprecated" > /dev/null
    
    # Check if any audio file was created (more reliable than exit code)
    sleep 1
    new_files=("$OUTPUT_DIR"/*.{mp3,webm,m4a})
    if [ -f "${new_files[0]}" ]; then
        echo "[$i/$SONG_COUNT] ✅ Downloaded"
    else
        echo "[$i/$SONG_COUNT] ❌ Failed"
    fi
    
done < <("$JQ_EXE" -c '.[]' "$INPUT_FILE")

echo ""
echo "Creating ZIP file..."

# Get all audio files
shopt -s nullglob
audio_files=("$OUTPUT_DIR"/*.{mp3,webm,m4a})
shopt -u nullglob

if [ ${#audio_files[@]} -gt 0 ]; then
    # Create ZIP filename with timestamp
    timestamp=$(date +"%Y%m%d_%H%M%S")
    zip_name="playlist_$timestamp.zip"
    zip_path="$DOWNLOADS_FOLDER/$zip_name"
    
    # Create the ZIP file
    zip -j "$zip_path" "${audio_files[@]}" > /dev/null 2>&1
    
    song_count=${#audio_files[@]}
    echo "Created: $zip_name ($song_count songs)"
    echo "Location: $zip_path"
    
    # Clean up: Remove individual audio files
    echo ""
    echo "Cleaning up individual files..."
    for file in "${audio_files[@]}"; do
        rm -f "$file"
        echo "  Deleted: $(basename "$file")"
    done
    echo "Cleaned up $song_count audio files from downloads folder"
else
    echo "No audio files found to zip."
fi

echo ""
echo "All done!"
