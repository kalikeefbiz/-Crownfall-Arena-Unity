#!/usr/bin/env bash
set -euo pipefail

echo "[Crownfall Arena] Cloudflare Pages deployment starting..."

if [[ -z "${UNITY_PLAYER_PATH:-}" ]]; then
  echo "ERROR: UNITY_PLAYER_PATH is not set. This script must run as a Unity Build Automation post-build script."
  exit 1
fi
if [[ ! -d "$UNITY_PLAYER_PATH" ]]; then
  echo "ERROR: UNITY_PLAYER_PATH does not point to a directory: $UNITY_PLAYER_PATH"
  exit 1
fi
if [[ -z "${CLOUDFLARE_API_TOKEN:-}" ]]; then
  echo "WARNING: Missing CLOUDFLARE_API_TOKEN. Skipping deployment so a successful Unity export remains a successful build."
  exit 0
fi
if [[ -z "${CLOUDFLARE_ACCOUNT_ID:-}" ]]; then
  echo "WARNING: Missing CLOUDFLARE_ACCOUNT_ID. Skipping deployment so a successful Unity export remains a successful build."
  exit 0
fi

CLOUDFLARE_PAGES_PROJECT="${CLOUDFLARE_PAGES_PROJECT:-crownfall-arena}"
echo "[Crownfall Arena] Environment validation complete."

# Wrangler currently requires a modern Node runtime. Unity's Windows image is not
# guaranteed to expose NVM (Build #7 proved it does not), so use the following
# fail-safe order:
#   1. existing Node 22+
#   2. NVM if present
#   3. portable latest Node 22.x downloaded from nodejs.org on Windows
PORTABLE_NODE_HOME=""
node_major() {
  node --version 2>/dev/null | sed -E 's/^v([0-9]+).*/\1/'
}

if [[ "${CROWNFALL_FORCE_PORTABLE_NODE:-0}" != "1" ]] && command -v node >/dev/null 2>&1 && [[ "$(node_major)" =~ ^[0-9]+$ ]] && (( $(node_major) >= 22 )); then
  echo "[Crownfall Arena] Using existing Node $(node --version)."
else
  NVM_SCRIPT=""
  if [[ -n "${NVM_DIR:-}" && -f "${NVM_DIR}/nvm.sh" ]]; then
    NVM_SCRIPT="${NVM_DIR}/nvm.sh"
  elif [[ -f "$HOME/.nvm/nvm.sh" ]]; then
    NVM_SCRIPT="$HOME/.nvm/nvm.sh"
  fi

  if [[ "${CROWNFALL_FORCE_PORTABLE_NODE:-0}" != "1" && -n "$NVM_SCRIPT" ]]; then
    echo "[Crownfall Arena] Loading NVM and selecting Node 22..."
    set +u
    # shellcheck disable=SC1090
    source "$NVM_SCRIPT"
    nvm install 22
    nvm use 22
    set -u
  elif [[ "${BUILDER_OS:-}" == "WINDOWS" ]]; then
    echo "[Crownfall Arena] NVM unavailable; bootstrapping portable Node 22 for this build."
    command -v curl >/dev/null 2>&1 || { echo "ERROR: curl is unavailable."; exit 1; }
    command -v cygpath >/dev/null 2>&1 || { echo "ERROR: cygpath is unavailable."; exit 1; }
    command -v powershell.exe >/dev/null 2>&1 || { echo "ERROR: powershell.exe is unavailable."; exit 1; }

    NODE_CACHE="${TEMP:-${TMP:-$PWD}}/crownfall-node22"
    mkdir -p "$NODE_CACHE"

    SHASUMS="$(curl -fsSL https://nodejs.org/dist/latest-v22.x/SHASUMS256.txt)"
    NODE_ZIP="$(printf '%s\n' "$SHASUMS" | awk '/node-v22[^ ]*-win-x64\.zip$/ {print $2; exit}')"
    if [[ -z "$NODE_ZIP" ]]; then
      echo "ERROR: Could not resolve latest Node 22 Windows x64 package."
      exit 1
    fi

    NODE_DIR_NAME="${NODE_ZIP%.zip}"
    PORTABLE_NODE_HOME="$NODE_CACHE/$NODE_DIR_NAME"
    if [[ ! -f "$PORTABLE_NODE_HOME/node.exe" ]]; then
      NODE_ARCHIVE="$NODE_CACHE/$NODE_ZIP"
      echo "[Crownfall Arena] Downloading $NODE_ZIP..."
      curl -fsSL "https://nodejs.org/dist/latest-v22.x/$NODE_ZIP" -o "$NODE_ARCHIVE"
      WIN_ARCHIVE="$(cygpath -wa "$NODE_ARCHIVE")"
      WIN_CACHE="$(cygpath -wa "$NODE_CACHE")"
      powershell.exe -NoProfile -NonInteractive -Command "Expand-Archive -LiteralPath '$WIN_ARCHIVE' -DestinationPath '$WIN_CACHE' -Force"
    fi
    if [[ ! -f "$PORTABLE_NODE_HOME/node.exe" ]]; then
      echo "ERROR: Portable Node extraction did not produce node.exe."
      exit 1
    fi
    export PATH="$PORTABLE_NODE_HOME:$PATH"
  else
    echo "ERROR: Node 22+ is unavailable and this non-Windows builder has no NVM fallback."
    exit 1
  fi
