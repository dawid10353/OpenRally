#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# OpenRally Android APK Build & Dual Export Script
# ==============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "=== [1/5] Configuring Build Environment ==="
# Load NVM for non-interactive shell sessions if available
export NVM_DIR="$HOME/.nvm"
if [ -s "$NVM_DIR/nvm.sh" ]; then
  # shellcheck source=/dev/null
  \. "$NVM_DIR/nvm.sh"
fi

# Configure Java and Android SDK paths dynamically without hardcoded usernames
export JAVA_HOME="${JAVA_HOME:-/usr/lib/jvm/java-21-openjdk-amd64}"
export ANDROID_HOME="${ANDROID_HOME:-${HOME}/android-sdk}"
export ANDROID_SDK_ROOT="${ANDROID_SDK_ROOT:-${HOME}/android-sdk}"
export PATH="$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/build-tools/35.0.0:$JAVA_HOME/bin:$PATH"

echo "Node version:    $(node -v 2>/dev/null || echo 'not found')"
echo "Java version:    $(java -version 2>&1 | head -n 1)"
echo "Android SDK:     $ANDROID_HOME"

echo "=== [2/5] Building Web Assets (Vite + TS) ==="
npm run build

echo "=== [3/5] Syncing Capacitor Android Project ==="
npx cap sync android

echo "=== [4/5] Compiling Android APK with Gradle ==="
cd "$SCRIPT_DIR/android"
./gradlew assembleDebug
cd "$SCRIPT_DIR"

SOURCE_APK="$SCRIPT_DIR/android/app/build/outputs/apk/debug/app-debug.apk"
if [ ! -f "$SOURCE_APK" ] || [ ! -s "$SOURCE_APK" ]; then
  echo "ERROR: Compiled APK not found or empty at: $SOURCE_APK" >&2
  exit 1
fi
echo "Compiled APK created: $SOURCE_APK ($(stat -c%s "$SOURCE_APK") bytes)"

echo "=== [5/5] Dual Exporting APK Binary ==="
# Destination 1: Optional Windows user directory (resolved dynamically in WSL with zero hardcoded user paths)
WIN_DEST_DIR=""
if [ -n "${WIN_APK_DIR:-}" ]; then
  WIN_DEST_DIR="$WIN_APK_DIR"
elif command -v cmd.exe >/dev/null 2>&1 && command -v wslpath >/dev/null 2>&1; then
  WIN_USER_PROFILE="$(cmd.exe /c "echo %USERPROFILE%" 2>/dev/null | tr -d '\r\n' || true)"
  if [ -n "$WIN_USER_PROFILE" ]; then
    RESOLVED_WIN_PATH="$(wslpath "$WIN_USER_PROFILE/Documents/OpenRally" 2>/dev/null || true)"
    if [ -n "$RESOLVED_WIN_PATH" ]; then
      WIN_DEST_DIR="$RESOLVED_WIN_PATH"
    fi
  fi
fi

DEST_WIN=""
if [ -n "$WIN_DEST_DIR" ]; then
  mkdir -p "$WIN_DEST_DIR"
  DEST_WIN="$WIN_DEST_DIR/OpenRally.apk"
  cp -f "$SOURCE_APK" "$DEST_WIN"
  echo "✓ Exported to Destination 1 (Windows Host): $DEST_WIN ($(stat -c%s "$DEST_WIN") bytes)"
else
  echo "ℹ Windows export destination not available in current environment. Skipping Destination 1."
fi

# Destination 2: Project dist directory (dist/openrally.apk)
DEST_DIST="$SCRIPT_DIR/dist/openrally.apk"
mkdir -p "$SCRIPT_DIR/dist"
cp -f "$SOURCE_APK" "$DEST_DIST"
echo "✓ Exported to Destination 2 (Dist Folder):  $DEST_DIST ($(stat -c%s "$DEST_DIST") bytes)"

echo "=== Build & Dual Export Completed Successfully! ==="
if [ -n "$DEST_WIN" ] && [ -f "$DEST_WIN" ]; then
  ls -lh "$SOURCE_APK" "$DEST_DIST" "$DEST_WIN"
else
  ls -lh "$SOURCE_APK" "$DEST_DIST"
fi
