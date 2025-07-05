import { StrategyConfig, TokenMetrics, Position, ScreeningResult } from '../types';
import logger from '../utils/logger';

export class RiskManager {
  private config: StrategyConfig;
  private priceHistory: Map<string, Array<{ price: number; timestamp: number }>> = new Map();
  private athPrices: Map<string, number> = new Map();

  constructor(config: StrategyConfig) {
    this.config = config;
  }

  screenTokens(tokens: TokenMetrics[]): ScreeningResult {
    const passed: TokenMetrics[] = [];
    const failed: Array<{ token: TokenMetrics; reasons: string[] }> = [];

    for (const token of tokens) {
      const reasons = this.getFailureReasons(token);
      
      if (reasons.length === 0) {
        passed.push(token);
        logger.info(`✓ ${token.symbol} passed screening`);
      } else {
        failed.push({ token, reasons });
        logger.info(`✗ ${token.symbol} failed screening: ${reasons.join(', ')}`);
      }
    }

    return { passed, failed };
  }

  private getFailureReasons(token: TokenMetrics): string[] {
    const reasons: string[] = [];

    // Market cap filter
    if (token.marketCap < this.config.filters.minMarketCap) {
      reasons.push(`Market cap too low: $${token.marketCap.toLocaleString()} < $${this.config.filters.minMarketCap.toLocaleString()}`);
    }

    // Volume ratio filter
    const volumeRatio = token.volume24h / token.marketCap;
    if (volumeRatio < this.config.filters.minVolumeRatio) {
      reasons.push(`Volume ratio too low: ${(volumeRatio * 100).toFixed(2)}% < ${(this.config.filters.minVolumeRatio * 100).toFixed(2)}%`);
    }

    // Age filter
    if (token.age < this.config.filters.minAge) {
      reasons.push(`Token too young: ${token.age} days < ${this.config.filters.minAge} days`);
    }

    // Social filter
    if (this.config.filters.requiredSocial && token.socialScore < 30) {
      reasons.push(`Social score too low: ${token.socialScore.toFixed(1)} < 30`);
    }

    return reasons;
  }

  checkHardStops(token: TokenMetrics, position: Position): boolean {
    const { hardStop } = this.config.riskManagement;
    
    // Update price history
    this.updatePriceHistory(token.symbol, token.price);
    
    // Update ATH
    const currentAth = this.athPrices.get(token.symbol) || token.price;
    if (token.price > currentAth) {
      this.athPrices.set(token.symbol, token.price);
    }

    // Check 24h drop
    const dailyDrop = this.calculateDailyDrop(token.symbol, token.price);
    if (dailyDrop >= hardStop.dailyDrop) {
      logger.warn(`🚨 Hard stop triggered for ${token.symbol}: ${(dailyDrop * 100).toFixed(2)}% daily drop`);
      return true;
    }

    // Check ATH drop
    const athDrop = this.calculateAthDrop(token.symbol, token.price);
    if (athDrop >= hardStop.athDrop) {
      logger.warn(`🚨 Hard stop triggered for ${token.symbol}: ${(athDrop * 100).toFixed(2)}% drop from ATH`);
      return true;
    }

    return false;
  }

  checkLiquidityDrain(token: TokenMetrics): boolean {
    const { liquidityDrain } = this.config.riskManagement;
    
    // Get 14-day average liquidity (simplified)
    const avgLiquidity = this.getAverageLiquidity(token.symbol);
    if (avgLiquidity === 0) return false;

    const liquidityRatio = token.liquidity / avgLiquidity;
    if (liquidityRatio < liquidityDrain.threshold) {
      logger.warn(`🚨 Liquidity drain detected for ${token.symbol}: ${(liquidityRatio * 100).toFixed(2)}% of average`);
      return true;
    }

    return false;
  }

  checkSocialActivityCollapse(token: TokenMetrics): boolean {
    const { socialActivity } = this.config.riskManagement;
    
    // Get historical social score (simplified)
    const avgSocialScore = this.getAverageSocialScore(token.symbol);
    if (avgSocialScore === 0) return false;

    const socialRatio = token.socialScore / avgSocialScore;
    if (socialRatio < (1 - socialActivity.dropThreshold)) {
      logger.warn(`🚨 Social activity collapse detected for ${token.symbol}: ${(socialRatio * 100).toFixed(2)}% of average`);
      return true;
    }

    return false;
  }

