import { Connection, PublicKey, Transaction, Keypair, sendAndConfirmTransaction } from '@solana/web3.js';
import DLMM from '@meteora-ag/dlmm';
import BN from 'bn.js';
import { Position, RebalanceResult, StrategyConfig, TokenMetrics } from '../types';
import logger from '../utils/logger';

export class PositionManager {
  private connection: Connection;
  private wallet: Keypair;
  private config: StrategyConfig;
  private positions: Map<string, Position> = new Map();

  constructor(connection: Connection, wallet: Keypair, config: StrategyConfig) {
    this.connection = connection;
    this.wallet = wallet;
    this.config = config;
  }

  async createPosition(tokenMetrics: TokenMetrics): Promise<Position | null> {
    try {
      logger.info(`Creating position for ${tokenMetrics.symbol}`);

      // Find or create DLMM pool
      const dlmmPool = await this.findOrCreateDLMMPool(tokenMetrics);
      if (!dlmmPool) {
        logger.error(`Failed to find/create DLMM pool for ${tokenMetrics.symbol}`);
        return null;
      }

      // Calculate position ranges
      const { coreRange, outerRange } = this.calculateRanges(tokenMetrics);

      // Calculate liquidity amounts
      const totalCapital = this.getTotalCapital() * this.config.strategy.capitalPerPool;
      const coreCapital = totalCapital * this.config.positionConfig.coreRange.allocation;
      const outerCapital = totalCapital * this.config.positionConfig.outerRange.allocation;

      // Create core position
      const corePosition = await this.createDLMMPosition(
        dlmmPool,
        coreRange.minBinId,
        coreRange.maxBinId,
        coreCapital
      );

      // Create outer position
      const outerPosition = await this.createDLMMPosition(
        dlmmPool,
        outerRange.minBinId,
        outerRange.maxBinId,
        outerCapital
      );

      if (!corePosition || !outerPosition) {
        logger.error(`Failed to create positions for ${tokenMetrics.symbol}`);
        return null;
      }

      const position: Position = {
        tokenA: new PublicKey(tokenMetrics.mint),
        tokenB: new PublicKey("So11111111111111111111111111111111111111112"), // SOL
        positionPubkey: corePosition.publicKey,
        dlmmPool: dlmmPool.pubkey,
        coreRange: {
          minBinId: coreRange.minBinId,
          maxBinId: coreRange.maxBinId,
          liquidity: new BN(coreCapital)
        },
        outerRange: {
          minBinId: outerRange.minBinId,
          maxBinId: outerRange.maxBinId,
          liquidity: new BN(outerCapital)
        },
        fees: {
          collected: new BN(0),
          pending: new BN(0)
        },
        lastRebalance: new Date(),
        entryPrice: tokenMetrics.price,
        currentPrice: tokenMetrics.price
      };

      this.positions.set(tokenMetrics.symbol, position);
      logger.info(`Successfully created position for ${tokenMetrics.symbol}`);
      return position;

    } catch (error) {
      logger.error(`Error creating position for ${tokenMetrics.symbol}:`, error);
      return null;
    }
  }

  private async findOrCreateDLMMPool(tokenMetrics: TokenMetrics): Promise<DLMM | null> {
    try {
      // Try to find existing pool using pool address
      // In a real implementation, you'd need to query for the pool address
      // For now, we'll use a placeholder approach
      const poolAddress = new PublicKey("11111111111111111111111111111111"); // Placeholder
      const existingPool = await DLMM.create(this.connection, poolAddress);
      
      if (existingPool) {
        return existingPool;
      }

      // If no pool exists, we would need to create one
      // This requires additional setup and permissions
      logger.warn(`No DLMM pool found for ${tokenMetrics.symbol}`);
      return null;

    } catch (error) {
      logger.error(`Error finding DLMM pool for ${tokenMetrics.symbol}:`, error);
      return null;
    }
  }

