# Getting Started with Meteora Meme Pool Strategy

This guide will help you get started with the Meteora Meme Pool Fee Harvest Strategy.

## 📋 Prerequisites

Before you begin, ensure you have:

1. **Node.js 18+** installed on your system
2. **A Solana wallet** with some SOL for transaction fees
3. **Basic understanding** of DeFi and liquidity provision
4. **API keys** (optional but recommended):
   - CoinGecko API key for better rate limits
   - Dune Analytics API key for advanced metrics

## 🚀 Installation

### Step 1: Install Dependencies

```bash
npm install
```

### Step 2: Configuration

1. **Create Environment File**:
   Copy the example and edit with your details:
   ```bash
   cp .env.example .env
   ```

2. **Configure Your Wallet**:
   Edit `.env` and add your private key:
   ```
   PRIVATE_KEY=your_base58_private_key_here
   ```

   ⚠️ **Security Warning**: Never share your private key or commit it to version control!

3. **Customize Strategy**:
   Edit `config/strategy.json` to match your risk tolerance and capital allocation:
   ```json
   {
     "strategy": {
       "maxPositions": 3,
       "capitalPerPool": 0.02,
       "rebalanceInterval": "7d"
     }
   }
   ```

### Step 3: Build and Test

```bash
# Build the project
npm run build

# Run the example to test configuration
npm run example
```

## 🎯 Basic Usage

### Starting the Strategy

```bash
# Start with default configuration
npm start

# Start with custom configuration
CONFIG_FILE=./my-config.json npm start
```

### Monitoring

The strategy provides real-time logging and metrics:

```bash
# View all logs
tail -f logs/combined.log

# View only errors
tail -f logs/error.log
```

## 📊 Understanding the Strategy

### Token Screening Process

The strategy automatically screens tokens based on:
- **Market Cap**: Minimum $200M (reduces blow-up risk)
- **Volume**: Minimum 15% of market cap daily
- **Age**: Minimum 60 days old
- **Social Activity**: Active Twitter/GitHub presence

### Position Management

For each qualifying token, the strategy:
1. **Creates dual ranges**: Core (±15%) and Outer (±40%)
2. **Allocates capital**: 60% to core, 40% to outer
3. **Monitors continuously**: Price movements, fees, IL
4. **Rebalances weekly**: Or when price moves significantly

### Risk Controls

The strategy includes multiple safety mechanisms:
- **Hard stops**: Exit if price drops >40% in 24h or >70% from ATH
- **Liquidity monitoring**: Exit if liquidity drops below threshold
- **Social sentiment**: Track Twitter activity for early warnings

## 🔧 Configuration Options

### Basic Settings

```json
{
  "strategy": {
    "maxPositions": 5,        // Maximum concurrent positions
    "capitalPerPool": 0.05,   // 5% of capital per pool
    "rebalanceInterval": "7d" // Weekly rebalancing
  }
}
```

### Risk Parameters

```json
{
  "riskManagement": {
    "hardStop": {
      "dailyDrop": 0.4,       // 40% daily drop triggers exit
      "athDrop": 0.7          // 70% from ATH triggers exit
    }
  }
}
```

### Token Selection

```json
{
  "filters": {
    "minMarketCap": 200000000,  // $200M minimum
    "minVolumeRatio": 0.15,     // 15% daily volume/mcap
    "minAge": 60                // 60 days minimum age
  }
}
```

## 📈 Expected Returns

### Fee Generation

- **High volatility periods**: 100-300% APR gross fees
- **Normal periods**: 30-80% APR gross fees
- **Net returns**: After impermanent loss, typically 40-150% APR

### Risk Profile

- **Diversified exposure**: 5-6 uncorrelated meme tokens
- **Tail risk protection**: Hard stops and monitoring
- **Capital efficiency**: Automated rebalancing and compounding

## 🚨 Important Warnings

### Financial Risks

- **Impermanent Loss**: You will experience IL in volatile markets
- **Market Risk**: Meme tokens can lose value quickly
- **Smart Contract Risk**: DeFi protocols can have bugs
- **Regulatory Risk**: Cryptocurrency regulations may change

### Operational Risks

- **Technical Issues**: Monitor your positions regularly
- **API Failures**: Have backup monitoring in place
- **Network Congestion**: Solana network may experience issues

### Best Practices

1. **Start Small**: Begin with small amounts to test the strategy
2. **Monitor Closely**: Check positions daily, especially during volatile periods
3. **Set Alerts**: Configure monitoring for price movements and errors
4. **Keep SOL**: Maintain SOL balance for transaction fees
5. **Backup Keys**: Securely store your private keys

## 🆘 Emergency Procedures

### Manual Intervention

```bash
# Force immediate rebalancing
npm run rebalance

# Emergency stop (closes all positions)
npm run emergency-stop
```

### Recovery Steps

If something goes wrong:
1. **Check logs**: `tail -f logs/error.log`
2. **Verify positions**: Check your wallet on Solana explorer
3. **Manual override**: Use Meteora UI to close positions if needed
4. **Restart strategy**: After fixing issues, restart the application

## 📞 Support

### Documentation

- [Full README](./README.md)
- [Meteora DLMM Docs](https://docs.meteora.ag/integration/dlmm-integration/dlmm-sdk/dlmm-typescript-sdk)
- [Strategy Configuration Reference](./README.md#configuration-reference)

### Community

- Create issues on GitHub for bugs or feature requests
- Join the Meteora Discord for general DeFi discussions
- Follow best practices for DeFi security

## 🎓 Learning Resources

### DeFi Concepts

- [Impermanent Loss Explained](https://academy.binance.com/en/articles/impermanent-loss-explained)
- [Liquidity Provision Basics](https://docs.uniswap.org/concepts/protocol/liquidity-provision)
- [CLMM Overview](https://docs.meteora.ag/product-overview/dlmm-overview)

### Technical Resources

- [Solana Developer Documentation](https://docs.solana.com/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)

---

**Remember**: This strategy is for educational purposes and involves significant risk. Always do your own research and consider consulting with financial professionals before deploying significant capital. 