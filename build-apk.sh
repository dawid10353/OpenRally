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

# Configure Java and Android SDK paths
export JAVA_HOME="${JAVA_HOME:-/usr/lib/jvm/java-21-openjdk-amd64}"
export ANDROID_HOME="${ANDROID_HOME:-/home/dawid/android-sdk}"
export ANDROID_SDK_ROOT="${ANDROID_SDK_ROOT:-/home/dawid/android-sdk}"
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
# Destination 1: Windows user directory (C:\Users\dawid\Documents\OpenRally\OpenRally.apk)
WIN_DEST_DIR="${WIN_APK_DIR:-/mnt/c/Users/dawid/Documents/OpenRally}"
DEST_WIN="$WIN_DEST_DIR/OpenRally.apk"

if [ -d "$WIN_DEST_DIR" ]; then
  mkdir -p "$WIN_DEST_DIR"
  cp -f "$SOURCE_APK" "$DEST_WIN"
  echo "✓ Exported to Destination 1 (Windows Host): $DEST_WIN ($(stat -c%s "$DEST_WIN") bytes)"
else
  echo "WARNING: Windows mount directory not found at $WIN_DEST_DIR. Skipping Destination 1."
fi

# Destination 2: Project dist directory (dist/openrally.apk)
DEST_DIST="$SCRIPT_DIR/dist/openrally.apk"
mkdir -p "$SCRIPT_DIR/dist"
cp -f "$SOURCE_APK" "$DEST_DIST"
echo "✓ Exported to Destination 2 (Dist Folder):  $DEST_DIST ($(stat -c%s "$DEST_DIST") bytes)"

echo "=== Build & Dual Export Completed Successfully! ==="
ls -lh "$SOURCE_APK" "$DEST_DIST" "${DEST_WIN:-}"
