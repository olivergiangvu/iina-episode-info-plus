# Episode Info Plus

**A playback-aware IINA plugin providing episode/movie info on pause, smarter automatic matching, subtitles, and skip intro.**

[![CI](https://github.com/olivergiangvu/iina-episode-info-plus/actions/workflows/episode-info-plus-ci.yml/badge.svg)](https://github.com/olivergiangvu/iina-episode-info-plus/actions/workflows/episode-info-plus-ci.yml)

Maintained as an independent fork of [Zain Imam's Episode Info](https://github.com/Zain-Imam/iina-episode-info) under the MIT license. Smart matching follows a conservative, conflict-aware approach inspired by [Trakt Scrobbler Plus v0.2.5](https://github.com/olivergiangvu/iina-trakt-scrobbler-plus).

## Episode Info Plus features

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

Or install the `.iinaplgz` file from [Releases](https://github.com/olivergiangvu/iina-episode-info-plus/releases). Latest beta: **0.1.0-beta.2**. The plugin identifier remains `io.github.olivergiangvu.iinaepisodeinfoplus`, so it can replace the earlier Plus beta, while original Episode Info and Trakt+ have separate identifiers.

GitHub auto-updates use `ghRepo: olivergiangvu/iina-episode-info-plus` and a monotonic integer `ghVersion` (currently 2). **Manually reinstall the new package once** if your previous beta had no `ghRepo`; automatic version checks then follow this repository.

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
          ├─ verified → full overlay
          ├─ timeout → keep provisional identity
          └─ mismatch → clear provisional / manual search
```

Provisional IMDb + filename association is not yet proof that the provider ID belongs to that title. Route-only season/episode identification without show ID must not claim a verified show.

## Development and releases

Changes are validated in a branch and PR before merging into `main`. CI tests matching fixtures, UI scripts and `.iinaplgz` archive integrity. New plugin versions must increase both `version` and integer `ghVersion`; the release workflow publishes the matching beta artifact after a merge to `main`.

## Attribution

**Original project:** [Zain-Imam/iina-episode-info](https://github.com/Zain-Imam/iina-episode-info). Copyright © 2026 Zain Imam; MIT licensed. The original author is credited in [LICENSE](LICENSE) and the plugin manifest.

The fork remains linked upstream for selectively reviewing future fixes to subtitle and skip-intro features, while retaining its independent auto-matching and UI implementation.
