# Stock Trading Service

A production-ready backend service for stock trading operations that integrates with a vendor API to manage stock transactions and portfolios.

## Features

- **Stock Management**: List available stocks with pagination support
- **Portfolio Tracking**: Get user portfolios with real-time stock valuations
- **Transaction Processing**: Execute stock purchases with price deviation validation
- **Daily Reports**: Automated email reports of successful and failed transactions
- **Resilient Architecture**: Retry logic, caching, and error handling for unreliable vendor APIs

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Docker and Docker Compose (optional, for containerized deployment)
- SMTP server credentials for email reports

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd stock-trading-service
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash
cp .env.example .env
```

4. Configure your `.env` file with appropriate values:
   - Update SMTP settings for email reports
   - Adjust service configuration as needed

## Running the Service

### Option 1: Local Development

#### Development Mode
```bash
npm run dev
```

#### Production Mode
```bash
npm start
```

The service will start on port 3000 by default (configurable via PORT environment variable).

### Option 2: Docker (Recommended)

#### Using Docker Compose
```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f stock-trading-service

# Stop services
docker-compose down
```

This will start:
- Stock Trading Service on http://localhost:3000
- Mailhog (email testing) on http://localhost:8025

#### Using Docker directly
```bash
# Build image
docker build -t stock-trading-service .

# Run container
docker run -d \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e VENDOR_API_KEY=nSbPbFJfe95BFZufiDwF32UhqZLEVQ5K4wdtJI2e \
  --name stock-trading-api \
  stock-trading-service
```

## API Endpoints

### 1. List Available Stocks
```http
GET /api/stocks
```

Query Parameters:
- `page` (optional): Page number for pagination
- `limit` (optional): Items per page (max 100)

Response:
```json
{
  "status": 200,
  "data": {
    "items": [...],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 150,
      "totalPages": 3,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

### 2. Get User Portfolio
```http
GET /api/portfolio/:userId
```

Response:
```json
{
  "status": 200,
  "data": {
    "userId": "user123",
    "holdings": [
      {
        "symbol": "AAPL",
        "name": "Apple Inc.",
        "quantity": 10,
        "currentPrice": 175.50,
        "totalValue": 1755.00,
        "currency": "USD"
      }
    ],
    "totalValue": 1755.00,
    "lastUpdated": "2024-01-15T10:30:00.000Z"
  }
}
```

### 3. Execute Stock Purchase
```http
POST /api/transactions/buy
```

Request Body:
```json
{
  "userId": "user123",
  "symbol": "AAPL",
  "price": 175.50,
  "quantity": 10
}
```

Response:
```json
{
  "status": 201,
  "message": "Stock purchase completed successfully",
  "data": {
    "transactionId": "550e8400-e29b-41d4-a716-446655440000",
    "symbol": "AAPL",
    "quantity": 10,
    "price": 175.50,
    "total": 1755.00,
    "status": "SUCCESS",
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

### Health Check
```http
GET /health
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 3000 |
| `NODE_ENV` | Environment (development/production) | production |
| `VENDOR_API_BASE_URL` | Vendor API base URL | https://api.challenge.fusefinance.com |
| `VENDOR_API_KEY` | Vendor API key | - |
| `API_TIMEOUT` | API request timeout (ms) | 30000 |
| `API_RETRY_ATTEMPTS` | Number of retry attempts | 3 |
| `MAX_PRICE_DEVIATION_PERCENT` | Maximum allowed price deviation | 2 |
| `CACHE_TTL_SECONDS` | Cache time-to-live | 300 |
| `DAILY_REPORT_SCHEDULE` | Cron schedule for reports | 0 9 * * * |

### Email Configuration

Configure SMTP settings in `.env` for daily reports:
- `SMTP_HOST`: SMTP server host
- `SMTP_PORT`: SMTP server port
- `SMTP_USER`: SMTP username
- `SMTP_PASS`: SMTP password
- `EMAIL_FROM`: Sender email address
- `EMAIL_TO`: Recipient email address

## Error Handling

The service implements comprehensive error handling:

- **400 Bad Request**: Invalid request parameters or price deviation exceeded
- **404 Not Found**: Resource not found (e.g., invalid stock symbol)
- **500 Internal Server Error**: Server-side errors
- **503 Service Unavailable**: Vendor API unavailable

## Logging

Logs are written to:
- Console (all environments)
- `logs/error.log` (production, errors only)
- `logs/combined.log` (production, all logs)

## Architecture Decisions

- **Express.js**: Lightweight and flexible web framework
- **In-memory storage**: Used for demo purposes (replace with database in production)
- **Retry mechanism**: Handles unreliable vendor API with exponential backoff
- **Caching**: 5-minute cache for stock prices to reduce API calls
- **Validation**: Input validation using Joi
- **Security**: Helmet for security headers, rate limiting for API protection

## Testing

Run tests:
```bash
npm test
```

Run tests with coverage:
```bash
npm run test:watch
```

## Production Considerations

1. **Database**: Replace in-memory storage with a persistent database (PostgreSQL, MongoDB)
2. **Queue System**: Use message queue (RabbitMQ, SQS) for transaction processing
3. **Monitoring**: Implement APM tools (New Relic, DataDog)
4. **Scaling**: Deploy with PM2 or containerize with Docker
5. **Security**: Add authentication/authorization middleware

## Docker Deployment

The service includes Docker support for easy deployment:

- **Multi-stage build**: Optimized image size (~170MB)
- **Security**: Runs as non-root user
- **Signal handling**: Proper shutdown with dumb-init
- **Health checks**: Built-in monitoring
- **Email testing**: Includes Mailhog for development

### Production Docker Tips

```bash
# Build for production
docker build -t stock-trading-service:prod --target production .

# Run with volume for logs
docker run -d \
  -v $(pwd)/logs:/app/logs \
  -p 3000:3000 \
  --env-file .env.production \
  stock-trading-service:prod
```

## License

ISC