  private calculateRanges(tokenMetrics: TokenMetrics): {
    coreRange: { minBinId: number; maxBinId: number };
    outerRange: { minBinId: number; maxBinId: number };
  } {
    const currentPrice = tokenMetrics.price;
    const corePercentage = this.config.positionConfig.coreRange.percentage;
    const outerPercentage = this.config.positionConfig.outerRange.percentage;

    // Calculate price ranges
    const coreMinPrice = currentPrice * (1 - corePercentage);
    const coreMaxPrice = currentPrice * (1 + corePercentage);
    const outerMinPrice = currentPrice * (1 - outerPercentage);
    const outerMaxPrice = currentPrice * (1 + outerPercentage);

    // Convert to bin IDs (simplified calculation)
    const coreMinBinId = this.priceToOpenBinId(coreMinPrice);
    const coreMaxBinId = this.priceToOpenBinId(coreMaxPrice);
    const outerMinBinId = this.priceToOpenBinId(outerMinPrice);
    const outerMaxBinId = this.priceToOpenBinId(outerMaxPrice);

    return {
      coreRange: { minBinId: coreMinBinId, maxBinId: coreMaxBinId },
      outerRange: { minBinId: outerMinBinId, maxBinId: outerMaxBinId }
    };
  }

  private priceToOpenBinId(price: number): number {
    // Simplified bin ID calculation
    // In production, use the actual DLMM bin calculation
    return Math.floor(Math.log(price) * 1000);
  }

  private async createDLMMPosition(
    dlmmPool: DLMM,
    minBinId: number,
    maxBinId: number,
    capitalAmount: number
  ): Promise<any> {
    try {
      const activeBin = await dlmmPool.getActiveBin();
      
      const totalXAmount = new BN(capitalAmount * 10 ** 6); // Assuming 6 decimals
      const totalYAmount = new BN(capitalAmount * 10 ** 9); // SOL has 9 decimals

      const positionKeypair = Keypair.generate();
      const initPositionTx = await dlmmPool.initializePositionAndAddLiquidityByStrategy({
        user: this.wallet.publicKey,
        positionPubKey: positionKeypair.publicKey,
        totalXAmount,
        totalYAmount,
        strategy: {
          maxBinId,
          minBinId,
          strategyType: 'Spot' as any
        }
      });

      const txHash = await sendAndConfirmTransaction(
        this.connection,
        Array.isArray(initPositionTx) ? initPositionTx[0] : initPositionTx,
        [this.wallet],
        { skipPreflight: false, preflightCommitment: "singleGossip" }
      );

      logger.info(`Position created with tx: ${txHash}`);
      return { publicKey: new PublicKey(txHash), txHash };

    } catch (error) {
      logger.error('Error creating DLMM position:', error);
      return null;
    }
  }

  async rebalancePosition(symbol: string, tokenMetrics: TokenMetrics): Promise<RebalanceResult> {
    try {
      const position = this.positions.get(symbol);
      if (!position) {
        return { success: false, newRanges: { coreRange: { minBinId: 0, maxBinId: 0 }, outerRange: { minBinId: 0, maxBinId: 0 } }, feesCollected: new BN(0), txHashes: [], error: 'Position not found' };
      }

      logger.info(`Rebalancing position for ${symbol}`);

      // Get DLMM pool
      const dlmmPool = await DLMM.create(this.connection, position.dlmmPool);
      if (!dlmmPool) {
        return { success: false, newRanges: { coreRange: { minBinId: 0, maxBinId: 0 }, outerRange: { minBinId: 0, maxBinId: 0 } }, feesCollected: new BN(0), txHashes: [], error: 'DLMM pool not found' };
      }

      // Collect fees
      const feesCollected = await this.collectFees(dlmmPool, position);

      // Remove liquidity
      const removeTxs = await this.removeLiquidity(dlmmPool, position);

      // Calculate new ranges
      const newRanges = this.calculateRanges(tokenMetrics);

      // Add liquidity with new ranges
      const addTxs = await this.addLiquidityWithNewRanges(dlmmPool, position, newRanges, feesCollected);

      // Update position
      position.coreRange = { ...newRanges.coreRange, liquidity: position.coreRange.liquidity };
      position.outerRange = { ...newRanges.outerRange, liquidity: position.outerRange.liquidity };
      position.lastRebalance = new Date();
      position.currentPrice = tokenMetrics.price;

      const allTxs = [...removeTxs, ...addTxs];
      
      logger.info(`Successfully rebalanced position for ${symbol}`);
      return {
        success: true,
        newRanges,
        feesCollected,
        txHashes: allTxs
      };

    } catch (error) {
      logger.error(`Error rebalancing position for ${symbol}:`, error);
      return { success: false, newRanges: { coreRange: { minBinId: 0, maxBinId: 0 }, outerRange: { minBinId: 0, maxBinId: 0 } }, feesCollected: new BN(0), txHashes: [], error: (error as Error).message };
    }
  }

