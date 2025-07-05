import { Connection, Keypair } from '@solana/web3.js';
import * as fs from 'fs';
import * as path from 'path';
import * as cron from 'node-cron';
import { config } from 'dotenv';
import bs58 from 'bs58';

import { StrategyConfig, TokenMetrics, Position, StrategyMetrics } from './types';
import { DataProvider } from './providers/dataProvider';
import { PositionManager } from './managers/positionManager';
import { RiskManager } from './managers/riskManager';
import logger from './utils/logger';

// Load environment variables
config();

export class MemePoolStrategy {
  private connection!: Connection;
  private wallet!: Keypair;
  private config!: StrategyConfig;
  private dataProvider!: DataProvider;
  private positionManager!: PositionManager;
  private riskManager!: RiskManager;
  private isRunning: boolean = false;
  private metrics!: StrategyMetrics;

  constructor(configPath: string) {
    this.loadConfig(configPath);
    this.initializeConnection();
    this.initializeWallet();
    this.initializeProviders();
    this.initializeMetrics();
  }

  private loadConfig(configPath: string): void {
    try {
      const configData = fs.readFileSync(configPath, 'utf8');
      this.config = JSON.parse(configData);
      logger.info(`✓ Configuration loaded from ${configPath}`);
    } catch (error) {
      logger.error(`Failed to load configuration from ${configPath}:`, error);
      throw new Error(`Configuration file not found or invalid: ${configPath}`);
    }
  }

  private initializeConnection(): void {
    const rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
    this.connection = new Connection(rpcUrl, 'confirmed');
    logger.info(`✓ Connected to Solana RPC: ${rpcUrl}`);
  }

  private initializeWallet(): void {
    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) {
      throw new Error('PRIVATE_KEY environment variable is required');
    }

    try {
      let secretKey: Uint8Array;

      // Handle different private key formats
      if (privateKey.startsWith('[') && privateKey.endsWith(']')) {
        // JSON array format: [1,2,3,4,...] (64 numbers)
        const keyArray = JSON.parse(privateKey);
        if (!Array.isArray(keyArray) || keyArray.length !== 64) {
          throw new Error('Invalid JSON array format - must be 64 numbers');
        }
        secretKey = new Uint8Array(keyArray);
      } else if (privateKey.includes(',')) {
        // Comma-separated format: "1,2,3,4,..."
        const keyArray = privateKey.split(',').map(n => parseInt(n.trim()));
        if (keyArray.length !== 64) {
          throw new Error('Invalid comma-separated format - must be 64 numbers');
        }
        secretKey = new Uint8Array(keyArray);
      } else if (privateKey.match(/^[0-9a-fA-F]+$/)) {
        // Hex string format
        if (privateKey.length !== 128) {
          throw new Error('Invalid hex format - must be 128 characters (64 bytes)');
        }
        const keyArray = [];
        for (let i = 0; i < privateKey.length; i += 2) {
          keyArray.push(parseInt(privateKey.substr(i, 2), 16));
        }
        secretKey = new Uint8Array(keyArray);
      } else {
        // Base58 format (most common)
        secretKey = bs58.decode(privateKey);
        if (secretKey.length !== 64) {
          throw new Error('Invalid base58 key - must decode to 64 bytes');
        }
      }

      this.wallet = Keypair.fromSecretKey(secretKey);
      logger.info(`✓ Wallet initialized: ${this.wallet.publicKey.toString()}`);
    } catch (error) {
      logger.error('Failed to initialize wallet:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Invalid private key format: ${errorMessage}`);
    }
  }

  private initializeProviders(): void {
    this.dataProvider = new DataProvider(
      process.env.DUNE_API_KEY
    );
    this.positionManager = new PositionManager(this.connection, this.wallet, this.config);
    this.riskManager = new RiskManager(this.config);
    logger.info('✓ All providers initialized');
  }

  private initializeMetrics(): void {
    this.metrics = {
      totalValueLocked: 0,
      totalFeesEarned: 0,
      totalImpermanentLoss: 0,
      netAPR: 0,
      activePositions: 0,
      rebalanceCount: 0,
      lastUpdate: new Date()
    };
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Strategy is already running');
      return;
    }

    this.isRunning = true;
    logger.info('🚀 Starting Meteora Meme Pool Strategy');

    try {
      // Initial execution
      await this.executeStrategy();

      // Schedule rebalancing based on config
      this.scheduleRebalancing();

      // Schedule metrics update
      this.scheduleMetricsUpdate();

      logger.info('✓ Strategy started successfully');
    } catch (error) {
      logger.error('Failed to start strategy:', error);
      this.isRunning = false;
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      logger.warn('Strategy is not running');
      return;
    }

