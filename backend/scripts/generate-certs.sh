#!/bin/bash
# ============================================
# GENERATE mTLS CERTIFICATES (OpenSSL)
# ============================================
# Run from backend/ directory: ./scripts/generate-certs.sh

set -e

CERT_DIR="./certs"
mkdir -p "$CERT_DIR"

# 1. Generate CA private key and self-signed certificate
echo "🔐 Generating CA..."
openssl genrsa -out "$CERT_DIR/ca.key" 4096
openssl req -new -x509 -days 3650 -key "$CERT_DIR/ca.key" \
	-out "$CERT_DIR/ca.crt" \
	-subj "/C=AR/O=CryptoInvestor/CN=CryptoInvestor Root CA"

# 2. Generate server private key and CSR
echo "🔐 Generating server certificate..."
openssl genrsa -out "$CERT_DIR/server.key" 4096
openssl req -new -key "$CERT_DIR/server.key" \
	-out "$CERT_DIR/server.csr" \
	-subj "/C=AR/O=CryptoInvestor/CN=api.cryptoinvestor.local"

# Sign server cert with CA
openssl x509 -req -in "$CERT_DIR/server.csr" \
	-CA "$CERT_DIR/ca.crt" -CAkey "$CERT_DIR/ca.key" \
	-CAcreateserial -out "$CERT_DIR/server.crt" -days 365

# 3. Generate robot client private key and CSR
echo "🔐 Generating robot client certificate..."
openssl genrsa -out "$CERT_DIR/robot.key" 4096
openssl req -new -key "$CERT_DIR/robot.key" \
	-out "$CERT_DIR/robot.csr" \
	-subj "/C=AR/O=CryptoInvestor/CN=robot.cryptoinvestor.local"

# Sign robot cert with CA
openssl x509 -req -in "$CERT_DIR/robot.csr" \
	-CA "$CERT_DIR/ca.crt" -CAkey "$CERT_DIR/ca.key" \
	-CAcreateserial -out "$CERT_DIR/robot.crt" -days 365

# Cleanup CSRs
rm -f "$CERT_DIR"/*.csr "$CERT_DIR"/*.srl

# Set restrictive permissions (read-only for owner)
chmod 600 "$CERT_DIR"/*.key
chmod 644 "$CERT_DIR"/*.crt

echo "✅ Certificates generated in $CERT_DIR/"
echo ""
echo "Files:"
ls -la "$CERT_DIR"
