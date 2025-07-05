import { PublicKey } from '@solana/web3.js';
import BN from 'bn.js';

export interface StrategyConfig {
  strategy: {
    name: string;
    version: string;
    maxPositions: number;
    capitalPerPool: number;
    rebalanceInterval: string;
  };
  filters: {
    minMarketCap: number;
    minVolumeRatio: number;
    minAge: number;
    requiredSocial: boolean;
  };
  volatilityTiers: {
    low: VolatilityTier;
    medium: VolatilityTier;
    high: VolatilityTier;
  };
  positionConfig: {
    coreRange: RangeConfig;
    outerRange: RangeConfig;
    rebalanceThreshold: number;
  };
  riskManagement: {
    hardStop: {
      dailyDrop: number;
      athDrop: number;
    };
    liquidityDrain: {
      threshold: number;
      period: number;
    };
    socialActivity: {
      dropThreshold: number;
    };
  };
  tokens: TokenConfig[];
  monitoring: {
    alerts: {
      priceChange: number;
      volumeChange: number;
      liquidityChange: number;
    };
    logLevel: string;
  };
}

export interface VolatilityTier {
  threshold: number;
  feeRate: number;
}

export interface RangeConfig {
  percentage: number;
  allocation: number;
}

export interface TokenConfig {
  symbol: string;
  mint: string;
  enabled: boolean;
}

export interface TokenMetrics {
  symbol: string;
  mint: PublicKey;
  marketCap: number;
  volume24h: number;
  price: number;
  volatility: number;
  age: number;
  socialScore: number;
  liquidity: number;
}

export interface Position {
  tokenA: PublicKey;
  tokenB: PublicKey;
  positionPubkey: PublicKey;
  dlmmPool: PublicKey;
  coreRange: {
    minBinId: number;
    maxBinId: number;
    liquidity: BN;
  };
  outerRange: {
    minBinId: number;
    maxBinId: number;
    liquidity: BN;
  };
  fees: {
    collected: BN;
    pending: BN;
  };
  lastRebalance: Date;
  entryPrice: number;
  currentPrice: number;
}

export interface RebalanceResult {
  success: boolean;
  newRanges: {
    coreRange: { minBinId: number; maxBinId: number };
    outerRange: { minBinId: number; maxBinId: number };
  };
  feesCollected: BN;
  txHashes: string[];
  error?: string;
}

export interface ScreeningResult {
  passed: TokenMetrics[];
  failed: Array<{
    token: TokenMetrics;
    reasons: string[];
  }>;
}

export interface StrategyMetrics {
  totalValueLocked: number;
  totalFeesEarned: number;
  totalImpermanentLoss: number;
  netAPR: number;
  activePositions: number;
  rebalanceCount: number;
  lastUpdate: Date;
} 