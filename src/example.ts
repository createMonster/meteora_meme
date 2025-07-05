/**
 * Example usage of the Meteora Meme Pool Strategy
 * 
 * This example demonstrates how to initialize and run the strategy
 * with a minimal configuration for testing purposes.
 */

import { MemePoolStrategy } from './strategy';
import logger from './utils/logger';

async function runExample() {
  logger.info('🚀 Starting Meteora Meme Pool Strategy Example');

  try {
    // Initialize strategy with config
    const strategy = new MemePoolStrategy('./config/strategy.json');

    // Get strategy metrics
    const metrics = strategy.getMetrics();
    logger.info('📊 Initial Metrics:', metrics);

    // Get token metrics (this will use mock data for demonstration)
    const tokens = await strategy.getTokenMetrics();
    logger.info('🪙 Token Metrics:', tokens);

    // Get current positions
    const positions = strategy.getPositions();
    logger.info('📍 Current Positions:', positions.size);

    logger.info('✅ Example completed successfully');
    
  } catch (error) {
    logger.error('❌ Example failed:', error);
  }
}

// Run example if this file is executed directly
if (require.main === module) {
  runExample().catch(console.error);
}

export { runExample }; 