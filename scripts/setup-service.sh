#!/bin/bash

# ========================================
# User Service - Pre-Flight Setup Script
# ========================================
# Run this before `pnpm dev` to ensure everything is ready
# Usage: bash setup-service.sh

set -e  # Exit on any error

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "=========================================="
echo "🔧 User Service - Pre-Flight Setup"
echo "=========================================="
echo ""

# ========================================
# Step 1: Check Environment File
# ========================================
echo -e "${BLUE}📝 Step 1: Checking environment file...${NC}"

SERVICE_ENV="services/user-service/.env"
SERVICE_ENV_EXAMPLE="services/user-service/.env.example"

if [ ! -f "$SERVICE_ENV" ]; then
    if [ -f "$SERVICE_ENV_EXAMPLE" ]; then
        cp "$SERVICE_ENV_EXAMPLE" "$SERVICE_ENV"
        # Fix line endings (Windows CRLF to Unix LF)
        sed -i 's/\r$//' "$SERVICE_ENV" 2>/dev/null || true
        echo -e "${GREEN}✅ Created .env from .env.example${NC}"
        echo -e "${YELLOW}⚠️  Please review .env file and update if needed${NC}"
    else
        echo -e "${RED}❌ .env.example file not found${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✅ .env file exists${NC}"
    # Fix line endings if needed
    sed -i 's/\r$//' "$SERVICE_ENV" 2>/dev/null || true
fi

# Load environment variables
cd services/user-service
source .env
cd - > /dev/null

echo ""

# ========================================
# Step 2: Check Vault Connection
# ========================================
echo -e "${BLUE}🔐 Step 2: Checking Vault connection...${NC}"

VAULT_ADDR=${VAULT_ADDR:-http://localhost:8200}

# Check if Vault is running
if ! curl -s "${VAULT_ADDR}/v1/sys/health" > /dev/null 2>&1; then
    echo -e "${RED}❌ Vault is not accessible at ${VAULT_ADDR}${NC}"
    echo ""
    echo "Starting Vault with Docker..."

    docker compose up -d vault
    echo -e "${GREEN}✅ Vault container started via docker compose${NC}"

    # Wait for Vault to be ready
    echo "Waiting for Vault to be ready..."
    for i in {1..30}; do
        if curl -s "${VAULT_ADDR}/v1/sys/health" > /dev/null 2>&1; then
            echo -e "${GREEN}✅ Vault is ready!${NC}"
            break
        fi

        if [ $i -eq 30 ]; then
            echo -e "${RED}❌ Vault failed to start${NC}"
            exit 1
        fi

        sleep 1
    done
else
    echo -e "${GREEN}✅ Vault is accessible${NC}"
fi

echo ""

# ========================================
# Step 3: Check Vault Secrets
# ========================================
echo -e "${BLUE}🔑 Step 3: Checking Vault secrets...${NC}"

VAULT_TOKEN=${VAULT_TOKEN:-dev-root-token}

# Check if JWT secrets exist
if curl -s -H "X-Vault-Token: ${VAULT_TOKEN}" \
    "${VAULT_ADDR}/v1/secret/data/jwt/auth" 2>/dev/null | grep -q "secret"; then
    echo -e "${GREEN}✅ JWT secrets already exist in Vault${NC}"
else
    echo -e "${YELLOW}⚠️  JWT secrets not found${NC}"
    echo -e "${YELLOW}   Run from project root: bash infrastructure/vault/simple-setup.sh${NC}"
fi

echo ""

# ========================================
# Step 4: Check Database Directory
# ========================================
echo -e "${BLUE}🗄️  Step 4: Checking database directory...${NC}"

DB_PATH=${DB_PATH:-./data/users.db}
DB_DIR=$(dirname "$DB_PATH")

if [ ! -d "$DB_DIR" ]; then
    mkdir -p "$DB_DIR"
    echo -e "${GREEN}✅ Created database directory: ${DB_DIR}${NC}"
else
    echo -e "${GREEN}✅ Database directory exists${NC}"
fi

echo ""

# ========================================
# Step 5: Verify Dependencies
# ========================================
echo -e "${BLUE}📦 Step 5: Verifying dependencies...${NC}"

if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}⚠️  Dependencies not installed${NC}"
    echo "Installing dependencies..."
    pnpm install
    echo -e "${GREEN}✅ Dependencies installed${NC}"
else
    echo -e "${GREEN}✅ Dependencies are installed${NC}"
fi

echo ""

# ========================================
# Step 6: Port Check
# ========================================
echo -e "${BLUE}🔌 Step 6: Checking port availability...${NC}"

SERVICE_PORT=${USER_SERVICE_PORT:-3001}

if lsof -Pi :${SERVICE_PORT} -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Port ${SERVICE_PORT} is already in use${NC}"
    echo "Please stop the service using this port or change USER_SERVICE_PORT in .env"

    # Show what's using the port
    echo ""
    echo "Process using port ${SERVICE_PORT}:"
    lsof -Pi :${SERVICE_PORT} -sTCP:LISTEN
else
    echo -e "${GREEN}✅ Port ${SERVICE_PORT} is available${NC}"
fi

echo ""

# ========================================
# Setup Complete!
# ========================================
echo "=========================================="
echo -e "${GREEN}✅ Pre-Flight Checks Complete!${NC}"
echo "=========================================="
echo ""
echo "Your User Service is ready to start!"
echo ""
echo -e "${BLUE}To start the service:${NC}"
echo "  pnpm dev"
echo ""
echo -e "${BLUE}To run tests:${NC}"
echo "  node test/integration/test-user-service-auth.js"
echo ""
echo -e "${BLUE}Environment Summary:${NC}"
echo "  • Service Port: ${SERVICE_PORT}"
echo "  • Vault Address: ${VAULT_ADDR}"
echo "  • Database Path: ${DB_PATH}"
echo "  • Node Environment: ${NODE_ENV:-development}"
echo ""
echo "Happy coding! 🚀"
echo ""
