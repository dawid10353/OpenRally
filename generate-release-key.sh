#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# OpenRally Release Keystore Generator Helper
# Creates a secure RSA 4096 / SHA256 release keystore for Google Play signing.
# ==============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
KEYSTORE_PATH="$SCRIPT_DIR/android/openrally-release.jks"
KEY_ALIAS="openrally"

echo "=== OpenRally Release Keystore Generator ==="

if [ -f "$KEYSTORE_PATH" ]; then
  echo "⚠️ Keystore already exists at: $KEYSTORE_PATH"
  echo "To regenerate, move or delete the existing file first."
  exit 0
fi

echo "Generating release keystore at: $KEYSTORE_PATH"
echo "Alias: $KEY_ALIAS"
echo ""

KEYTOOL_BIN="keytool"
if [ -n "${JAVA_HOME:-}" ] && [ -x "$JAVA_HOME/bin/keytool" ]; then
  KEYTOOL_BIN="$JAVA_HOME/bin/keytool"
fi

# Generate keystore with 10,000 days validity (27+ years)
"$KEYTOOL_BIN" -genkeypair \
  -v \
  -keystore "$KEYSTORE_PATH" \
  -alias "$KEY_ALIAS" \
  -keyalg RSA \
  -keysize 4096 \
  -validity 10000 \
  -storetype PKCS12

echo ""
echo "✓ Keystore generated successfully at: $KEYSTORE_PATH"
echo ""
echo "=== How to configure for Google Play builds ==="
echo "Set the following environment variables (or export them in your CI/shell):"
echo "  export OPENRALLY_RELEASE_KEYSTORE=\"$KEYSTORE_PATH\""
echo "  export OPENRALLY_KEYSTORE_PASSWORD=\"<your_password>\""
echo "  export OPENRALLY_KEY_ALIAS=\"$KEY_ALIAS\""
echo "  export OPENRALLY_KEY_PASSWORD=\"<your_password>\""
echo ""
echo "Then build your release bundle:"
echo "  npm run build:bundle"
echo ""
