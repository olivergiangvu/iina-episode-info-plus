"use strict";
// Verified-metadata, one-shot-per-file automatic proof of concept.
// Never creates a second macOS media session.
// The file-local title is automatically restored by mpv at end of playback.
function createNowPlayingProbe(deps) {
  var iina = deps.iina, core = deps.core, utils = deps.utils, log = deps.log;
  var generation = 0, testedUrl = null, pendingUrl = null;
  function safeUrl() {
    try { return String(core.status.url || ""); } catch (_) { return ""; }
  }
  function invalidate() {
    generation += 1;
    testedUrl = null;
    pendingUrl = null;
  }
  function titleFor(info) {
    if (info.isMovie) {
      return [info.epTitle || "", info.code ? "(" + info.code + ")" : ""].filter(Boolean).join(" ");
    }
    return [info.showTitle || "", info.code || "", info.epTitle || ""].filter(Boolean).join(" · ");
  }
  function allowedArtwork(url) {
    return /^https:\/\/(?:image\.tmdb\.org|static\.tvmaze\.com)\//i.test(String(url || ""));
  }
  function trackList() {
    try { return iina.mpv.getNative("track-list") || []; } catch (_) { return []; }
  }
  function vid() {
    try { return String(iina.mpv.getString("vid") || ""); } catch (_) { return ""; }
  }
  async function tryCurrent(info) {
    if (!info || !info.posterUrl || !allowedArtwork(info.posterUrl)) {
      log("Now Playing POC: EP+ has no supported verified poster for this selection.");
      return false;
    }
    if (info.metadataPending) {
      log("Now Playing POC: wait until EP+ completes metadata verification.");
      return false;
    }
    var playbackUrl = safeUrl();
    var title = titleFor(info);
    if (!playbackUrl || !title) {
      log("Now Playing POC: no active playback or title.");
      return false;
    }
    if (testedUrl === playbackUrl || pendingUrl === playbackUrl) return false;
    pendingUrl = playbackUrl;
    var ticket = ++generation;
    var tempPath = "@tmp/epplus-now-playing-" + Date.now() + "-" + ticket + ".jpg";
    log("Now Playing POC: downloading EP+ poster to plugin temporary storage.");
    try {
      await deps.withTimeout(iina.http.download(info.posterUrl, tempPath), 12000, "Now Playing poster");
      // A new file or a superseding test must never receive stale artwork.
      if (ticket !== generation || safeUrl() !== playbackUrl) return false;
      pendingUrl = null;
      if (!utils || typeof utils.resolvePath !== "function") {
        throw new Error("IINA utils.resolvePath is unavailable");
      }
      var absolutePath = String(utils.resolvePath(tempPath) || "");
      if (!absolutePath || absolutePath.charAt(0) !== "/") {
        throw new Error("Cannot resolve poster to an absolute local path");
      }
      if (!iina.file.exists(tempPath)) {
        throw new Error("Downloaded poster is missing");
      }
      var originalVideoId = vid();
      // This is a per-file change, NOT a global mpv title override.
      iina.mpv.set("file-local-options/force-media-title", title);
      // mpv uses "attached-picture" to mark the image as an albumart track.
      // "auto" must not replace the actively selected video stream.
      iina.mpv.command("video-add", [absolutePath, "auto+attached-picture", "EP+ Now Playing poster"]);
      testedUrl = playbackUrl;
      log("Now Playing POC: requested albumart track and title update. Check Control Center.");
      setTimeout(function () {
        if (ticket !== generation || safeUrl() !== playbackUrl) return;
        var tracks = trackList();
        var found = tracks.some(function(t) {
          return t && t.type === "video" && t.albumart === true &&
                 t["external-filename"] === absolutePath;
        });
        var currentVid = vid();
        if (originalVideoId && currentVid && currentVid !== originalVideoId) {
          try { iina.mpv.set("vid", originalVideoId); } catch (_) {}
          log("Now Playing POC: video track changed; attempted to restore original video.");
        }
        log(found
          ? "Now Playing POC PASS: external albumart track exists. Inspect macOS Now Playing."
          : "Now Playing POC: no matching albumart track found; inspect IINA mpv logs.");
      }, 850);
      return true;
    } catch (e) {
      if (ticket === generation) pendingUrl = null;
      log("Now Playing POC failed: " + (e && e.message ? e.message : String(e)));
      return false;
    }
  }
  return { tryCurrent: tryCurrent, invalidate: invalidate, titleFor: titleFor,
    allowedArtwork: allowedArtwork };
}
module.exports = { createNowPlayingProbe: createNowPlayingProbe };
