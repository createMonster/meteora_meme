#!/usr/bin/env node

import { MemePoolStrategy } from './strategy';
import logger from './utils/logger';

/**
 * Meteora Meme Pool Fee Harvest Strategy
 * 
 * This application implements an automated strategy for harvesting fees from
 * meme token pools using Meteora's DLMM (Dynamic Liquidity Market Maker).
 * 
 * Usage:
 *   npm run start              - Start the strategy with default config
 *   npm run dev                - Start in development mode
 *   CONFIG_FILE=path npm start - Start with custom config
 */

async function main() {
  const configPath = process.env.CONFIG_FILE || './config/strategy.json';
  
  logger.info('🚀 Starting Meteora Meme Pool Strategy');
  logger.info(`Configuration: ${configPath}`);
  
  try {
    const strategy = new MemePoolStrategy(configPath);
    
    // Handle graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}, shutting down gracefully...`);
      await strategy.stop();
      process.exit(0);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception:', error);
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled rejection at:', promise, 'reason:', reason);
      process.exit(1);
    });

    // Start the strategy
    await strategy.start();
    
    logger.info('✓ Strategy is running...');
    
  } catch (error) {
    logger.error('Failed to start strategy:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { MemePoolStrategy } from './strategy';
export * from './types';
export { DataProvider } from './providers/dataProvider';
export { PositionManager } from './managers/positionManager';
export { RiskManager } from './managers/riskManager'; 