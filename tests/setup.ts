/**
 * Test setup file
 */

// Mock environment variables for testing
process.env.SOLANA_RPC_URL = 'https://api.devnet.solana.com';
process.env.PRIVATE_KEY = 'test_private_key';
process.env.LOG_LEVEL = 'error';

// Global test utilities
(global as any).TestUtils = {
  createMockTokenMetrics: (overrides = {}) => ({
    symbol: 'TEST',
    mint: { toString: () => 'test_mint' },
    marketCap: 300000000,
    volume24h: 50000000,
    price: 1.0,
    volatility: 0.1,
    age: 90,
    socialScore: 75,
    liquidity: 5000000,
    ...overrides
  }),

  createMockStrategyConfig: (overrides = {}) => ({
    strategy: {
      name: 'Test Strategy',
      version: '1.0.0',
      maxPositions: 3,
      capitalPerPool: 0.05,
      rebalanceInterval: '7d'
    },
    filters: {
      minMarketCap: 200000000,
      minVolumeRatio: 0.15,
      minAge: 60,
      requiredSocial: true
    },
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
    tokens: [
      { symbol: 'TEST', mint: 'test_mint', enabled: true }
    ],
    monitoring: {
      alerts: { priceChange: 0.15, volumeChange: 0.5, liquidityChange: 0.3 },
      logLevel: 'info'
    },
    ...overrides
  })
}; 