    this.isRunning = false;
    logger.info('🛑 Stopping Meteora Meme Pool Strategy');

    // Additional cleanup if needed
    logger.info('✓ Strategy stopped');
  }

  private async executeStrategy(): Promise<void> {
    logger.info('📊 Executing strategy cycle...');

    try {
      // 1. Screen tokens
      const tokens = await this.screenTokens();
      if (tokens.length === 0) {
        logger.warn('No tokens passed screening criteria');
        return;
      }

      // 2. Manage existing positions
      await this.manageExistingPositions(tokens);

      // 3. Create new positions if needed
      await this.createNewPositions(tokens);

      // 4. Update metrics
      await this.updateMetrics();

      logger.info('✓ Strategy cycle completed successfully');
    } catch (error) {
      logger.error('Error executing strategy:', error);
    }
  }

  private async screenTokens(): Promise<TokenMetrics[]> {
    logger.info('🔍 Screening tokens...');

    try {
      const allTokens = await this.dataProvider.getScreenedTokens(this.config.tokens);
      const screeningResult = this.riskManager.screenTokens(allTokens);

      logger.info(`✓ Token screening completed:`);
      logger.info(`  - Passed: ${screeningResult.passed.length} tokens`);
      logger.info(`  - Failed: ${screeningResult.failed.length} tokens`);

      // Log failed tokens with reasons
      screeningResult.failed.forEach(({ token, reasons }) => {
        logger.info(`  ✗ ${token.symbol}: ${reasons.join(', ')}`);
      });

      return screeningResult.passed;
    } catch (error) {
      logger.error('Error screening tokens:', error);
      return [];
    }
  }

  private async manageExistingPositions(tokens: TokenMetrics[]): Promise<void> {
    logger.info('📊 Managing existing positions...');

    const positions = this.positionManager.getPositions();
    const tokensMap = new Map(tokens.map(token => [token.symbol, token]));

    for (const [symbol, position] of positions) {
      const tokenMetrics = tokensMap.get(symbol);
      if (!tokenMetrics) {
        logger.warn(`No metrics found for ${symbol}, considering position closure`);
        continue;
      }

      try {
        // Check hard stops
        if (this.riskManager.checkHardStops(tokenMetrics, position)) {
          logger.warn(`🚨 Hard stop triggered for ${symbol}, closing position`);
          await this.positionManager.closePosition(symbol);
          continue;
        }

        // Check other risk factors
        if (this.riskManager.checkLiquidityDrain(tokenMetrics)) {
          logger.warn(`⚠️ Liquidity drain detected for ${symbol}`);
        }

        if (this.riskManager.checkSocialActivityCollapse(tokenMetrics)) {
          logger.warn(`⚠️ Social activity collapse detected for ${symbol}`);
        }

        // Check if rebalancing is needed
        if (this.riskManager.shouldRebalance(tokenMetrics, position)) {
          logger.info(`🔄 Rebalancing position for ${symbol}`);
          const result = await this.positionManager.rebalancePosition(symbol, tokenMetrics);
          
          if (result.success) {
            this.metrics.rebalanceCount++;
            logger.info(`✓ Successfully rebalanced ${symbol}`);
          } else {
            logger.error(`✗ Failed to rebalance ${symbol}: ${result.error}`);
          }
        }
      } catch (error) {
        logger.error(`Error managing position for ${symbol}:`, error);
      }
    }
  }

  private async createNewPositions(tokens: TokenMetrics[]): Promise<void> {
    logger.info('🆕 Creating new positions...');

    const existingPositions = this.positionManager.getPositions();
    const maxPositions = this.config.strategy.maxPositions;

    if (existingPositions.size >= maxPositions) {
      logger.info(`Maximum positions reached (${maxPositions}), no new positions created`);
      return;
    }

    // Sort tokens by potential (simplified scoring)
    const sortedTokens = tokens
      .filter(token => !existingPositions.has(token.symbol))
      .sort((a, b) => {
        const scoreA = this.calculateTokenScore(a);
        const scoreB = this.calculateTokenScore(b);
        return scoreB - scoreA;
      });

    const positionsToCreate = Math.min(
      maxPositions - existingPositions.size,
      sortedTokens.length
    );

    for (let i = 0; i < positionsToCreate; i++) {
      const token = sortedTokens[i];
      
      try {
        logger.info(`Creating position for ${token.symbol}`);
        const position = await this.positionManager.createPosition(token);
        
        if (position) {
          this.metrics.activePositions++;
          logger.info(`✓ Successfully created position for ${token.symbol}`);
        } else {
          logger.error(`✗ Failed to create position for ${token.symbol}`);
        }
      } catch (error) {
        logger.error(`Error creating position for ${token.symbol}:`, error);
      }
    }
  }

  private calculateTokenScore(token: TokenMetrics): number {
    // Simplified scoring algorithm
    let score = 0;

    // Volume score (higher is better)
    const volumeRatio = token.volume24h / token.marketCap;
    score += Math.min(volumeRatio * 100, 50);

    // Volatility score (moderate is better for fees)
    const volatilityTier = this.riskManager.getVolatilityTier(token.volatility);
    switch (volatilityTier) {
      case 'low': score += 20; break;
      case 'medium': score += 40; break;
      case 'high': score += 30; break;
    }

    // Social score
    score += Math.min(token.socialScore, 30);

    // Liquidity score
    score += Math.min(token.liquidity / 1000000, 20); // $1M = 20 points

    return score;
  }

  private async updateMetrics(): Promise<void> {
    try {
      const positions = this.positionManager.getPositions();
      let totalValue = 0;
      let totalFees = 0;
      let totalIL = 0;

      for (const [symbol, position] of positions) {
        // Calculate position value (simplified)
        const positionValue = position.coreRange.liquidity.toNumber() + position.outerRange.liquidity.toNumber();
        totalValue += positionValue;

        // Calculate fees
        const fees = position.fees.collected.toNumber() + position.fees.pending.toNumber();
        totalFees += fees;

        // Calculate IL
        const il = this.riskManager.calculateImpermanentLoss(position.entryPrice, position.currentPrice);
        totalIL += il * positionValue;
      }

      this.metrics = {
        totalValueLocked: totalValue,
        totalFeesEarned: totalFees,
        totalImpermanentLoss: totalIL,
        netAPR: this.calculateAPR(totalFees, totalIL, totalValue),
        activePositions: positions.size,
        rebalanceCount: this.metrics.rebalanceCount,
        lastUpdate: new Date()
      };

      logger.info('📈 Metrics updated:', this.metrics);
    } catch (error) {
      logger.error('Error updating metrics:', error);
    }
  }

  private calculateAPR(fees: number, il: number, totalValue: number): number {
    if (totalValue === 0) return 0;
    
    const netReturn = fees - il;
    const annualizedReturn = netReturn * 365 / 30; // Assuming 30-day period
    
    return (annualizedReturn / totalValue) * 100;
  }

  private scheduleRebalancing(): void {
    const interval = this.config.strategy.rebalanceInterval;
    let cronPattern: string;

    switch (interval) {
      case '1d':
        cronPattern = '0 0 * * *'; // Daily at midnight
        break;
      case '7d':
        cronPattern = '0 0 * * 0'; // Weekly on Sunday
        break;
      default:
        cronPattern = '0 0 * * 0'; // Default to weekly
    }

    cron.schedule(cronPattern, async () => {
      if (this.isRunning) {
        logger.info('⏰ Scheduled rebalancing triggered');
        await this.executeStrategy();
      }
    });

    logger.info(`✓ Rebalancing scheduled: ${cronPattern}`);
  }

  private scheduleMetricsUpdate(): void {
    // Update metrics every hour
    cron.schedule('0 * * * *', async () => {
      if (this.isRunning) {
        await this.updateMetrics();
      }
    });

    logger.info('✓ Metrics update scheduled');
  }

  // Public methods for external access
  getMetrics(): StrategyMetrics {
    return { ...this.metrics };
  }

  getPositions(): Map<string, Position> {
    return this.positionManager.getPositions();
  }

  async getTokenMetrics(): Promise<TokenMetrics[]> {
    return this.dataProvider.getScreenedTokens(this.config.tokens);
  }

  async forceRebalance(): Promise<void> {
    logger.info('🔄 Force rebalancing triggered');
    await this.executeStrategy();
  }

  async emergencyStop(): Promise<void> {
    logger.warn('🚨 Emergency stop initiated');
    
    const positions = this.positionManager.getPositions();
    for (const [symbol] of positions) {
      try {
        await this.positionManager.closePosition(symbol);
        logger.info(`✓ Emergency closed position: ${symbol}`);
      } catch (error) {
        logger.error(`✗ Failed to close position ${symbol}:`, error);
      }
    }

    await this.stop();
  }
}

// CLI interface
if (require.main === module) {
  const configPath = process.env.CONFIG_FILE || './config/strategy.json';
  const strategy = new MemePoolStrategy(configPath);

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    logger.info('Received SIGINT, shutting down gracefully...');
    await strategy.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    logger.info('Received SIGTERM, shutting down gracefully...');
    await strategy.stop();
    process.exit(0);
  });

  // Start the strategy
  strategy.start().catch(error => {
    logger.error('Failed to start strategy:', error);
    process.exit(1);
  });
} 