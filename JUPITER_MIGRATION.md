# Jupiter API Migration Guide

## Overview ✅

Successfully migrated from CoinGecko to Jupiter ecosystem APIs for comprehensive token data fetching. This provides better coverage for Solana tokens and more reliable data sources.

## What Changed

### ❌ Removed: CoinGecko Dependencies
- Removed CoinGecko API integration
- Removed `COINGECKO_API_KEY` environment variable
- Eliminated CoinGecko-specific market data endpoints

### ✅ Added: Jupiter + Birdeye Integration
- **Jupiter Price API v6**: Real-time token prices
- **Jupiter Tokens API**: Token metadata and information
- **Birdeye API**: Comprehensive market data, liquidity, social metrics, and historical data

## New Data Sources

### 1. Price Data
**Source**: Jupiter Price API v6
```
https://price.jup.ag/v6/price?ids={mint}
```
- ✅ Real-time prices for all Jupiter-supported tokens
- ✅ High reliability and low latency
- ✅ Free to use

### 2. Market Data (Market Cap, Volume)
**Primary**: Birdeye API
```
https://public-api.birdeye.so/defi/token_overview?address={mint}
```
**Fallback**: Jupiter Tokens API
```
https://tokens.jup.ag/tokens/{mint}
```
- ✅ Market capitalization
- ✅ 24h trading volume
- ✅ Liquidity data
- ✅ Automatic fallback system

### 3. Historical Data
**Source**: Birdeye History API
```
https://public-api.birdeye.so/defi/history_price
```
- ✅ Multi-day price history
- ✅ Accurate volatility calculations
- ✅ Fallback to simulated data if API unavailable

### 4. Social Metrics
**Source**: Birdeye Social API
```
https://public-api.birdeye.so/defi/token_social
```
- ✅ Twitter followers
- ✅ Telegram members
- ✅ Website verification
- ✅ 24h activity metrics
- ✅ Calculated composite social score (0-100)

### 5. Token Age
**Source**: Birdeye Creation Info + Jupiter Tokens
- ✅ Actual token creation timestamps
- ✅ Accurate age calculations in days
- ✅ Fallback mechanisms

### 6. Liquidity Data
**Source**: Multi-source aggregation
- ✅ Birdeye liquidity pools
- ✅ Jupiter DEX aggregation
- ✅ Cross-validation between sources

## API Key Requirements

### Required: Birdeye API Key
```bash
BIRDEYE_API_KEY=your_birdeye_api_key
```

**How to get Birdeye API Key**:
1. Visit [Birdeye.so](https://birdeye.so)
2. Sign up for an account
3. Go to API section
4. Generate your API key
5. Add to your `.env` file

### Optional: Dune Analytics (for advanced analytics)
```bash
DUNE_API_KEY=your_dune_analytics_api_key
```

## Benefits of the Migration

### 🚀 **Better Solana Coverage**
- Jupiter covers virtually all Solana tokens
- Real-time data from the largest Solana DEX aggregator
- Better price discovery for meme tokens

### 📊 **More Comprehensive Data**
- Social metrics integration
- Real historical price data
- Multi-source liquidity aggregation
- Token age verification

### 💰 **Cost Effectiveness**
- Jupiter Price API is free
- Birdeye offers generous free tier
- Reduced API costs compared to CoinGecko Pro

### ⚡ **Better Performance**
- Lower latency for Solana-native APIs
- Fallback mechanisms for reliability
- Optimized for meme token data

## Configuration Updates

### Environment Variables
**Old**:
```bash
COINGECKO_API_KEY=your_coingecko_key
DUNE_API_KEY=your_dune_key
```

**New**:
```bash
BIRDEYE_API_KEY=your_birdeye_key
DUNE_API_KEY=your_dune_key  # Optional
```

### Strategy Config
No changes required to `config/strategy.json` - all token configurations remain the same.

## Testing the Migration

### 1. Update Environment
```bash
# Copy the new template
cp env.template .env

# Add your Birdeye API key
BIRDEYE_API_KEY=your_actual_birdeye_key
```

### 2. Test Data Fetching
```bash
npm run build
npm start
```

### 3. Verify Data Quality
Check logs for successful data fetching:
```
✓ DataProvider initialized with Jupiter APIs
✓ Token screening completed: Passed: X tokens
```

## API Rate Limits

### Jupiter (Free)
- Price API: No explicit limits
- High throughput for price queries

### Birdeye (Free Tier)
- 1000 requests/day
- Sufficient for strategy operations
- Upgrade available for higher volume

## Troubleshooting

### Issue: Missing Birdeye API Key
**Error**: API calls failing or returning limited data
**Solution**: Add `BIRDEYE_API_KEY` to your `.env` file

### Issue: Rate Limit Exceeded
**Error**: 429 responses from Birdeye
**Solution**: 
1. Reduce polling frequency
2. Upgrade to paid Birdeye plan
3. Fallback to Jupiter-only data

### Issue: Token Not Found
**Error**: No data for specific token
**Solution**: 
1. Verify token mint address
2. Check if token is listed on Jupiter
3. Ensure token has sufficient liquidity

## Migration Checklist

- ✅ Updated DataProvider to use Jupiter + Birdeye APIs
- ✅ Removed CoinGecko dependencies
- ✅ Added comprehensive fallback mechanisms
- ✅ Updated environment configuration
- ✅ Enhanced social metrics calculation
- ✅ Improved historical data accuracy
- ✅ Added multi-source liquidity aggregation
- ✅ Maintained backward compatibility
- ✅ Added proper error handling and logging

## Next Steps

1. **Get Birdeye API Key**: Sign up at birdeye.so
2. **Update Environment**: Add `BIRDEYE_API_KEY` to `.env`
3. **Test Strategy**: Run with real data
4. **Monitor Performance**: Check data quality and API reliability
5. **Consider Upgrades**: Evaluate paid plans for higher volume

The migration to Jupiter APIs provides better data quality, coverage, and cost-effectiveness for Solana meme token strategies! 🚀 