  shouldRebalance(token: TokenMetrics, position: Position): boolean {
    const { rebalanceThreshold } = this.config.positionConfig;
    
    // Check if price has moved outside the rebalance threshold
    const priceChange = Math.abs(token.price - position.entryPrice) / position.entryPrice;
    
    if (priceChange > rebalanceThreshold) {
      logger.info(`Rebalance needed for ${token.symbol}: ${(priceChange * 100).toFixed(2)}% price change`);
      return true;
    }

    // Check if it's been more than 7 days since last rebalance
    const daysSinceRebalance = (Date.now() - position.lastRebalance.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceRebalance >= 7) {
      logger.info(`Rebalance needed for ${token.symbol}: ${daysSinceRebalance.toFixed(1)} days since last rebalance`);
      return true;
    }

    return false;
  }

  getVolatilityTier(volatility: number): 'low' | 'medium' | 'high' {
    const { volatilityTiers } = this.config;
    
    if (volatility < volatilityTiers.low.threshold) {
      return 'low';
    } else if (volatility < volatilityTiers.medium.threshold) {
      return 'medium';
    } else {
      return 'high';
    }
  }

  private updatePriceHistory(symbol: string, price: number): void {
    if (!this.priceHistory.has(symbol)) {
      this.priceHistory.set(symbol, []);
    }

    const history = this.priceHistory.get(symbol)!;
    history.push({ price, timestamp: Date.now() });

    // Keep only last 30 days
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const filteredHistory = history.filter(entry => entry.timestamp > thirtyDaysAgo);
    this.priceHistory.set(symbol, filteredHistory);
  }

  private calculateDailyDrop(symbol: string, currentPrice: number): number {
    const history = this.priceHistory.get(symbol);
    if (!history || history.length < 2) return 0;

    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    const historicalPrice = history.find(entry => entry.timestamp <= oneDayAgo);
    
    if (!historicalPrice) return 0;

    return (historicalPrice.price - currentPrice) / historicalPrice.price;
  }

  private calculateAthDrop(symbol: string, currentPrice: number): number {
    const ath = this.athPrices.get(symbol);
    if (!ath) return 0;

    return (ath - currentPrice) / ath;
  }

  private getAverageLiquidity(symbol: string): number {
    // Simplified implementation
    // In production, maintain historical liquidity data
    return 5000000; // $5M average liquidity
  }

  private getAverageSocialScore(symbol: string): number {
    // Simplified implementation
    // In production, maintain historical social score data
    return 50; // Average social score
  }

  calculateImpermanentLoss(entryPrice: number, currentPrice: number, entryRatio: number = 0.5): number {
    // Simplified IL calculation for 50/50 pools
    const priceRatio = currentPrice / entryPrice;
    const il = 2 * Math.sqrt(priceRatio) / (1 + priceRatio) - 1;
    
    return Math.abs(il);
  }

  assessOverallRisk(tokens: TokenMetrics[], positions: Map<string, Position>): {
    riskScore: number;
    warnings: string[];
    recommendations: string[];
  } {
    const warnings: string[] = [];
    const recommendations: string[] = [];
    let totalRisk = 0;

    // Check portfolio concentration
    const activePositions = positions.size;
    const maxPositions = this.config.strategy.maxPositions;
    
    if (activePositions > maxPositions) {
      warnings.push(`Portfolio over-concentrated: ${activePositions} positions > ${maxPositions} max`);
      totalRisk += 20;
    }

    // Check correlation risk
    const correlationRisk = this.assessCorrelationRisk(tokens);
    if (correlationRisk > 0.7) {
      warnings.push(`High correlation risk: ${(correlationRisk * 100).toFixed(1)}%`);
      totalRisk += 15;
    }

    // Check volatility risk
    const avgVolatility = tokens.reduce((sum, token) => sum + token.volatility, 0) / tokens.length;
    if (avgVolatility > 0.5) {
      warnings.push(`High portfolio volatility: ${(avgVolatility * 100).toFixed(1)}%`);
      totalRisk += 10;
    }

    // Generate recommendations
    if (totalRisk > 30) {
      recommendations.push('Consider reducing position sizes');
      recommendations.push('Diversify into lower volatility assets');
    }

    if (activePositions < 3) {
      recommendations.push('Consider adding more positions for better diversification');
    }

    const riskScore = Math.min(totalRisk, 100);
    
    return {
      riskScore,
      warnings,
      recommendations
    };
  }

  private assessCorrelationRisk(tokens: TokenMetrics[]): number {
    // Simplified correlation assessment
    // In production, calculate actual price correlations
    const memeCount = tokens.filter(t => t.symbol.includes('MEME')).length;
    return memeCount / tokens.length; // High if mostly meme tokens
  }
} 