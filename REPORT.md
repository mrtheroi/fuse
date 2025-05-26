# Architecture Report - Stock Trading Service

## Executive Summary

This document describes the architecture and design decisions for the Stock Trading Service, a backend system that integrates with an external vendor API to handle stock trading operations. The service is built with Node.js and Express, focusing on reliability, scalability, and production readiness.

## Architecture Overview

### High-Level Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│   Clients   │────▶│ Stock Trading│────▶│   Vendor API    │
│  (Frontend) │◀────│   Service    │◀────│ (Fuse Finance)  │
└─────────────┘     └──────────────┘     └─────────────────┘
                            │
                            ▼
                    ┌──────────────┐
                    │ Email Service│
                    │   (SMTP)     │
                    └──────────────┘
```

### Service Components

1. **API Layer**: RESTful endpoints for stock operations
2. **Business Logic Layer**: Stock trading, portfolio management, transaction processing
3. **Integration Layer**: Vendor API client with retry logic
4. **Caching Layer**: In-memory cache for stock prices
5. **Reporting System**: Automated daily report generation
6. **Utilities**: Logging, error handling, validation

## Key Design Decisions

### 1. Framework Selection - Express.js

**Decision**: Used Express.js as the web framework

**Rationale**:
- Lightweight and unopinionated, allowing flexible architecture
- Excellent ecosystem with middleware support
- Production-proven with large-scale deployments
- Easy to understand and maintain

### 2. Resilient Vendor Integration

**Decision**: Implemented retry mechanism with exponential backoff using axios-retry

**Rationale**:
- Vendor API is noted as unreliable
- Exponential backoff prevents overwhelming the vendor
- Configurable retry attempts for different environments
- Circuit breaker pattern consideration for future

### 3. Caching Strategy

**Decision**: 5-minute in-memory cache for stock prices

**Rationale**:
- Stock prices change every 5 minutes per requirements
- Reduces unnecessary API calls
- Improves response times
- Simple implementation for MVP

**Trade-offs**:
- Cache invalidation complexity in distributed systems
- Memory usage considerations for large datasets

### 4. Data Storage

**Decision**: In-memory storage for MVP, designed for easy database migration

**Rationale**:
- Quick implementation for demonstration
- Service layer abstraction allows easy database integration
- Clear separation of concerns

**Production Recommendation**:
- PostgreSQL for transactional data
- Redis for caching and session management

### 5. Transaction Processing

**Decision**: Synchronous processing with immediate validation

**Rationale**:
- Simple and straightforward for MVP
- Immediate feedback to users
- Price validation before vendor API call

**Future Enhancement**:
- Message queue for asynchronous processing
- Saga pattern for complex transactions

### 6. Error Handling Strategy

**Decision**: Centralized error handling with custom error types

**Components**:
- Global error middleware
- Structured error responses
- Comprehensive logging
- Client-friendly error messages

### 7. Security Measures

**Implemented**:
- Helmet.js for security headers
- Rate limiting per IP
- Input validation with Joi
- CORS configuration

**Not Implemented** (for production):
- Authentication/Authorization
- API key management
- Request signing

### 8. Daily Reporting System

**Decision**: Cron-based scheduler with HTML email reports

**Features**:
- Configurable schedule
- HTML formatted reports
- JSON attachment for data processing
- Transaction grouping by user

## Scalability Considerations

### Horizontal Scaling

The service is stateless (except for in-memory cache), allowing:
- Multiple instances behind load balancer
- Containerization with Docker/Kubernetes
- Auto-scaling based on metrics

### Performance Optimizations

1. **Caching**: Reduces vendor API calls
2. **Pagination**: Limits memory usage for large datasets
3. **Async Processing**: Non-blocking I/O operations
4. **Connection Pooling**: For future database connections

## Reliability Measures

1. **Retry Logic**: Handles transient failures
2. **Circuit Breaker**: Prevents cascading failures (future)
3. **Health Checks**: Monitoring endpoint
4. **Graceful Shutdown**: Proper cleanup on termination
5. **Comprehensive Logging**: Debugging and auditing

## Testing Strategy

### Unit Tests
- Service layer business logic
- Validation functions
- Utility functions

### Integration Tests
- API endpoint testing
- Vendor client mocking
- Error scenarios

### End-to-End Tests
- Complete transaction flows
- Report generation

## Containerization Strategy

### Docker Implementation

The service includes comprehensive Docker support demonstrating production-ready deployment practices:

#### 1. **Multi-Container Architecture**
```yaml
services:
  stock-trading-service:  # Main application
  mailhog:               # Email testing service
