# Episode Info Plus

**A playback-aware IINA plugin providing episode/movie info on pause, smarter automatic matching, subtitles, and skip intro.**

[![CI](https://github.com/olivergiangvu/iina-episode-info-plus/actions/workflows/episode-info-plus-ci.yml/badge.svg)](https://github.com/olivergiangvu/iina-episode-info-plus/actions/workflows/episode-info-plus-ci.yml)

Maintained as an independent fork of [Zain Imam's Episode Info](https://github.com/Zain-Imam/iina-episode-info) under the MIT license. Smart matching follows a conservative, conflict-aware approach inspired by [Trakt Scrobbler Plus v0.2.5](https://github.com/olivergiangvu/iina-trakt-scrobbler-plus).

## Episode Info Plus features

**v1.3.3-beta.1 (macOS glass parity):** Light Mode Glass Clear now uses proportional transparency (about 0.33 effective white tint at 72% Shade) rather than an almost opaque 0.72 white fill. Frosted and Colorful retain poster-backed blur with contrast-safe text. The Light sidebar canvas is transparent like Trakt+; both sidebars share the same semantic glass tokens and native IINA host material. Text, posters, cast, Up Next and existing settings remain fully opaque. No matching, TMDB/TVmaze, subtitle or scrobble changes. Beta must be checked on macOS in both appearances before Stable promotion.

**v1.3.2 Stable:** promoted from v1.3.2-beta.1 following real playback validation on IINA/macOS (Dr. Stone S04E22, verified TMDB metadata, cast and Up Next rendered together on the Glass card). Selectively backports upstream v1.3.5 Glass variants (Frosted, Colorful, Clear), adjustable card width (Auto or 40–100%), poster side (Auto/Left/Right), and optional Cast and Up Next. Keeps the fork's automatic Light/Dark text contrast, PiP, TMDB/TVmaze metadata, streaming recognition and original settings. Extra TMDB requests run only when Cast or Up Next are enabled; both default off. No plugin identifier, permissions, Trakt+ or storage migrations. **Previous Stable v1.3.1 remains available for rollback.**

**v1.3.1 Stable — selective upstream v1.3.4–v1.3.5 integration:** Harden TMDB candidate 404 handling using IINA error `statusCode`; recover sidebar settings lost during busy startup; automatically present TMDB search results when episode identification is uncertain; and, only after the user picks a TV series, navigate to the inferred season/episode. AIOStreams, MediaFusion, TVmaze, Light/Dark/PiP styling, subtitle functions, and stored settings are unchanged. The conservative bare-title movie shortcut is intentionally deferred to avoid false positives. v0.1.2 remains available for rollback. Also adds verified unique episode-title matching, conservative absolute anime numbering and TheIntroDB v4. New Glass/cast/Up Next controls are deferred for Light/Dark UI review.

**v0.1.2 Stable** — promoted from v0.1.2-beta.1 after a successful on-device IINA test of AIOStreams HLS playback. Parse `#aios_title=...` from streaming URL fragments and IINA display labels, including `index.m3u8#aios_title=OK! Let's Get Divorced · S01E10 · A Second Chance At Love`. The fix resolves the generic `index.m3u8` / “there is no usable name” issue, normalizes series + S/E for TMDB verification, and rejects contradictory titles without trusting a fragment as an external ID. Metadata, poster, episode details and overlay were user-verified. **No Trakt+ changes, new permissions, or settings migrations.**

**v0.1.1 Stable** — promoted from the beta.3 build validated on real IINA/macOS playback (Fallout S02E07), with the same matching engine, sidebar and overlay behavior. This release includes:

- **MediaFusion/TorBox matching:** read real `mpv.filename` release names before `Fallout (2024)`-style display titles; verify season/episode against supported playback routes and avoid premature movie classification.
- **Metadata request compatibility:** encode TMDB/TVmaze query parameters into URLs before using the IINA HTTP bridge, including numeric season/episode fields. Distinguish a candidate 404 from transport failures.
- **Fallback:** TMDB remains primary; if unavailable or unable to confirm, TVmaze can enrich a conservatively matched TV episode without an extra API key. TVmaze fallback passed automated tests; independent on-device fallback has not yet been confirmed.
- **Diagnostics:** user-triggered TMDB and TVmaze endpoint checks under Automatic Lookup, without exposing stored credentials or playback tokens.
- **UI:** original high-contrast macOS Light/Dark sidebar, PiP overlays and existing settings remain unchanged.

**Previous stable:** v0.1.1 (and v0.1.0) remain available from Releases for rollback.

- Playback metadata: explicit IMDb/TMDB IDs, normalized filenames, Comet streaming URLs and Stremio IDs; improved embedded filename parsing (DMM) and safe MediaFusion season/episode route hints.
- Two-stage lookup: a clearly marked **provisional** identity appears immediately when playback signals agree; TMDB fills in poster, synopsis and episode metadata later.
- TMDB timeouts retain a provisional identity; contradictory titles, IMDb IDs, season/episode numbers or extra/sample candidates are rejected for manual selection.
- Native **Light/Dark appearance** for the sidebar and all overlay layouts (Classic, Compact, Poster), including floating/PiP use.
- Keeps original Episode Info features: TMDB search, recent picks, subtitle sources (OpenSubtitles, SubDL, Wyzie) and intro/recap/credits skipping.

## Installation and future updates

Open **IINA → Settings/Preferences → Plugins → Install from GitHub** and enter:

```text
https://github.com/olivergiangvu/iina-episode-info-plus
```

Or install the `.iinaplgz` file from [Releases](https://github.com/olivergiangvu/iina-episode-info-plus/releases). Latest stable: **1.3.2** (GitHub Latest). The plugin identifier remains `io.github.olivergiangvu.iinaepisodeinfoplus`, so it can replace the earlier Plus beta, while original Episode Info and Trakt+ have separate identifiers.

GitHub auto-updates use `ghRepo: olivergiangvu/iina-episode-info-plus` and a monotonic integer `ghVersion` (currently **14** for v1.3.2 Stable). **Manually reinstall the new package once** if your previous beta had no `ghRepo`; automatic version checks then follow this repository.

## Preserving settings

The original `epinfo_*` storage keys are intentionally retained, including the TMDB API key, per-URL picks and caches, because user testing showed that existing preferences appeared in the Plus UI. This does **not** prove whether the settings are independently migrated or shared between different plugins on every IINA build. Back up settings and keep the original plugin disabled rather than deleting it until persistence has been confirmed. Never share API keys or tokenized playback URLs in public issues.

## Matching design

```text
Playback URL, filename, metadata
          ↓
Structured external-ID + season/episode conflict checks
          ↓
Provisional identity, when evidence is consistent
          ↓
TMDB verification and metadata enrichment
          ├─ verified → full overlay (TMDB)
          ├─ unavailable / no exact match → TVmaze fallback (TV only)
          │             ├─ verified → full overlay (TVmaze)
          │             └─ unavailable → keep provisional identity
          └─ conflict → clear provisional / manual search
```

Provisional IMDb + filename association is not yet proof that the provider ID belongs to that title. Route-only season/episode identification without show ID must not claim a verified show.

## Development and releases

Changes are validated in a branch and PR before merging into `main`. CI tests matching fixtures, UI scripts and `.iinaplgz` archive integrity. New plugin versions must increase both `version` and integer `ghVersion`; the release workflow publishes the matching stable or prerelease artifact after a merge to `main`.

## Attribution

**Original project:** [Zain-Imam/iina-episode-info](https://github.com/Zain-Imam/iina-episode-info). Copyright © 2026 Zain Imam; MIT licensed. The original author is credited in [LICENSE](LICENSE) and the plugin manifest.

The fork remains linked upstream for selectively reviewing future fixes to subtitle and skip-intro features, while retaining its independent auto-matching and UI implementation.
