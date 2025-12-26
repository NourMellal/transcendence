#!/bin/bash
set -e

# Script to generate self-signed SSL certificates for local development
# These certificates are used by the Nginx reverse proxy

CERT_DIR="infrastructure/nginx/certs"
DAYS_VALID=365

echo "Setting up SSL certificates for local development..."

# Create certs directory if it doesn't exist
mkdir -p "$CERT_DIR"

# Check if certificates already exist
if [ -f "$CERT_DIR/fullchain.pem" ] && [ -f "$CERT_DIR/privkey.pem" ]; then
  read -p "Certificates already exist. Regenerate? (y/N): " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Using existing certificates."
    exit 0
  fi
fi

# Generate self-signed certificate
echo "Generating self-signed certificate..."
openssl req -x509 -nodes -days "$DAYS_VALID" -newkey rsa:2048 \
  -keyout "$CERT_DIR/privkey.pem" \
  -out "$CERT_DIR/fullchain.pem" \
  -subj "/C=US/ST=State/L=City/O=Development/CN=localhost" \
  -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"

# Set appropriate permissions
chmod 600 "$CERT_DIR/privkey.pem"
chmod 644 "$CERT_DIR/fullchain.pem"

echo "✓ SSL certificates generated successfully!"
echo "  Certificate: $CERT_DIR/fullchain.pem"
echo "  Private Key: $CERT_DIR/privkey.pem"
echo "  Valid for: $DAYS_VALID days"
echo ""
echo "Note: These are self-signed certificates for development only."
echo "Your browser will show a security warning - this is normal for dev."