```

**Rationale**:
- Separation of concerns
- Easy local testing of email functionality
- Mimics production architecture with external services

#### 2. **Docker Best Practices Implemented**

##### Security Measures
```dockerfile
# Non-root user execution
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
USER nodejs

# Minimal base image
FROM node:18-alpine
```

##### Build Optimization
- Alpine Linux for smaller image size (~170MB vs ~1GB)
- Production dependencies only
- Layer caching optimization

##### Signal Handling
```dockerfile
# Proper PID 1 signal handling
ENTRYPOINT ["dumb-init", "--"]
```

#### 3. **Development Experience**

Included Makefile for common operations:
```bash
make run          # Start all services
make logs         # View logs
make test         # Run tests
make buy-stock    # API example
```

**Benefits**:
- Consistent commands across team
- Self-documenting operations
- Reduced onboarding time

#### 4. **Health Monitoring**

```yaml
healthcheck:
  test: ["CMD", "node", "-e", "require('http').get(...)"]
  interval: 30s
  timeout: 10s
```

Ensures container orchestrators can:
- Detect unhealthy instances
- Perform automatic restarts
- Route traffic appropriately

### Production Deployment Considerations

While the current Docker implementation is functional, production deployment would include:

1. **Secret Management**
   - Docker secrets or Kubernetes secrets
   - HashiCorp Vault integration
   - Never hardcode sensitive data

2. **Persistent Storage**
   - Volume mounts for logs
   - Database data persistence
   - Backup strategies

3. **Orchestration Ready**
   ```yaml
   # Kubernetes deployment example
   apiVersion: apps/v1
   kind: Deployment
   metadata:
     name: stock-trading-service
   spec:
     replicas: 3
     template:
       spec:
         containers:
         - name: app
           image: stock-trading-service:latest
           resources:
             requests:
               memory: "256Mi"
               cpu: "250m"
             limits:
               memory: "512Mi"
               cpu: "500m"
   ```

4. **CI/CD Integration**
   ```bash
   # GitLab CI example
   build:
     stage: build
     script:
       - docker build -t $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA .
       - docker push $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA
   ```

5. **Monitoring & Observability**
   - Prometheus metrics endpoint
   - Structured logging for log aggregation
   - Distributed tracing headers

### Development Workflow

The containerized approach enables:

1. **Consistent Environments**: Dev/Staging/Prod parity
2. **Easy Onboarding**: New developers run one command
3. **Service Isolation**: No local dependency conflicts
4. **Testing**: Mailhog provides email testing without SMTP setup

### Performance Considerations

Docker overhead is minimal:
- ~2-3% CPU overhead
- ~10MB memory overhead
- Negligible network latency in same host

Benefits outweigh costs:
- Deployment consistency
- Horizontal scaling capability
- Rolling updates with zero downtime

## Monitoring and Observability

### Logging
- Structured JSON logging with Winston
- Log levels based on environment
- File and console transports

### Metrics (Future)
- Response times
- Error rates
- Transaction success/failure rates
- Vendor API availability

### Recommended Tools
- Prometheus/Grafana for metrics
- ELK Stack for log aggregation
- Sentry for error tracking

## Deployment Strategy

### Development
```bash
npm run dev
```

### Production
1. Environment configuration
2. Process manager (PM2)
3. Reverse proxy (Nginx)
4. SSL/TLS termination

### Containerization
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["node", "src/index.js"]
```

## Future Enhancements

1. **Database Integration**
   - PostgreSQL for transactions
   - MongoDB for flexible schemas
   - Redis for distributed caching

2. **Authentication & Authorization**
   - JWT-based authentication
   - Role-based access control
   - API key management

3. **Advanced Features**
   - WebSocket for real-time prices
   - Order types (limit, stop-loss)
   - Portfolio analytics

4. **Infrastructure**
   - Message queuing (RabbitMQ/SQS)
   - Service mesh (Istio)
   - API Gateway

## Conclusion

The Stock Trading Service architecture prioritizes reliability, maintainability, and scalability. While the current implementation uses in-memory storage for simplicity, the service layer abstraction and modular design allow for easy migration to production-grade infrastructure. The focus on error handling, retry logic, and comprehensive logging ensures the service can handle the challenges of integrating with an unreliable vendor API while providing a stable experience for users.