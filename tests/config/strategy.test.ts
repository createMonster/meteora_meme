/**
 * Strategy Configuration Tests
 */

import { describe, expect, test } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

describe('Strategy Configuration', () => {
  test('should have valid strategy.json config file', () => {
    const configPath = path.join(__dirname, '../../config/strategy.json');
    expect(fs.existsSync(configPath)).toBe(true);
    
    const configData = fs.readFileSync(configPath, 'utf8');
    const config = JSON.parse(configData);
    
    expect(config).toBeDefined();
    expect(config.strategy).toBeDefined();
    expect(config.filters).toBeDefined();
    expect(config.volatilityTiers).toBeDefined();
    expect(config.positionConfig).toBeDefined();
    expect(config.riskManagement).toBeDefined();
    expect(config.tokens).toBeDefined();
    expect(config.monitoring).toBeDefined();
  });

  test('should have required strategy fields', () => {
    const configPath = path.join(__dirname, '../../config/strategy.json');
    const configData = fs.readFileSync(configPath, 'utf8');
    const config = JSON.parse(configData);
    
    expect(config.strategy.name).toBeDefined();
    expect(config.strategy.version).toBeDefined();
    expect(config.strategy.maxPositions).toBeGreaterThan(0);
    expect(config.strategy.capitalPerPool).toBeGreaterThan(0);
    expect(config.strategy.capitalPerPool).toBeLessThanOrEqual(1);
  });

  test('should have valid filter thresholds', () => {
    const configPath = path.join(__dirname, '../../config/strategy.json');
    const configData = fs.readFileSync(configPath, 'utf8');
    const config = JSON.parse(configData);
    
    expect(config.filters.minMarketCap).toBeGreaterThan(0);
    expect(config.filters.minVolumeRatio).toBeGreaterThan(0);
    expect(config.filters.minVolumeRatio).toBeLessThanOrEqual(1);
    expect(config.filters.minAge).toBeGreaterThan(0);
  });

  test('should have valid volatility tiers', () => {
    const configPath = path.join(__dirname, '../../config/strategy.json');
    const configData = fs.readFileSync(configPath, 'utf8');
    const config = JSON.parse(configData);
    
    expect(config.volatilityTiers.low.threshold).toBeLessThan(config.volatilityTiers.medium.threshold);
    expect(config.volatilityTiers.medium.threshold).toBeLessThan(config.volatilityTiers.high.threshold);
    
    expect(config.volatilityTiers.low.feeRate).toBeGreaterThan(0);
    expect(config.volatilityTiers.medium.feeRate).toBeGreaterThan(0);
    expect(config.volatilityTiers.high.feeRate).toBeGreaterThan(0);
  });

  test('should have valid position config', () => {
    const configPath = path.join(__dirname, '../../config/strategy.json');
    const configData = fs.readFileSync(configPath, 'utf8');
    const config = JSON.parse(configData);
    
    expect(config.positionConfig.coreRange.percentage).toBeGreaterThan(0);
    expect(config.positionConfig.coreRange.percentage).toBeLessThan(config.positionConfig.outerRange.percentage);
    
    expect(config.positionConfig.coreRange.allocation + config.positionConfig.outerRange.allocation).toBe(1);
    expect(config.positionConfig.rebalanceThreshold).toBeGreaterThan(0);
    expect(config.positionConfig.rebalanceThreshold).toBeLessThanOrEqual(1);
  });

  test('should have valid token configurations', () => {
    const configPath = path.join(__dirname, '../../config/strategy.json');
    const configData = fs.readFileSync(configPath, 'utf8');
    const config = JSON.parse(configData);
    
    expect(Array.isArray(config.tokens)).toBe(true);
    expect(config.tokens.length).toBeGreaterThan(0);
    
    config.tokens.forEach((token: any) => {
      expect(token.symbol).toBeDefined();
      expect(token.mint).toBeDefined();
      expect(typeof token.enabled).toBe('boolean');
    });
  });
}); 