fi

echo "[Crownfall Arena] node: $(node --version)"
if (( $(node_major) < 22 )); then
  echo "ERROR: Node 22+ bootstrap failed."
  exit 1
fi

run_wrangler() {
  if [[ -n "$PORTABLE_NODE_HOME" ]]; then
    # node.exe is a native Windows executable. Convert the JS entry path as well;
    # otherwise Git Bash passes /cygdrive/... and Node interprets it as C:\\cygdrive\\...
    # (the exact Build #8 failure).
    command -v cygpath >/dev/null 2>&1 || { echo "ERROR: cygpath is unavailable for portable Node."; return 1; }
    local node_exe_win npx_cli_win
    node_exe_win="$(cygpath -wa "$PORTABLE_NODE_HOME/node.exe")"
    npx_cli_win="$(cygpath -wa "$PORTABLE_NODE_HOME/node_modules/npm/bin/npx-cli.js")"
    "$PORTABLE_NODE_HOME/node.exe" "$npx_cli_win" --yes wrangler@latest "$@"
  else
    command -v npx >/dev/null 2>&1 || { echo "ERROR: npx is unavailable."; return 1; }
    npx --yes wrangler@latest "$@"
  fi
}

PLAYER_PATH="$UNITY_PLAYER_PATH"
if [[ "${BUILDER_OS:-}" == "WINDOWS" ]]; then
  command -v cygpath >/dev/null 2>&1 || { echo "ERROR: Windows builder detected but cygpath is unavailable."; exit 1; }
  PLAYER_PATH="$(cygpath -wa "$UNITY_PLAYER_PATH")"
fi

echo "[Crownfall Arena] Builder OS: ${BUILDER_OS:-unknown}"
echo "[Crownfall Arena] Player path: $PLAYER_PATH"
echo "[Crownfall Arena] Pages project: $CLOUDFLARE_PAGES_PROJECT"

cat > "$UNITY_PLAYER_PATH/_headers" <<'EOF'
/Build/*.wasm.br
  Content-Type: application/wasm
  Content-Encoding: br

/Build/*.js.br
  Content-Type: application/javascript
  Content-Encoding: br

/Build/*.data.br
  Content-Type: application/octet-stream
  Content-Encoding: br

/Build/*.symbols.json.br
  Content-Type: application/json
  Content-Encoding: br

/Build/*.wasm.gz
  Content-Type: application/wasm
  Content-Encoding: gzip

/Build/*.js.gz
  Content-Type: application/javascript
  Content-Encoding: gzip

/Build/*.data.gz
  Content-Type: application/octet-stream
  Content-Encoding: gzip

/Build/*.symbols.json.gz
  Content-Type: application/json
  Content-Encoding: gzip

/*
  X-Content-Type-Options: nosniff
EOF

if [[ "${CROWNFALL_DEPLOY_DRY_RUN:-0}" == "1" ]]; then
  echo "[Crownfall Arena] DRY RUN: validating Wrangler invocation without Cloudflare API calls..."
  run_wrangler --version
  echo "[Crownfall Arena] DRY RUN: Node/bootstrap/path/header/Wrangler checks passed; skipping Cloudflare API calls and upload."
  exit 0
fi

# Cloudflare Pages rejects any individual asset over 25 MiB. A deployment problem
# must never invalidate an otherwise successful Unity player export, because Unity
# Build Automation only preserves artifacts for successful builds.
PAGES_MAX_BYTES=26214400
OVERSIZED_FILES=""
while IFS= read -r -d '' candidate; do
  size_bytes="$(wc -c < "$candidate" | tr -d '[:space:]')"
  if [[ "$size_bytes" =~ ^[0-9]+$ ]] && (( size_bytes > PAGES_MAX_BYTES )); then
    OVERSIZED_FILES+="$candidate ($size_bytes bytes)"$'\n'
  fi
done < <(find "$UNITY_PLAYER_PATH" -type f -print0)

if [[ -n "$OVERSIZED_FILES" ]]; then
  echo "WARNING: Cloudflare Pages deployment skipped because these assets exceed the 25 MiB per-file limit:"
  printf '%s' "$OVERSIZED_FILES"
  echo "WARNING: Unity export succeeded; preserving build success/artifacts. Deploy large WebGL assets through a host that supports them (for example R2) in a separate deployment step."
  exit 0
fi

# Deployment is intentionally non-fatal. Hosting must not decide Unity build success.
echo "[Crownfall Arena] Verifying Cloudflare Pages access..."
PROJECTS_JSON="$(run_wrangler pages project list --json)"
if ! printf '%s\n' "$PROJECTS_JSON" | grep -Eq "\"name\"[[:space:]]*:[[:space:]]*\"$CLOUDFLARE_PAGES_PROJECT\""; then
  echo "[Crownfall Arena] Pages project does not exist; creating $CLOUDFLARE_PAGES_PROJECT..."
  run_wrangler pages project create "$CLOUDFLARE_PAGES_PROJECT" --production-branch main
else
  echo "[Crownfall Arena] Existing Pages project found."
fi

echo "[Crownfall Arena] Deploying WebGL output to Cloudflare Pages..."
run_wrangler pages deploy "$PLAYER_PATH" \
  --project-name "$CLOUDFLARE_PAGES_PROJECT" \
  --branch main

echo "[Crownfall Arena] Cloudflare Pages deployment complete."
