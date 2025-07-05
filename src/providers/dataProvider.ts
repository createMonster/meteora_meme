import axios from 'axios';
import { PublicKey } from '@solana/web3.js';
import { TokenMetrics, TokenConfig } from '../types';
import logger from '../utils/logger';

interface RateLimiter {
  requests: number;
  resetTime: number;
  maxRequests: number;
  windowMs: number;
}

class APIQueue {
  private queue: Array<() => Promise<any>> = [];
  private processing = false;
  private delay: number;

  constructor(delay: number = 1000) {
    this.delay = delay;
  }

  async add<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      this.process();
    });
  }

  private async process() {
    if (this.processing || this.queue.length === 0) return;
    
    this.processing = true;
    
    while (this.queue.length > 0) {
      const fn = this.queue.shift()!;
      try {
        await fn();
      } catch (error) {
        logger.error('Queue processing error:', error);
      }
      
      if (this.queue.length > 0) {
        await new Promise(resolve => setTimeout(resolve, this.delay));
      }
    }
    
    this.processing = false;
  }
}

export class DataProvider {
  private readonly duneApiKey?: string;
  private readonly jupiterQuoteUrl = 'https://lite-api.jup.ag/swap/v1';
  private readonly jupiterTokensUrl = 'https://lite-api.jup.ag/tokens/v1';
  private readonly solMint = 'So11111111111111111111111111111111111111112';
  private readonly birdseyeUrl = 'https://public-api.birdeye.so/defi';
  
  // Rate limiting properties
  private readonly rateLimiter: RateLimiter;
  private readonly apiQueue: APIQueue;
  private readonly cache = new Map<string, { data: any; timestamp: number }>();
  private readonly cacheTimeout = 60000; // 1 minute cache

  constructor(duneApiKey?: string) {
    this.duneApiKey = duneApiKey;
    
    // Initialize rate limiter (Birdeye free tier: ~100 requests per minute)
    this.rateLimiter = {
      requests: 0,
      resetTime: Date.now() + 60000, // 1 minute window
      maxRequests: 50, // Conservative limit
      windowMs: 60000 // 1 minute
    };
    
    // Initialize API queue with 1.5 second delay between requests
    this.apiQueue = new APIQueue(1500);
    
    logger.info('✓ DataProvider initialized with Jupiter APIs');
    
    // Log API key status
    if (process.env.BIRDEYE_API_KEY) {
      logger.info('✓ Birdeye API key configured');
      logger.info(`✓ Rate limiter initialized: ${this.rateLimiter.maxRequests} requests per minute`);
    } else {
      logger.warn('⚠ Birdeye API key not configured - some features may be limited');
    }
  }

  // Rate limiting and caching methods
  private resetRateLimiterIfNeeded(): void {
    const now = Date.now();
    if (now >= this.rateLimiter.resetTime) {
      this.rateLimiter.requests = 0;
      this.rateLimiter.resetTime = now + this.rateLimiter.windowMs;
    }
  }

  private canMakeRequest(): boolean {
    this.resetRateLimiterIfNeeded();
    return this.rateLimiter.requests < this.rateLimiter.maxRequests;
  }

  private incrementRequestCount(): void {
    this.rateLimiter.requests++;
  }

  private getCacheKey(endpoint: string, params: Record<string, any>): string {
    return `${endpoint}:${JSON.stringify(params)}`;
  }

