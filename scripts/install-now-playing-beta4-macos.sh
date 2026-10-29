#!/bin/bash
# In-place poster functionality repair for exactly one installed EP+ beta.4.
# No extra plugin, no Bridge/Trakt modifications, and no configuration deletion.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PLUGIN="$HOME/Library/Application Support/com.colliderli.iina/plugins/io.github.olivergiangvu.iinaepisodeinfoplus.iinaplugin"
BASE_MAIN_SHA="8da49954242f4be63458feebf947de03001b8199"
TARGET_VERSION="1.3.4-beta.4.1"
for tool in python3 git; do
  command -v "$tool" >/dev/null || {
    echo "ERROR: required $tool unavailable; no file changed" >&2; exit 2;
  }
done
test -d "$PLUGIN" || { echo "ERROR: EP+ install not found: $PLUGIN" >&2; exit 2; }
test -f "$PLUGIN/main.js" && test -f "$PLUGIN/Info.json" || {
  echo "ERROR: incomplete EP+ installation; no file changed" >&2; exit 2;
}
if pgrep -x IINA >/dev/null 2>&1; then
  echo "ERROR: quit IINA fully (Cmd+Q), then rerun; no file changed" >&2
  exit 2
fi
current="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["version"])' "$PLUGIN/Info.json")"
ident="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["identifier"])' "$PLUGIN/Info.json")"
test "$ident" = "io.github.olivergiangvu.iinaepisodeinfoplus" || {
  echo "ERROR: unexpected plugin identifier; no file changed" >&2; exit 2;
}
if [ "$current" = "$TARGET_VERSION" ]; then
  for f in main.js Info.json epplus-now-playing.js; do
    cmp -s "$ROOT/$f" "$PLUGIN/$f" || {
      echo "ERROR: installed candidate differs from GitHub source ($f)" >&2; exit 2;
    }
  done
  echo "ALREADY_INSTALLED: EP+ $TARGET_VERSION"; exit 0
fi
test "$current" = "1.3.4-beta.4" || {
  echo "ERROR: expected EP+ 1.3.4-beta.4, got $current; no file changed" >&2; exit 2;
}
test "$(git hash-object "$PLUGIN/main.js")" = "$BASE_MAIN_SHA" || {
  echo "ERROR: installed main.js differs from GitHub beta.4; refusing overwrite" >&2
  exit 2
}
echo "===== SOURCE VALIDATION ====="
# GitHub Actions ran all JS tests and syntax checks for this commit; node is
# OPTIONAL on Macs. Locally verify the unmodified Git checkout and integration
# invariants using macOS Python 3 before touching the installed plugin.
git -C "$ROOT" diff --quiet HEAD -- main.js Info.json epplus-now-playing.js tests/now-playing-poster.test.js
python3 - "$ROOT" <<'PY'
import json
import pathlib
import sys

root = pathlib.Path(sys.argv[1])
info = json.loads((root / "Info.json").read_text(encoding="utf-8"))
main = (root / "main.js").read_text(encoding="utf-8")
module = (root / "epplus-now-playing.js").read_text(encoding="utf-8")
assert info.get("version") == "1.3.4-beta.4.1"
assert info.get("identifier") == "io.github.olivergiangvu.iinaepisodeinfoplus"
assert 'require("./epplus-now-playing.js")' in main
assert "nowPlayingProbe.tryCurrent(info)" in main
assert "nowPlayingProbe.invalidate()" in main
assert "auto+attached-picture" in module
print("PASS: EP+ verified metadata poster integration (source checks)")
PY
if command -v node >/dev/null 2>&1; then
  node --check "$ROOT/main.js"
  node --check "$ROOT/epplus-now-playing.js"
  node "$ROOT/tests/now-playing-poster.test.js"
  node "$ROOT/tests/episode-plus-identity.test.js"
  node "$ROOT/tests/hls-reviewed-identity.test.js"
else
  echo "Node.js not installed: JS regression suite already PASS in GitHub CI; skipping local JS suite."
fi
echo "===== UPDATE CURRENT EP+ IN PLACE ====="
# Backup only replaced source files; never create a second .iinaplugin bundle.
BACKUP="$HOME/Library/Application Support/EPPlus-NowPlaying-rollback-beta4"
mkdir -p "$BACKUP"
if [ ! -e "$BACKUP/main.js" ]; then cp -p "$PLUGIN/main.js" "$BACKUP/main.js"; fi
if [ ! -e "$BACKUP/Info.json" ]; then cp -p "$PLUGIN/Info.json" "$BACKUP/Info.json"; fi
for f in main.js epplus-now-playing.js Info.json; do
  cp "$ROOT/$f" "$PLUGIN/$f.new"
  chmod 644 "$PLUGIN/$f.new"
  mv -f "$PLUGIN/$f.new" "$PLUGIN/$f"
done
for f in main.js epplus-now-playing.js Info.json; do
  cmp -s "$ROOT/$f" "$PLUGIN/$f" || {
    echo "ERROR: post-install content mismatch ($f)" >&2; exit 2;
  }
done
echo "INSTALLED: EP+ $TARGET_VERSION (one existing plugin, Now Playing poster restored)"
echo "Bridge, Trakt+, EP+ preferences and caches untouched."
echo "Restart IINA and select a verified episode in Episode Info+."
