#!/bin/bash

# Meteora Meme Pool Strategy Installation Script
# This script sets up the project for development and production use

set -e

echo "🚀 Installing Meteora Meme Pool Strategy..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node --version | cut -d'v' -f2)
REQUIRED_VERSION="18.0.0"

if [[ "$(printf '%s\n' "$REQUIRED_VERSION" "$NODE_VERSION" | sort -V | head -n1)" != "$REQUIRED_VERSION" ]]; then
    echo "❌ Node.js version $NODE_VERSION is too old. Please install Node.js 18+ first."
    exit 1
fi

echo "✅ Node.js version $NODE_VERSION detected"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Create required directories
echo "📁 Creating required directories..."
mkdir -p logs
mkdir -p config

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "🔧 Creating .env file..."
    cat > .env << EOF
# Solana RPC Configuration
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
SOLANA_WS_URL=wss://api.mainnet-beta.solana.com/

# Wallet Configuration (base58 encoded private key)
PRIVATE_KEY=your_base58_private_key_here

# API Keys (optional but recommended)
COINGECKO_API_KEY=your_coingecko_api_key
DUNE_API_KEY=your_dune_api_key

# Strategy Configuration
CONFIG_FILE=config/strategy.json
LOG_LEVEL=info
REBALANCE_INTERVAL=7d
EOF
    echo "✅ .env file created. Please edit it with your configuration."
else
    echo "✅ .env file already exists"
fi

# Build the project
echo "🔨 Building the project..."
npm run build

echo "✅ Installation completed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Edit .env with your private key and API keys"
echo "2. Review and customize config/strategy.json"
echo "3. Run 'npm start' to launch the strategy"
echo ""
echo "⚠️  Important reminders:"
echo "- Never commit your private key to version control"
echo "- Start with small amounts for testing"
echo "- Monitor your positions closely"
echo "- Read the documentation thoroughly"
echo ""
echo "🎯 Happy fee harvesting!" 