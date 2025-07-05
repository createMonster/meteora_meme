import axios from 'axios';
import { PublicKey } from '@solana/web3.js';
import { TokenMetrics, TokenConfig } from '../types';
import logger from '../utils/logger';

export class DataProvider {
  private readonly coingeckoApiKey?: string;
  private readonly duneApiKey?: string;
  private readonly baseUrl = 'https://api.coingecko.com/api/v3';
  private readonly jupiterApiUrl = 'https://price.jup.ag/v4';

  constructor(coingeckoApiKey?: string, duneApiKey?: string) {
    this.coingeckoApiKey = coingeckoApiKey;
    this.duneApiKey = duneApiKey;
  }

  async getTokenMetrics(tokenConfig: TokenConfig): Promise<TokenMetrics | null> {
    try {
      const [priceData, marketData, volatilityData] = await Promise.all([
        this.getTokenPrice(tokenConfig.mint),
        this.getMarketData(tokenConfig.symbol),
        this.getVolatilityData(tokenConfig.mint)
      ]);

      if (!priceData || !marketData) {
        logger.warn(`Failed to fetch complete data for ${tokenConfig.symbol}`);
        return null;
      }

      return {
        symbol: tokenConfig.symbol,
        mint: new PublicKey(tokenConfig.mint),
        marketCap: marketData.market_cap || 0,
        volume24h: marketData.total_volume || 0,
        price: priceData.price,
        volatility: volatilityData || 0,
        age: await this.getTokenAge(tokenConfig.mint),
        socialScore: await this.getSocialScore(tokenConfig.symbol),
        liquidity: await this.getLiquidityData(tokenConfig.mint)
      };
    } catch (error) {
      logger.error(`Error fetching metrics for ${tokenConfig.symbol}:`, error);
      return null;
    }
  }

  private async getTokenPrice(mint: string): Promise<{ price: number } | null> {
    try {
      const response = await axios.get(`${this.jupiterApiUrl}/price`, {
        params: { ids: mint }
      });
      
      return response.data.data?.[mint] || null;
    } catch (error) {
      logger.error(`Error fetching price for ${mint}:`, error);
      return null;
    }
  }

  private async getMarketData(symbol: string): Promise<any> {
    try {
      const headers = this.coingeckoApiKey ? {
        'x-cg-pro-api-key': this.coingeckoApiKey
      } : {};

      const response = await axios.get(`${this.baseUrl}/coins/markets`, {
        params: {
          vs_currency: 'usd',
          ids: symbol.toLowerCase(),
          order: 'market_cap_desc',
          per_page: 1,
          page: 1
        },
        headers
      });

      return response.data[0] || null;
    } catch (error) {
      logger.error(`Error fetching market data for ${symbol}:`, error);
      return null;
    }
  }

  private async getVolatilityData(mint: string): Promise<number> {
    try {
      // Simplified volatility calculation using price history
      const history = await this.getPriceHistory(mint, 7);
      if (!history || history.length < 2) return 0;

      const returns = [];
      for (let i = 1; i < history.length; i++) {
        const ret = Math.log(history[i].price / history[i-1].price);
        returns.push(ret);
      }

      // Calculate standard deviation
      const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
      const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
      const volatility = Math.sqrt(variance) * Math.sqrt(365); // Annualized

      return volatility;
    } catch (error) {
      logger.error(`Error calculating volatility for ${mint}:`, error);
      return 0;
    }
  }

  private async getPriceHistory(mint: string, days: number): Promise<Array<{ price: number; timestamp: number }> | null> {
    try {
      // This is a simplified implementation
      // In production, you'd use a proper API for historical data
      const response = await axios.get(`${this.jupiterApiUrl}/price`, {
        params: { ids: mint }
      });
      
      // Mock historical data for demonstration
      const currentPrice = response.data.data?.[mint]?.price || 0;
      const history = [];
      
      for (let i = 0; i < days; i++) {
        const variance = (Math.random() - 0.5) * 0.1; // ±5% daily variance
        const price = currentPrice * (1 + variance);
        history.push({
          price,
          timestamp: Date.now() - (i * 24 * 60 * 60 * 1000)
        });
      }
      
      return history;
    } catch (error) {
      logger.error(`Error fetching price history for ${mint}:`, error);
      return null;
    }
  }

  private async getTokenAge(mint: string): Promise<number> {
    try {
      // Simplified implementation - would need to query token creation date
      // This is a placeholder that returns random age between 30-365 days
      return Math.floor(Math.random() * 335) + 30;
    } catch (error) {
      logger.error(`Error fetching token age for ${mint}:`, error);
      return 0;
    }
  }

  private async getSocialScore(symbol: string): Promise<number> {
    try {
      // Simplified social score calculation
      // In production, integrate with LunarCrush or similar APIs
      return Math.random() * 100; // 0-100 score
    } catch (error) {
      logger.error(`Error fetching social score for ${symbol}:`, error);
      return 0;
    }
  }

  private async getLiquidityData(mint: string): Promise<number> {
    try {
      // Simplified liquidity calculation
      // In production, aggregate from multiple DEXs
      return Math.random() * 10000000; // $0-10M liquidity
    } catch (error) {
      logger.error(`Error fetching liquidity for ${mint}:`, error);
      return 0;
    }
  }

  async getScreenedTokens(tokens: TokenConfig[]): Promise<TokenMetrics[]> {
    const metrics = await Promise.all(
      tokens
        .filter(token => token.enabled)
        .map(token => this.getTokenMetrics(token))
    );

    return metrics.filter(metric => metric !== null) as TokenMetrics[];
  }
} 