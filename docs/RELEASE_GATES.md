# EP+ Protected Capabilities & Release Gates

> **Why this exists:** On 23 Oct 2026, the `feature/now-playing-poc` beta.3 delivered verified EP+ posters into IINA/macOS Now Playing, confirmed by real macOS logs (`Found front cover artwork`). Later branches/releases omitted this module and its archive packaging. The local 1.3.4-beta.2 installation on 12 Nov 2026 had neither the module nor the call-site. Branch-specific version labels were not a reliable feature inventory.

## Protected capabilities (must remain present in every new release)

| Capability | Automated gate | Additional macOS acceptance |
| --- | --- | --- |
| TMDB matching and no-invention safeguards | identity / Mystic Nine / upstream 1.3.5 tests | Opaque HLS and proper release filenames both resolve accurately |
| TVmaze fallback | release capability check / upstream tests | A correctly verified fallback is displayed; mismatches remain unselected |
| AIOStreams HLS title parsing | existing identity tests and CI | Verify new opaque CDN filename stream |
| EP+ pause overlay + Light/Dark Glass | glass parity / UI integration | Pause and unpause in both appearances; artwork, subtitles and controls visible |
| Cast and Up Next opt-in | upstream UI integration | No extra network calls when disabled; extras render when enabled |
| Intro / recap / credits skip | release contract / upstream tests | UI pill, skip seek and cancellation on next file |
| OpenSubtitles/SubDL/Wyzie integration | release contract / source checks | Load an external subtitle; selected track remains correct |
| **EP+ → mpv albumart → IINA native Now Playing** | **now-playing-integration.test.js + archive verifier** | **Verified poster in Control Center; correct title, progress, play/pause/seek; no duplicate or stale image** |
| New-media cleanup | stale-request test / capability contract | Switch episode while poster is downloading, no old art follows |
| Packaging + permissions + plugin identity | `verify-plugin-package.js` | Replace existing EP+ without losing plugin configuration |

## Mandatory release procedure

1. Branch from the **latest `main`**, never from an old beta branch. Do not merge another branch's files wholesale if it predates the latest stable fixes.
2. Review this capability matrix and explain any intentional removal with the user **before** deleting functionality.
3. CI runs all existing matching, UI, lifecycle and poster tests. CI validates every source dependency **inside the final zipped .iinaplgz**; source-only tests are not sufficient.
4. Test actual opaque HLS playback on Mac; inspect `~/Library/Logs/com.colliderli.iina` for `Now Playing POC` and `Found front cover artwork`. The mock is **not** proof macOS artwork is rendered.
5. Check video playback/audio/subtitles, seek and Trakt+ scrobble compatibility. The IINA plugin must not create a second Now Playing media session.
6. Promote to Stable only after Mac smoke tests pass and a versioned release artifact is attached. Keep rollback release intact.

## Boundary of automation

The CI checks catch accidental deletion, broken module references and missing packaged assets. CI does **not** run macOS MediaPlayer, IINA's native player, TMDB connectivity or actual Trakt+ integrations. These remain explicit macOS acceptance gates, not assumed passes.

## Reference for working feature

`feature/now-playing-poc` (beta.3) and historical Mac diagnostic:
`Now Playing POC PASS: external albumart track exists`, `Reading external artwork file`, `Found front cover artwork`.

## User acceptance (2026-11-12)

- The user reported **"đã fix"** after installing the recovery candidate on Mac (native IINA playback). This is an explicit acceptance signal for the repaired feature, not automated proof of every other on-device integration.
- Before Stable, CI must pass and the final release artifact must retain the Now Playing module.
- The prior `v1.3.4` release is **non-compliant** because it dropped the tested artwork bridge. It must no longer appear as the current Stable. Preserve its tag/history for audit, mark the GitHub release as **pre-release**, and publish `v1.3.5` as the new latest Stable.
