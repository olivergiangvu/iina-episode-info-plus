# EP+ Native Now Playing Proof of Concept (opt-in)

Branch: feature/now-playing-poc. Version: 1.3.4-beta.2, not a stable release.

## Goal
Enrich the **existing IINA** Now Playing session with the confirmed EP+ movie/episode title and poster. IINA continues owning play/pause/seek/progress. No helper, macOS background process or new session.

## How it works
1. Play a video in IINA and let EP+ resolve a poster.
2. IINA menu **Plugins → Episode Info Plus → Now Playing — Test EP+ Title & Poster** (menu placement varies).
3. The plugin downloads only the EP+ poster from the allowlisted TMDB/TVmaze image host into its temporary folder.
4. Set **file-local-options/force-media-title** to a compact title.
5. Call `mpv video-add <local-image> auto+attached-picture` to expose an external `albumart` video track.
6. IINA's existing track-list handling should refresh MPNowPlayingInfoCenter with title and cover.

## Safety and limits
- **Manual one-shot only**, not automatic. A new media file must be opened before repeating a test.
- No modifications to the stable branch or existing plugin storage.
- No privileged shell command, no tokenized playback URL is logged.
- Local title resets when file playback ends (mpv per-file options).
- External picture should not replace the selected video track; the probe checks and attempts to restore the original track.
- Streaming seeks/duration/playback state remain IINA-native.
- This DOES NOT add custom movie/TV metadata fields to MediaPlayer; IINA v1.5.0's video NowPlayingInfoManager writes title as a single field. Film/season/episode details are combined in title.
- IINA does not expose a plugin API to clear its already-promoted front-cover artwork immediately. Exit the current media to reset after testing.
- This branch has not yet been run on the user's Mac. A pass requires on-device verification of both mpv `albumart` track and artwork displayed in Control Center.

## Acceptance checklist
- Cover matches episode or film and is not the IINA icon.
- Title contains correct show, season, episode and episode title.
- Media play/pause/seek still controls IINA.
- Selected video track, audio and subtitles remain unchanged.
- Switching to a new file clears prior artwork.
- Existing Trakt+, Companion and EP+ overlay functions still work.

## Diagnostic
IINA's logs are under `~/Library/Logs/com.colliderli.iina/`. Check messages containing `Now Playing POC`, `Now Playing`, `front cover artwork`, `external artwork file` or `Track list changed`. Never share raw stream URLs or authentication parameters publicly.