  private async collectFees(dlmmPool: DLMM, position: Position): Promise<BN> {
    try {
      const userPositions = await dlmmPool.getPositionsByUserAndLbPair(this.wallet.publicKey);
      const claimFeeTxs = await dlmmPool.claimAllSwapFee({
        owner: this.wallet.publicKey,
        positions: userPositions.userPositions
      });

      let totalFees = new BN(0);
      for (const tx of claimFeeTxs) {
        await sendAndConfirmTransaction(this.connection, tx, [this.wallet]);
        // In production, calculate actual fees collected
        totalFees = totalFees.add(new BN(1000)); // Placeholder
      }

      return totalFees;
    } catch (error) {
      logger.error('Error collecting fees:', error);
      return new BN(0);
    }
  }

  private async removeLiquidity(dlmmPool: DLMM, position: Position): Promise<string[]> {
    try {
      const userPositions = await dlmmPool.getPositionsByUserAndLbPair(this.wallet.publicKey);
      const txHashes: string[] = [];

      for (const userPosition of userPositions.userPositions) {
        const binIdsToRemove = userPosition.positionData.positionBinData.map((bin: any) => bin.binId);
        
        const removeTx = await dlmmPool.removeLiquidity({
          position: userPosition.publicKey,
          user: this.wallet.publicKey,
          fromBinId: binIdsToRemove[0],
          toBinId: binIdsToRemove[binIdsToRemove.length - 1],
          bps: new BN(100 * 100), // 100% removal
          shouldClaimAndClose: false
        });

        const txs = Array.isArray(removeTx) ? removeTx : [removeTx];
        for (const tx of txs) {
          const txHash = await sendAndConfirmTransaction(this.connection, tx, [this.wallet]);
          txHashes.push(txHash);
        }
      }

      return txHashes;
    } catch (error) {
      logger.error('Error removing liquidity:', error);
      return [];
    }
  }

  private async addLiquidityWithNewRanges(
    dlmmPool: DLMM,
    position: Position,
    newRanges: any,
    feesCollected: BN
  ): Promise<string[]> {
    try {
      const txHashes: string[] = [];

      // Add core range liquidity
      const coreCapital = position.coreRange.liquidity.add(feesCollected.div(new BN(2)));
      const coreTx = await this.createDLMMPosition(
        dlmmPool,
        newRanges.coreRange.minBinId,
        newRanges.coreRange.maxBinId,
        coreCapital.toNumber()
      );

      if (coreTx) {
        txHashes.push(coreTx.txHash);
      }

      // Add outer range liquidity
      const outerCapital = position.outerRange.liquidity.add(feesCollected.div(new BN(2)));
      const outerTx = await this.createDLMMPosition(
        dlmmPool,
        newRanges.outerRange.minBinId,
        newRanges.outerRange.maxBinId,
        outerCapital.toNumber()
      );

      if (outerTx) {
        txHashes.push(outerTx.txHash);
      }

      return txHashes;
    } catch (error) {
      logger.error('Error adding liquidity with new ranges:', error);
      return [];
    }
  }

  private getTotalCapital(): number {
    // Simplified capital calculation
    // In production, get actual wallet balance
    return 10000; // $10,000 portfolio
  }

  async closePosition(symbol: string): Promise<boolean> {
    try {
      const position = this.positions.get(symbol);
      if (!position) {
        logger.warn(`Position for ${symbol} not found`);
        return false;
      }

      const dlmmPool = await DLMM.create(this.connection, position.dlmmPool);
      if (!dlmmPool) {
        logger.error(`DLMM pool not found for ${symbol}`);
        return false;
      }

      const userPositions = await dlmmPool.getPositionsByUserAndLbPair(this.wallet.publicKey);
      
      for (const userPosition of userPositions.userPositions) {
        const closePositionTx = await dlmmPool.closePosition({
          owner: this.wallet.publicKey,
          position: userPosition
        });

        await sendAndConfirmTransaction(this.connection, closePositionTx, [this.wallet]);
      }

      this.positions.delete(symbol);
      logger.info(`Successfully closed position for ${symbol}`);
      return true;

    } catch (error) {
      logger.error(`Error closing position for ${symbol}:`, error);
      return false;
    }
  }

  getPositions(): Map<string, Position> {
    return this.positions;
  }

  getPosition(symbol: string): Position | undefined {
    return this.positions.get(symbol);
  }
} 