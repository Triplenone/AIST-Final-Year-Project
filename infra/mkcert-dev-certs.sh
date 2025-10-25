#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/mosquitto/certs"
if ! command -v mkcert >/dev/null 2>&1; then
  echo "mkcert is required. Install from https://github.com/FiloSottile/mkcert"
  exit 1
fi
mkcert -install
mkcert -cert-file server.crt -key-file server.key localhost 127.0.0.1 ::1 mqtt
cp "$(mkcert -CAROOT)/rootCA.pem" ca.crt