  private getFromCache(key: string): any | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    return null;
  }

  private setCache(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  private async makeBirdeyeRequest(endpoint: string, params: Record<string, any>): Promise<any> {
    const cacheKey = this.getCacheKey(endpoint, params);
    
    // Check cache first
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      logger.debug(`Cache hit for ${endpoint}`);
      return cached;
    }

    // Use queue for rate limiting
    return this.apiQueue.add(async () => {
      // Double-check rate limit before making request
      if (!this.canMakeRequest()) {
        const waitTime = this.rateLimiter.resetTime - Date.now();
        logger.warn(`Rate limit exceeded, waiting ${waitTime}ms`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        this.resetRateLimiterIfNeeded();
      }

      try {
        this.incrementRequestCount();
        
        const response = await axios.get(`${this.birdseyeUrl}${endpoint}`, {
          params,
          headers: {
            'X-API-KEY': process.env.BIRDEYE_API_KEY || '',
          },
          timeout: 10000, // 10 second timeout
        });

        const data = response.data;
        
        // Cache successful response
        this.setCache(cacheKey, data);
        
        logger.debug(`Birdeye API request successful: ${endpoint}`);
        return data;
      } catch (error: any) {
        if (error.response?.status === 429) {
          logger.warn(`Rate limit hit for ${endpoint}, backing off`);
          // Exponential backoff
          const backoffTime = Math.min(5000 * Math.pow(2, this.rateLimiter.requests % 5), 30000);
          await new Promise(resolve => setTimeout(resolve, backoffTime));
          throw error;
        }
        throw error;
      }
    });
  }

  async getTokenMetrics(tokenConfig: TokenConfig): Promise<TokenMetrics | null> {
    try {
      const [priceData, marketData, volatilityData] = await Promise.all([
        this.getTokenPrice(tokenConfig.mint),
        this.getMarketData(tokenConfig.mint),
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
        socialScore: await this.getSocialScore(tokenConfig.mint),
        liquidity: await this.getLiquidityData(tokenConfig.mint)
      };
    } catch (error) {
      logger.error(`Error fetching metrics for ${tokenConfig.symbol}: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  private async getTokenPrice(mint: string): Promise<{ price: number } | null> {
    try {
      // Use Quote API to get price by requesting a small quote from SOL to target token
      const response = await axios.get(`${this.jupiterQuoteUrl}/quote`, {
        params: {
          inputMint: this.solMint,
          outputMint: mint,
          amount: 1000000000, // 1 SOL in lamports
          slippageBps: 50
        }
      });
      
      if (response.data?.outAmount && response.data?.inAmount) {
        // Calculate price: output amount / input amount
        const price = parseFloat(response.data.outAmount) / parseFloat(response.data.inAmount);
        return { price };
      }
      
      return null;
    } catch (error) {
      logger.error(`Error fetching price for ${mint}: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  private async getMarketData(mint: string): Promise<any> {
    try {
      // Use rate-limited Birdeye API for comprehensive token data
      const response = await this.makeBirdeyeRequest('/token_overview', {
        address: mint
      });

      const data = response?.data;
      if (!data) return null;

      return {
        market_cap: data.mc || 0,
        total_volume: data.v24hUSD || 0,
        liquidity: data.liquidity || 0,
        price: data.price || 0
      };
    } catch (error) {
      logger.warn(`Birdeye API failed for ${mint}, using Jupiter fallback: ${error instanceof Error ? error.message : String(error)}`);
      
      // Fallback to Jupiter token info (correct endpoint: /token/ not /tokens/)
      try {
        const tokenResponse = await axios.get(`${this.jupiterTokensUrl}/token/${mint}`);
        const token = tokenResponse.data;
        
        return {
          market_cap: token.marketCap || 0,
          total_volume: token.volume24h || 0,
          liquidity: token.liquidity || 0,
          price: token.price || 0
        };
      } catch (fallbackError) {
        logger.error(`Error fetching market data for ${mint}: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`);
        return null;
      }
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
      logger.error(`Error calculating volatility for ${mint}: ${error instanceof Error ? error.message : String(error)}`);
      return 0;
    }
  }

  private async getPriceHistory(mint: string, days: number): Promise<Array<{ price: number; timestamp: number }> | null> {
    try {
      // Use rate-limited Birdeye API for historical price data
      const endTime = Math.floor(Date.now() / 1000);
      const startTime = endTime - (days * 24 * 60 * 60);
      
      const response = await this.makeBirdeyeRequest('/history_price', {
        address: mint,
        address_type: 'token',
        type: '1D',
        time_from: startTime,
        time_to: endTime
      });

      const data = response?.data?.items;
      if (data && Array.isArray(data)) {
        return data.map((item: any) => ({
          price: item.value || 0,
          timestamp: item.unixTime * 1000
        }));
      }

      // Fallback: get current price and simulate history
      const currentPriceData = await this.getTokenPrice(mint);
      const currentPrice = currentPriceData?.price || 0;
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
      logger.error(`Error fetching price history for ${mint}: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  private async getTokenAge(mint: string): Promise<number> {
    try {
      // Use rate-limited Birdeye API to get token creation info
      const response = await this.makeBirdeyeRequest('/token_creation_info', {
        address: mint
      });

      const creationTime = response?.data?.creation_time;
      if (creationTime) {
        const ageMs = Date.now() - (creationTime * 1000);
        return Math.floor(ageMs / (24 * 60 * 60 * 1000)); // Convert to days
      }

      // Fallback: use Jupiter tokens list (correct endpoint: /token/ not /tokens/)
      const tokenResponse = await axios.get(`${this.jupiterTokensUrl}/token/${mint}`);
      const token = tokenResponse.data;
      
      if (token?.createdAt) {
        const ageMs = Date.now() - new Date(token.createdAt).getTime();
        return Math.floor(ageMs / (24 * 60 * 60 * 1000));
      }

      // Default fallback
      return 90; // Assume 90 days if can't determine
    } catch (error) {
      logger.warn(`Could not determine token age for ${mint}, using default: ${error instanceof Error ? error.message : String(error)}`);
      return 90; // Conservative default
    }
  }

  private async getSocialScore(mint: string): Promise<number> {
    try {
      // Use rate-limited Birdeye API for token overview data
      const response = await this.makeBirdeyeRequest('/token_overview', {
        address: mint
      });

      const data = response?.data;
      if (data) {
        // Calculate score based on available metrics from token overview
        const volumeScore = data.v24hUSD ? Math.min(data.v24hUSD / 1000000, 30) : 0; // Volume score
        const liquidityScore = data.liquidity ? Math.min(data.liquidity / 5000000, 30) : 0; // Liquidity score
        const priceScore = data.priceChange24h ? Math.min(Math.abs(data.priceChange24h) / 10, 20) : 0; // Price movement score
        const marketScore = data.mc ? Math.min(data.mc / 100000000, 20) : 0; // Market cap score
        
        return Math.min(volumeScore + liquidityScore + priceScore + marketScore, 100);
      }

      return 50; // Default moderate score
    } catch (error) {
      logger.warn(`Could not fetch social score for ${mint}: ${error instanceof Error ? error.message : String(error)}`);
      return 50; // Default moderate score
    }
  }

  private async getLiquidityData(mint: string): Promise<number> {
    try {
      // Get liquidity from multiple sources
      const [birdeyeResponse, jupiterResponse] = await Promise.allSettled([
        this.makeBirdeyeRequest('/token_overview', { address: mint }),
        axios.get(`${this.jupiterTokensUrl}/token/${mint}`)
      ]);

      let totalLiquidity = 0;

      // Birdeye liquidity data
      if (birdeyeResponse.status === 'fulfilled') {
        const birdeyeLiq = birdeyeResponse.value?.data?.liquidity || 0;
        totalLiquidity += birdeyeLiq;
      }

      // Jupiter liquidity data
      if (jupiterResponse.status === 'fulfilled') {
        const jupiterLiq = jupiterResponse.value.data?.liquidity || 0;
        totalLiquidity += jupiterLiq;
      }

      // If we got data from both, average them to avoid double counting
      if (birdeyeResponse.status === 'fulfilled' && jupiterResponse.status === 'fulfilled') {
        totalLiquidity = totalLiquidity / 2;
      }

      return totalLiquidity;
    } catch (error) {
      logger.error(`Error fetching liquidity for ${mint}: ${error instanceof Error ? error.message : String(error)}`);
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