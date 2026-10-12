# Episode Info Plus

**A playback-aware IINA plugin providing episode/movie info on pause, smarter automatic matching, subtitles, and skip intro.**

[![CI](https://github.com/olivergiangvu/iina-episode-info-plus/actions/workflows/episode-info-plus-ci.yml/badge.svg)](https://github.com/olivergiangvu/iina-episode-info-plus/actions/workflows/episode-info-plus-ci.yml)

Maintained as an independent fork of [Zain Imam's Episode Info](https://github.com/Zain-Imam/iina-episode-info) under the MIT license. Smart matching follows a conservative, conflict-aware approach inspired by [Trakt Scrobbler Plus v0.2.5](https://github.com/olivergiangvu/iina-trakt-scrobbler-plus).

## Episode Info Plus features

**v0.1.1-beta.2 — metadata fallback:** When TMDB cannot verify a MediaFusion/filename match, attempt a second source via the official public TVmaze API. Accept only an exactly matching series name, unambiguous premiere year when available, and verified S/E/rough runtime; show TVmaze as the source. Use the series poster and episode synopsis without inventing a TMDB ID. No TVmaze key needed; two new network allowlist hosts: api.tvmaze.com and static.tvmaze.com. The v0.1.0 Stable release is unchanged.

**0.1.1-beta.2 bug fix (Fallout S02E07):** Prioritize true mpv release filenames over display titles like `Fallout (2024)`. When a recognized MediaFusion route agrees on S/E, allow a **provisional** show/episode card even without IMDb/TMDB IDs; then use TMDB to verify and enrich. Route-only or episode-title-only matches remain rejected. No new host permissions, settings changes or Trakt integration.

**Stable release v0.1.0** — promoted from beta.3 after IINA/macOS real-world validation of automatic episode lookup and Light/Dark UI. Playback-matching behavior, local settings/storage keys, subtitle sources and overlay functionality are unchanged.

**Stable v0.1.0 includes the beta.3 accessibility fix:** targeted macOS Light Mode contrast correction for nested section headings, language labels, light-theme selected tabs, disabled subtitle/search controls, warnings and theme sliders. Dark Mode and stored preferences are not changed.

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

Or install the `.iinaplgz` file from [Releases](https://github.com/olivergiangvu/iina-episode-info-plus/releases). Latest stable: **0.1.0**. MediaFusion filename matching fix is available for testing in **0.1.1-beta.2** (prerelease). The plugin identifier remains `io.github.olivergiangvu.iinaepisodeinfoplus`, so it can replace the earlier Plus beta, while original Episode Info and Trakt+ have separate identifiers.

GitHub auto-updates use `ghRepo: olivergiangvu/iina-episode-info-plus` and a monotonic integer `ghVersion` (beta branch currently 5). **Manually reinstall the new package once** if your previous beta had no `ghRepo`; automatic version checks then follow this repository.

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

Changes are validated in a branch and PR before merging into `main`. CI tests matching fixtures, UI scripts and `.iinaplgz` archive integrity. New plugin versions must increase both `version` and integer `ghVersion`; the release workflow publishes the matching stable or prerelease artifact after a merge to `main`.

## Attribution

**Original project:** [Zain-Imam/iina-episode-info](https://github.com/Zain-Imam/iina-episode-info). Copyright © 2026 Zain Imam; MIT licensed. The original author is credited in [LICENSE](LICENSE) and the plugin manifest.

The fork remains linked upstream for selectively reviewing future fixes to subtitle and skip-intro features, while retaining its independent auto-matching and UI implementation.
