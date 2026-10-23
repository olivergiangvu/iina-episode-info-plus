# EP+ Native Now Playing automatic PoC (v1.3.4-beta.3)

Branch: `feature/now-playing-poc`. This is a **beta-only** experiment.
Stable v1.3.3 remains untouched on `main`.

## Activation
After replacing EP+ with this beta, **no menu action is needed**. Open a new movie/episode in IINA. When EP+ emits `episodeSelected` with a TMDB ID, a non-provisional match and a supported poster URL, the plugin automatically downloads that already-verified poster and passes the image to mpv as an external albumart track. It also sets a per-file compact title.

The macOS menu is **Plugin** (singular). IINA 1.5.0 shows plugin names as section headers and their menu items under that header, not in a dedicated submenu. This build intentionally has no manual Now Playing test item.

## Data flow
```
AIOStreams → IINA playback ← EP+ verified TMDB metadata
                               ↓
                     poster image → @tmp
                               ↓
                 mpv video-add auto+attached-picture
                               ↓
            IINA native NowPlayingInfoManager
                               ↓
                  macOS Control Center
```

## Safety and scope
- One automatic attempt per playback URL, duplicate `episodeSelected` messages are coalesced while downloading.
- No global media-title changes, no shell helper, no new native media session, no changes to existing Trakt+/Companion logic.
- Only URLs under TMDB/TVmaze known poster image hosts are downloaded; no playback tokens are logged.
- Provisional identity and unknown TMDB ID are ignored.
- A cleared episode invalidates a pending download, and changing media invalidates previous asynchronous requests.
- The code checks that `vid` stays on its previous selection; if it changes, it attempts restoration.
- **Limit:** after a successful injection, same-file metadata correction is not automatically reapplied. Re-open the media during this PoC to retest.
- IINA's v1.5.0 Now Playing video metadata only exposes a single title, not distinct episode metadata fields.

## On-device acceptance
1. Open a new media item and wait until EP+ displays **TMDB verified**.
2. macOS Control Center → Now Playing must show the downloaded poster and descriptive title.
3. Play/pause, seeking, subtitles, stream playback, EP+ overlay and Trakt+ must remain functional.
4. In IINA logging, look for `Now Playing POC:` and `Found front cover artwork`.
5. If the artwork remains the IINA app icon, inspect whether mpv registered an albumart track before making further changes.

Rollback: install [v1.3.3 stable](https://github.com/olivergiangvu/iina-episode-info-plus/releases) through IINA, using the same plugin identifier.
