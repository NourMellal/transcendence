#!/bin/bash

# ========================================
# Transcendence - Automatic Setup Script
# ========================================
# This script sets up the entire project automatically
# Your teammates just run: bash setup.sh

set -e  # Exit on any error

echo "=========================================="
echo "🚀 Transcendence - Automatic Setup"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# ========================================
# Step 1: Check Prerequisites
# ========================================
echo -e "${BLUE}📋 Step 1: Checking prerequisites...${NC}"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    echo "Please install Node.js v18+ from https://nodejs.org/"
    exit 1
fi
NODE_VERSION=$(node -v)
echo -e "${GREEN}✅ Node.js ${NODE_VERSION}${NC}"

# Check pnpm
if ! command -v pnpm &> /dev/null; then
    echo -e "${YELLOW}⚠️  pnpm not found. Installing pnpm...${NC}"
    npm install -g pnpm
fi
PNPM_VERSION=$(pnpm -v)
echo -e "${GREEN}✅ pnpm ${PNPM_VERSION}${NC}"

# Check Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed${NC}"
    echo "Please install Docker from https://www.docker.com/"
    exit 1
fi
echo -e "${GREEN}✅ Docker installed${NC}"

# Check if Docker is running
if ! docker info &> /dev/null; then
    echo -e "${RED}❌ Docker is not running${NC}"
    echo "Please start Docker and try again"
    exit 1
fi
echo -e "${GREEN}✅ Docker is running${NC}"

echo ""

# ========================================
# Step 2: Setup Environment File
# ========================================
echo -e "${BLUE}📝 Step 2: Setting up environment file...${NC}"

if [ -f ".env" ]; then
    echo -e "${YELLOW}⚠️  .env file already exists${NC}"
    read -p "Do you want to overwrite it? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${GREEN}✅ Using existing .env file${NC}"
    else
        cp .env.example .env
        echo -e "${GREEN}✅ Created .env from .env.example${NC}"
    fi
else
    cp .env.example .env
    echo -e "${GREEN}✅ Created .env from .env.example${NC}"
fi

echo ""

# ========================================
# Step 3: Install Dependencies
# ========================================
echo -e "${BLUE}📦 Step 3: Installing dependencies...${NC}"
echo "This may take a few minutes..."

pnpm install

echo -e "${GREEN}✅ Dependencies installed${NC}"
echo ""

# ========================================
# Step 4: Start Vault Container
# ========================================
echo -e "${BLUE}🔐 Step 4: Starting HashiCorp Vault...${NC}"

# Check if vault-dev container already exists
if docker ps -a --format '{{.Names}}' | grep -q '^vault-dev$'; then
    echo -e "${YELLOW}⚠️  Vault container already exists${NC}"
    
    # Check if it's running
    if docker ps --format '{{.Names}}' | grep -q '^vault-dev$'; then
        echo -e "${GREEN}✅ Vault is already running${NC}"
    else
        echo "Starting existing Vault container..."
        docker start vault-dev
        echo -e "${GREEN}✅ Vault started${NC}"
    fi
else
    echo "Creating and starting Vault container..."
    docker run -d \
        --name vault-dev \
        --cap-add=IPC_LOCK \
        -e VAULT_DEV_ROOT_TOKEN_ID=dev-root-token \
        -e VAULT_DEV_LISTEN_ADDRESS=0.0.0.0:8200 \
        -p 8200:8200 \
        hashicorp/vault:1.18 server -dev
    
    echo -e "${GREEN}✅ Vault container created and started${NC}"
fi

# Wait for Vault to be ready
echo "Waiting for Vault to be ready..."
for i in {1..30}; do
    if curl -s http://localhost:8200/v1/sys/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Vault is ready!${NC}"
        break
    fi
    
    if [ $i -eq 30 ]; then
        echo -e "${RED}❌ Vault failed to start${NC}"
        echo "Please check Docker logs: docker logs vault-dev"
        exit 1
    fi
    
    sleep 1
done

echo ""

# ========================================
# Step 5: Initialize Vault with Secrets
# ========================================
echo -e "${BLUE}🔑 Step 5: Setting up Vault secrets...${NC}"

export VAULT_ADDR=http://localhost:8200
export VAULT_TOKEN=dev-root-token

# Run the setup script
bash infrastructure/vault/scripts/setup-secrets-dev.sh

echo -e "${GREEN}✅ Vault secrets configured${NC}"
echo ""

# ========================================
# Step 6: Validate Vault Integration
# ========================================
echo -e "${BLUE}🧪 Step 6: Validating Vault integration...${NC}"

bash infrastructure/vault/scripts/validate-integration.sh

echo ""

# ========================================
# Step 7: Start Redis (if needed)
# ========================================
echo -e "${BLUE}🗄️  Step 7: Checking Redis...${NC}"

if docker ps --format '{{.Names}}' | grep -q 'redis'; then
    echo -e "${GREEN}✅ Redis is already running${NC}"
else
    echo "Starting Redis container..."
    docker run -d \
        --name redis-dev \
        -p 6379:6379 \
        redis:7-alpine
    
    echo -e "${GREEN}✅ Redis started${NC}"
fi

echo ""

# ========================================
# Setup Complete!
# ========================================
echo "=========================================="
echo -e "${GREEN}🎉 Setup Complete!${NC}"
echo "=========================================="
echo ""
echo "Your Transcendence project is ready to use!"
echo ""
echo -e "${BLUE}To start all services:${NC}"
echo "  pnpm run dev:all"
echo ""
echo -e "${BLUE}To stop all services:${NC}"
echo "  Press Ctrl+C or run: ./stop-services.bat (Windows) or pkill -f tsx (Linux/Mac)"
echo ""
echo -e "${BLUE}To stop Docker containers:${NC}"
echo "  docker stop vault-dev redis-dev"
echo ""
echo -e "${BLUE}Useful commands:${NC}"
echo "  • Check Vault status: curl http://localhost:8200/v1/sys/health"
echo "  • Validate Vault: bash infrastructure/vault/scripts/validate-integration.sh"
echo "  • View logs: Check the logs/ directory"
echo ""
echo -e "${YELLOW}📚 For more information, see:${NC}"
echo "  • README.md - Project overview"
echo "  • VAULT_EXPLANATION.md - How Vault works in this project"
echo "  • docs/DEVELOPMENT_GUIDE.md - Development guide"
echo ""
echo "Happy coding! 🚀"
echo ""
