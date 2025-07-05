# Meteora Meme Pool Fee Harvest Strategy

A sophisticated automated strategy for harvesting fees from Solana meme token pools using Meteora's Dynamic Liquidity Market Maker (DLMM).

## 🎯 Overview

This strategy implements the meme-pool fee-harvest methodology described in the requirements, focusing on:

- **Fee Farming over Directional Betting**: Capture fees from volatile meme tokens without taking directional risk
- **Diversified Risk Management**: Spread risk across multiple uncorrelated meme tokens
- **Automated Rebalancing**: Leverage Solana's low transaction costs for frequent optimization
- **Risk Controls**: Implement hard stops and monitoring for tail risk events

## 📋 Features

### Core Strategy Components
- ✅ **Token Screening**: Filter tokens by market cap, volume, age, and social activity
- ✅ **Volatility Matching**: Automatically match fee tiers to token volatility
- ✅ **Dual-Range CLMM**: Core (15%) and outer (40%) liquidity bands
- ✅ **Auto-Compounding**: Reinvest fees weekly with optimal rebalancing
- ✅ **Risk Management**: Hard stops, liquidity monitoring, social sentiment tracking

### Technical Features
- 🔧 **JSON Configuration**: Flexible strategy parameters via config file
- 📊 **Real-time Monitoring**: Comprehensive metrics and logging
- 🔄 **Automated Rebalancing**: Scheduled and threshold-based position management
- 🚨 **Emergency Controls**: Manual intervention and emergency stops
- 📈 **Performance Tracking**: APR calculation, IL monitoring, fee collection

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Solana wallet with SOL for gas fees
- API key for Birdeye (recommended for comprehensive data)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd meteora-meme-strategy

# Install dependencies
npm install

# Copy and configure environment variables
cp .env.example .env
# Edit .env with your configuration

# Build the project
npm run build
```

### Configuration

Edit `config/strategy.json` to customize your strategy:

```json
{
  "strategy": {
    "name": "Meme Pool Fee Harvest",
    "maxPositions": 5,
    "capitalPerPool": 0.05,
    "rebalanceInterval": "7d"
  },
  "filters": {
    "minMarketCap": 200000000,
    "minVolumeRatio": 0.15,
    "minAge": 60
  },
  "tokens": [
    {
      "symbol": "BONK",
      "mint": "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
      "enabled": true
    }
  ]
}
```

### Running the Strategy

```bash
# Start the strategy
npm start

# Or run in development mode
npm run dev

# Run with custom config
CONFIG_FILE=./my-config.json npm start
```

## 📊 Strategy Logic

### 1. Token Universe → Shortlist
- Pull current "Solana Meme" tokens from screeners
- Apply filters:
  - **Market Cap ≥ $200M**: Reduces blow-up risk
  - **24h Volume ≥ 15% of market cap**: Ensures constant fee flow
  - **Age > 60 days**: Avoid very new tokens
  - **Active social presence**: Twitter/GitHub activity

### 2. Volatility & Fee Tier Matching
- Calculate 7-day realized volatility from price data
- Match to appropriate fee tiers:
  - σ < 5% → 0.05% fee tier
  - 5% ≤ σ < 15% → 0.30% fee tier
  - σ ≥ 15% → 1.00% fee tier

### 3. Position Sizing & Range Design
- **Portfolio Level**: Max 5% capital per pool
- **Pool Level**: Two overlapping ranges
  - **Core Band**: ±15% (60% of liquidity)
  - **Outer Band**: ±40% (40% of liquidity)
- **Rebalance Triggers**: Price exits 80% of core band OR 7 days elapsed

### 4. Risk Management
- **Hard Stops**: 
  - 40% drop in 24h
  - 70% drop from ATH
- **Liquidity Monitoring**: Exit if on-chain depth < 30% of 14-day average
- **Social Sentiment**: Monitor Twitter activity for early warning

## 🔧 Configuration Reference

### Strategy Parameters
```json
{
  "strategy": {
    "name": "Strategy name",
    "maxPositions": 5,              // Max concurrent positions
    "capitalPerPool": 0.05,         // 5% of capital per pool
    "rebalanceInterval": "7d"       // Rebalance frequency
  }
}
```

### Screening Filters
```json
{
  "filters": {
    "minMarketCap": 200000000,      // $200M minimum market cap
    "minVolumeRatio": 0.15,         // 15% volume/mcap ratio
    "minAge": 60,                   // 60 days minimum age
    "requiredSocial": true          // Require social activity
  }
}
```

### Risk Management
```json
{
  "riskManagement": {
    "hardStop": {
      "dailyDrop": 0.4,             // 40% daily drop limit
      "athDrop": 0.7                // 70% from ATH limit
    },
    "liquidityDrain": {
      "threshold": 0.3,             // 30% liquidity threshold
      "period": 14                  // 14-day lookback
    }
  }
}
```

## 📈 Performance Monitoring

### Metrics Dashboard
The strategy tracks comprehensive metrics:

```typescript
interface StrategyMetrics {
  totalValueLocked: number;         // Total capital deployed
  totalFeesEarned: number;          // Cumulative fees collected
  totalImpermanentLoss: number;     // Total IL experienced
  netAPR: number;                   // Net APR after IL
  activePositions: number;          // Current position count
  rebalanceCount: number;           // Total rebalances executed
  lastUpdate: Date;                 // Last metrics update
}
```

### Logging
All activities are logged with different levels:
- **INFO**: Strategy execution, position changes
- **WARN**: Risk alerts, rebalancing needs
- **ERROR**: Failures, exceptions
- **DEBUG**: Detailed technical information

## 🔐 Security Considerations

### Private Key Management
- Store private keys securely (use hardware wallets in production)
- Never commit private keys to version control
- Use environment variables for sensitive data

### Risk Controls
- Start with small amounts for testing
- Monitor positions closely during initial runs
- Set appropriate risk limits in configuration
- Use emergency stop functionality if needed

## 🛠️ Development

### Project Structure
```
src/
├── types/              # TypeScript type definitions
├── providers/          # Data providers (Jupiter, Birdeye, etc.)
├── managers/           # Position and risk managers
├── utils/              # Utilities (logger, etc.)
├── strategy.ts         # Main strategy implementation
└── index.ts           # Entry point

config/
└── strategy.json      # Strategy configuration

logs/                  # Application logs
```

### Building and Testing
```bash
# Build TypeScript
npm run build

# Run tests (when available)
npm test

# Type checking
npx tsc --noEmit
```

## 🎮 Commands

### Strategy Control
```bash
# Start strategy
npm start

# Stop strategy (Ctrl+C)
# Graceful shutdown with position cleanup

# Emergency stop
# Closes all positions immediately
```

### Monitoring
```bash
# View logs
tail -f logs/combined.log

# View errors only
tail -f logs/error.log

# Monitor metrics
# Check application output for periodic updates
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Implement your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

## ⚠️ Disclaimer

This software is provided for educational and research purposes. Cryptocurrency trading involves significant risk and may result in financial loss. Always:

- Start with small amounts
- Understand the risks involved
- Never invest more than you can afford to lose
- Consider consulting with financial professionals
- Review and test thoroughly before production use

The authors are not responsible for any financial losses incurred through the use of this software.

## 🔗 Links

- [Meteora Documentation](https://docs.meteora.ag/)
- [Solana Documentation](https://docs.solana.com/)
- [DLMM Integration Guide](https://docs.meteora.ag/integration/dlmm-integration/dlmm-sdk/dlmm-typescript-sdk)

## 📞 Support

For issues, questions, or contributions:
- Open an issue on GitHub
- Review the documentation
- Check the logs for error details 