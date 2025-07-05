# Testing and CI/CD Setup

## Overview

This document describes the testing and continuous integration setup for the Meteora Meme Strategy project.

## Testing Framework

### Jest Configuration
- **Testing Framework**: Jest with ts-jest preset
- **Test Environment**: Node.js
- **Coverage**: Comprehensive coverage reporting with lcov, text, and HTML formats
- **Test Files**: Located in `tests/` directory with pattern `*.test.ts`

### Test Structure
```
tests/
├── setup.ts              # Test setup and global utilities
├── config/
│   └── strategy.test.ts   # Strategy configuration validation
├── utils/
│   └── logger.test.ts     # Logger utility tests
└── integration/
    └── types.test.ts      # Type definition tests
```

### Test Categories
1. **Configuration Tests**: Validate strategy.json structure and values
2. **Utility Tests**: Test logger and helper functions
3. **Integration Tests**: Test type imports and basic functionality

## Code Quality

### TypeScript Compilation
- **Linting**: `npm run lint` - TypeScript compiler with --noEmit flag
- **Build**: `npm run build` - Full TypeScript compilation to dist/
- **Type Safety**: Strict TypeScript configuration with comprehensive type checking

### Code Coverage
Current test coverage focuses on:
- Configuration validation (100%)
- Logger utility (100%)
- Type imports and basic functionality

## CI/CD Pipeline

### GitHub Actions Workflow (`.github/workflows/ci.yml`)

#### Jobs

1. **Test Job**
   - Runs on Ubuntu with Node.js 18.x and 20.x matrix
   - Installs dependencies with `npm ci`
   - Runs linting with `npm run lint`
   - Executes tests with `npm run test:ci`
   - Uploads coverage to Codecov

2. **Build Job**
   - Compiles TypeScript to JavaScript
   - Archives production artifacts
   - Requires test job to pass

3. **Security Job**
   - Runs `npm audit` for security vulnerabilities
   - Performs dependency checks
   - Continues on error for non-blocking issues

4. **Docker Job**
   - Builds and pushes Docker images to GitHub Container Registry
   - Only runs on main branch after tests pass
   - Tags images with both `latest` and commit SHA

5. **Release Job**
   - Automated releases for commits with `release:` prefix
   - Creates GitHub releases with version tags
   - Runs only on main branch after all checks pass

### Environment Variables
Required secrets in GitHub repository:
- `TEST_PRIVATE_KEY`: For running tests
- `CODECOV_TOKEN`: For coverage reporting
- `GITHUB_TOKEN`: For Docker and releases (automatic)

## Docker Setup

### Production Dockerfile
- Multi-stage build for optimized production image
- Security: Non-root user, health checks
- Alpine Linux base for minimal attack surface

### Development Dockerfile
- Hot reload with nodemon
- Development dependencies included
- Debug port exposed (9229)

### Docker Compose
- Production and development services
- Optional monitoring stack (Prometheus, Grafana)
- Volume mounts for logs and configuration

## Running Tests

### Local Development
```bash
# Install dependencies
npm install

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run linting
npm run lint

# Build project
npm run build
```

### Docker Development
```bash
# Start development environment
docker-compose --profile dev up

# Start with monitoring
docker-compose --profile dev --profile monitoring up

# Run tests in container
docker-compose exec meteora-strategy-dev npm test
```

## Test Scripts

- `npm test`: Run all tests
- `npm run test:watch`: Run tests in watch mode
- `npm run test:coverage`: Run tests with coverage report
- `npm run test:ci`: Run tests for CI (coverage + no watch)
- `npm run lint`: TypeScript linting
- `npm run clean`: Clean build artifacts

## Monitoring

### Prometheus Configuration
- Located in `monitoring/prometheus.yml`
- Scrapes metrics from strategy application
- Configurable alert rules

### Grafana Dashboard
- Pre-configured dashboards for strategy metrics
- Performance monitoring and alerting
- Accessible at `localhost:3001` in development

## Security Considerations

### API Key Management
- Use environment variables for sensitive data
- Never commit private keys or API tokens
- Use `env.template` as a reference for required variables

### Docker Security
- Non-root user in containers
- Health checks for service monitoring
- Secure volume mounts (read-only where possible)

### CI/CD Security
- Secrets management through GitHub Actions
- Dependency vulnerability scanning
- Automated security audits

## Continuous Improvement

### Areas for Enhancement
1. **Test Coverage**: Increase coverage for core business logic
2. **Integration Tests**: Add tests for external API interactions
3. **Performance Tests**: Load testing for high-frequency operations
4. **Security Tests**: Static analysis and penetration testing
5. **E2E Tests**: End-to-end testing with test networks

### Monitoring Improvements
1. **Custom Metrics**: Strategy-specific performance metrics
2. **Alerting**: Real-time alerts for risk management
3. **Logging**: Structured logging with correlation IDs
4. **Tracing**: Distributed tracing for complex operations

## Contributing

When adding new features:
1. Write tests first (TDD approach)
2. Ensure test coverage doesn't decrease
3. Update documentation
4. Run full test suite before committing
5. Include relevant test cases in PRs

### Test Guidelines
- Use descriptive test names
- Test both success and failure scenarios
- Mock external dependencies properly
- Keep tests isolated and deterministic
- Include edge cases and boundary conditions 