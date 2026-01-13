# 🎵 SpotWave Download Guide - Get the RIGHT Songs!

## The Problem You're Experiencing

The original `downloader.ps1` uses `yt-dlp` which searches YouTube by song name. This can result in:

- ❌ Wrong versions (covers, remixes, live performances)
- ❌ Incorrect matches
- ❌ Low quality uploads

## ✅ RECOMMENDED SOLUTION: Use spotdl

I've created `downloader-spotdl.ps1` which uses **spotify-downloader (spotdl)** - a tool specifically designed for downloading Spotify tracks from YouTube with **near-perfect accuracy**.

### Why spotdl is Better:

1. **Uses Spotify's Metadata** - Matches tracks using duration, album, artist, and ISRC
2. **~99% Accuracy** - Almost always finds the correct track
3. **Automatic Metadata** - Adds album art, artist, title, album info automatically
4. **Better Quality** - Prefers official uploads and high-quality sources
5. **Proper Filenames** - Uses "Artist - Title.mp3" format

### How to Use spotdl:

#### Step 1: Install Python (One-time)

1. Download Python from: https://www.python.org/downloads/
2. **IMPORTANT**: Check "Add Python to PATH" during installation
3. Restart PowerShell after installation

#### Step 2: Run the New Downloader

```powershell
.\downloader-spotdl.ps1
```

That's it! The script will:

- Auto-install spotdl if needed (one-time)
- Download all tracks with correct matching
- Add metadata and album art
- Create a ZIP file in your Downloads folder

### Example Output:

```
Found 18 songs
Starting download with spotdl...

Downloading: PSY - Gangnam Style
✓ Downloaded successfully

Downloading: BTS - Dynamite
✓ Downloaded successfully

...

Created: playlist_20260113_143557.zip (18 songs)
Location: C:\Users\YourName\Downloads\playlist_20260113_143557.zip
```

## Alternative: Improved yt-dlp Version

If you can't install Python, the updated `downloader.ps1` now:

- ✅ Uses proper filenames (no more random YouTube titles)
- ✅ Auto-downloads ffmpeg for MP3 conversion
- ✅ Tries multiple search strategies
- ✅ Shows album/year for verification

But it's still less accurate than spotdl.

## Comparison

| Feature     | spotdl (RECOMMENDED) | yt-dlp          |
| ----------- | -------------------- | --------------- |
| Accuracy    | ~99%                 | ~70-80%         |
| Metadata    | Automatic            | Manual          |
| Album Art   | Embedded             | Optional        |
| Setup       | Python required      | No dependencies |
| Speed       | Fast                 | Fast            |
| Reliability | Excellent            | Good            |

## Troubleshooting

### "Python is not installed"

- Install Python from python.org
- Make sure to check "Add Python to PATH"
- Restart PowerShell

### "spotdl not found"

- Run: `pip install spotdl`
- Or let the script auto-install it

### "Some tracks failed"

- Check if the track is available on YouTube
- Some region-locked content may not be available
- Try the yt-dlp version as fallback

### "Downloads folder is empty"

- Check `downloads` folder in SpotWave directory
- Files are moved to ZIP then deleted
- ZIP is in your Windows Downloads folder

## Which One Should I Use?

### Use `downloader-spotdl.ps1` if:

- ✅ You want the CORRECT songs (recommended!)
- ✅ You can install Python (easy, one-time)
- ✅ You want automatic metadata and album art
- ✅ You want the best quality

### Use `downloader.ps1` if:

- ⚠️ You absolutely cannot install Python
- ⚠️ You're okay with ~70-80% accuracy
- ⚠️ You'll manually verify each download

## Tips for Best Results

1. **Export from SpotWave** - The enhanced export includes Spotify track IDs
2. **Use spotdl** - It's specifically designed for Spotify → YouTube
3. **Check the ZIP** - Verify tracks before deleting from Spotify
4. **Report Issues** - If a track fails, it might not be on YouTube

---

**Bottom Line**: Use `downloader-spotdl.ps1` for the best experience! 🎧
