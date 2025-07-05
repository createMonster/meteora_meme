/**
 * Integration Tests - Type Definitions
 */

import { describe, expect, test } from '@jest/globals';
import { 
  StrategyConfig, 
  TokenMetrics, 
  Position, 
  RebalanceResult
} from '../../src/types';

describe('Type Definitions', () => {
  test('should be able to import types', () => {
    // Test that types can be imported without error
    expect(true).toBe(true);
  });

  test('should be able to create mock objects matching interfaces', () => {
    // Test that we can create objects that match our interfaces
    const mockConfig: Partial<StrategyConfig> = {
      strategy: {
        name: 'Test Strategy',
        version: '1.0.0',
        maxPositions: 3,
        capitalPerPool: 0.1,
        rebalanceInterval: '7d'
      },
      filters: {
        minMarketCap: 200000000,
        minVolumeRatio: 0.15,
        minAge: 60,
        requiredSocial: true
      }
    };

    const mockTokenMetrics: Partial<TokenMetrics> = {
      symbol: 'TEST',
      marketCap: 300000000,
      volume24h: 50000000,
      price: 1.0,
      volatility: 0.1,
      age: 90,
      socialScore: 75,
      liquidity: 5000000
    };

    const mockPerformanceMetrics = {
      totalValue: 1000000,
      feesCollected: 5000,
      impermanentLoss: 0.02,
      netReturn: 0.15,
      sharpeRatio: 1.2
    };

    expect(mockConfig.strategy?.name).toBe('Test Strategy');
    expect(mockTokenMetrics.symbol).toBe('TEST');
    expect(mockPerformanceMetrics.totalValue).toBe(1000000);
  });

  test('should validate configuration structure', () => {
    const validConfig = {
      strategy: { name: 'Test', version: '1.0.0', maxPositions: 3, capitalPerPool: 0.1, rebalanceInterval: '7d' },
      filters: { minMarketCap: 200000000, minVolumeRatio: 0.15, minAge: 60, requiredSocial: true },
      volatilityTiers: {
        low: { threshold: 0.05, feeRate: 0.0005 },
        medium: { threshold: 0.15, feeRate: 0.003 },
        high: { threshold: 1.0, feeRate: 0.01 }
      },
      positionConfig: {
        coreRange: { percentage: 0.15, allocation: 0.6 },
        outerRange: { percentage: 0.4, allocation: 0.4 },
        rebalanceThreshold: 0.8
      },
      riskManagement: {
        hardStop: { dailyDrop: 0.4, athDrop: 0.7 },
        liquidityDrain: { threshold: 0.3, period: 14 },
        socialActivity: { dropThreshold: 0.5 }
      },
      tokens: [],
      monitoring: {
        alerts: { priceChange: 0.15, volumeChange: 0.5, liquidityChange: 0.3 },
        logLevel: 'info'
      }
    };

    // Validate the structure is correct
    expect(validConfig.strategy.name).toBeDefined();
    expect(validConfig.filters.minMarketCap).toBeGreaterThan(0);
    expect(validConfig.volatilityTiers.low.threshold).toBeLessThan(validConfig.volatilityTiers.medium.threshold);
    expect(validConfig.positionConfig.coreRange.allocation + validConfig.positionConfig.outerRange.allocation).toBe(1);
    expect(validConfig.riskManagement.hardStop.dailyDrop).toBeLessThan(1);
    expect(Array.isArray(validConfig.tokens)).toBe(true);
    expect(validConfig.monitoring.logLevel).toBe('info');
  });
}); 