/**
 * Logger Tests
 */

import { describe, expect, test } from '@jest/globals';

describe('Logger Configuration', () => {
  test('should have logger export', () => {
    // Simple test to verify module structure
    const loggerModule = require('../../src/utils/logger');
    expect(loggerModule).toBeDefined();
    expect(loggerModule.default).toBeDefined();
  });

  test('should have logger methods', () => {
    const loggerModule = require('../../src/utils/logger');
    const logger = loggerModule.default;
    
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.error).toBe('function');
  });
}); 