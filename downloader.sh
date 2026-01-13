#!/bin/bash

# SpotWave Downloader (Bash Version) - Enhanced Edition
# Works on: Git Bash (Windows), macOS, Linux

# Configuration
INPUT_FILE="downloads/playlist.json"
OUTPUT_DIR="downloads"
JQ_URL="https://github.com/jqlang/jq/releases/latest/download/jq-win64.exe"
FFMPEG_URL="https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip"

# Detect OS
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    # Windows (Git Bash)
    YT_DLP_EXE="./yt-dlp.exe"
    YT_DLP_URL="https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe"
    DOWNLOADS_FOLDER="$USERPROFILE/Downloads"
    JQ_EXE="./jq.exe"
    FFMPEG_EXE="./ffmpeg.exe"
else
    # macOS/Linux
    YT_DLP_EXE="./yt-dlp"
    YT_DLP_URL="https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp"
    DOWNLOADS_FOLDER="$HOME/Downloads"
    JQ_EXE="jq"
    FFMPEG_EXE="ffmpeg"
fi

# 1. Check/Download jq (for Windows)
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    if [ ! -f "$JQ_EXE" ]; then
        echo "jq.exe not found. Downloading..."
        curl -L "$JQ_URL" -o "$JQ_EXE"
        chmod +x "$JQ_EXE"
        echo "jq downloaded."
    fi
fi

# 2. Check for playlist.json
if [ ! -f "$INPUT_FILE" ]; then
    echo "Error: Could not find $INPUT_FILE"
    echo "Please export your playlist from SpotWave first!"
    exit 1
fi

# 3. Check/Download yt-dlp
if [ ! -f "$YT_DLP_EXE" ]; then
    echo "yt-dlp not found. Downloading..."
    curl -L "$YT_DLP_URL" -o "$YT_DLP_EXE"
    chmod +x "$YT_DLP_EXE"
    echo "yt-dlp downloaded."
fi

# 4. Check/Download ffmpeg (for Windows)
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    if [ ! -f "$FFMPEG_EXE" ]; then
        echo "ffmpeg.exe not found. Downloading (~100MB)..."
        curl -L "$FFMPEG_URL" -o "ffmpeg.zip"
        echo "Extracting ffmpeg..."
        unzip -q "ffmpeg.zip" -d "ffmpeg_temp"
        find ./ffmpeg_temp -name "ffmpeg.exe" -exec mv {} . \;
        rm -rf "ffmpeg.zip" "ffmpeg_temp"
        echo "ffmpeg downloaded and extracted."
    fi
fi

# 5. Create downloads folder
mkdir -p "$OUTPUT_DIR"

# 6. Read Playlist
SONG_COUNT=$("$JQ_EXE" '. | length' "$INPUT_FILE")
echo "Found $SONG_COUNT songs. Starting enhanced download..."
echo "Using ISRC codes and metadata for accurate matching"
echo ""

# 7. Loop and Download
i=0
success_count=0
fail_count=0

while IFS= read -r song; do
    ((i++))
    
    title=$(echo "$song" | "$JQ_EXE" -r '.title')
    artist=$(echo "$song" | "$JQ_EXE" -r '.artist')
    album=$(echo "$song" | "$JQ_EXE" -r '.album')
    year=$(echo "$song" | "$JQ_EXE" -r '.releaseYear')
    
    # Create safe filename
    safe_title=$(echo "$title - $artist" | sed 's/[\\/:\*\?"<>|]//g')
    output_file="$OUTPUT_DIR/$safe_title.mp3"
    
    if [ -f "$output_file" ]; then
        echo "[$i/$SONG_COUNT] Skipping: $safe_title (Already exists)"
        ((success_count++))
        continue
    fi
    
    echo "[$i/$SONG_COUNT] Searching: $safe_title..."
    
    # Collect search strategies
    isrc_query=$(echo "$song" | "$JQ_EXE" -r '.queries.isrcQuery // empty')
    detailed_query=$(echo "$song" | "$JQ_EXE" -r '.queries.detailedQuery // empty')
    topic_query=$(echo "$song" | "$JQ_EXE" -r '.queries.topicQuery // empty')
    basic_query=$(echo "$song" | "$JQ_EXE" -r '.queries.basicQuery // empty')
    fallback_query=$(echo "$song" | "$JQ_EXE" -r '.query // empty')

    # Put strategies in an array
    strategies=()
    [ ! -z "$isrc_query" ] && strategies+=("$isrc_query")
    [ ! -z "$detailed_query" ] && strategies+=("$detailed_query")
    [ ! -z "$topic_query" ] && strategies+=("$topic_query")
    [ ! -z "$basic_query" ] && strategies+=("$basic_query")
    [ ! -z "$fallback_query" ] && [[ "${#strategies[@]}" -eq 0 ]] && strategies+=("$fallback_query")

    downloaded=false
    attempt=0
    
    for query in "${strategies[@]}"; do
        ((attempt++))
        
        if [ "$downloaded" = true ]; then break; fi
        
        # Check if first strategy is ISRC
        if [[ "$query" == *"ISRC:"* ]]; then
            echo "  -> Using ISRC code for precise matching"
        fi

        # Run yt-dlp
        "$YT_DLP_EXE" --extract-audio --audio-format mp3 --audio-quality 0 \
            --no-playlist --add-metadata --embed-thumbnail \
            --postprocessor-args "ffmpeg:-ar 44100 -ac 2" \
            -o "$OUTPUT_DIR/${safe_title}.%(ext)s" \
            "ytsearch1:$query" > /dev/null 2>&1
        
        if [ -f "$output_file" ]; then
            echo "[$i/$SONG_COUNT] Downloaded: $safe_title"
            [ "$album" != "null" ] && echo "  Album: $album"
            [ "$year" != "null" ] && echo "  Year: $year"
            downloaded=true
            ((success_count++))
        else
            if [ "$attempt" -lt "${#strategies[@]}" ]; then
                echo "  Attempt $attempt failed, trying next strategy..."
            fi
        fi
    done
    
    if [ "$downloaded" = false ]; then
        echo "[$i/$SONG_COUNT] Failed: $safe_title (All strategies exhausted)"
        ((fail_count++))
    fi
    echo ""
    
done < <("$JQ_EXE" -c '.[]' "$INPUT_FILE")

echo "Download Summary:"
echo "  Success: $success_count"
echo "  Failed: $fail_count"
echo ""

echo "Creating ZIP file..."

# Get all audio files
shopt -s nullglob
audio_files=("$OUTPUT_DIR"/*.mp3)
shopt -u nullglob

if [ ${#audio_files[@]} -gt 0 ]; then
    timestamp=$(date +"%Y%m%d_%H%M%S")
    zip_name="playlist_$timestamp.zip"
    
    # Convert path for Windows
    if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
        zip_path=$(cygpath -u "$DOWNLOADS_FOLDER")/"$zip_name"
    else
        zip_path="$DOWNLOADS_FOLDER/$zip_name"
    fi
    
    # Create the ZIP file
    zip -j "$zip_path" "${audio_files[@]}" > /dev/null 2>&1
    
    echo "Created: $zip_name (${#audio_files[@]} songs)"
    echo "Location: $zip_path"
    
    # Clean up
    echo ""
    echo "Cleaning up individual files..."
    for file in "${audio_files[@]}"; do
        rm -f "$file"
        echo "  Deleted: $(basename "$file")"
    done
    echo "Cleaned up ${#audio_files[@]} audio files"
else
    echo "No audio files found to zip."
fi

echo ""
echo "All done!"
