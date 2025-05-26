.PHONY: help build run run-detached stop logs test clean install dev health buy-stock portfolio

# Default target
help:
	@echo "Stock Trading Service - Available commands:"
	@echo "  make install       - Install dependencies"
	@echo "  make dev          - Run in development mode (local)"
	@echo "  make build        - Build Docker image"
	@echo "  make run          - Run with Docker Compose (attached)"
	@echo "  make run-detached - Run with Docker Compose (background)"
	@echo "  make stop         - Stop all containers"
	@echo "  make logs         - Show logs"
	@echo "  make test         - Run tests"
	@echo "  make clean        - Clean up containers and volumes"
	@echo "  make health       - Check service health"
	@echo "  make buy-stock    - Example: Buy stock transaction"
	@echo "  make portfolio    - Example: Check portfolio"

# Local development
install:
	npm install

dev:
	npm run dev

# Docker commands
build:
	docker-compose build

run:
	docker-compose up --build

run-detached:
	docker-compose up -d --build
	@echo "Services started!"
	@echo "- API: http://localhost:3000"
	@echo "- Mailhog: http://localhost:8025"

stop:
	docker-compose stop

logs:
	docker-compose logs -f stock-trading-service

clean:
	docker-compose down -v
	@echo "Cleaned up containers and volumes"

# Testing
test:
	@if [ -f /.dockerenv ]; then \
		npm test; \
	else \
		docker-compose exec stock-trading-service npm test 2>/dev/null || echo "Container not running. Start with 'make run-detached' first"; \
	fi

# Health check
health:
	@curl -s http://localhost:3000/health | jq '.' 2>/dev/null || \
		(echo "Service health check failed. Is the service running?" && exit 1)

# Example API calls
buy-stock:
	@echo "Buying 5 shares of AAPL..."
	@curl -s -X POST http://localhost:3000/api/transactions/buy \
		-H "Content-Type: application/json" \
		-d '{"userId": "test-user", "symbol": "AAPL", "price": 175.50, "quantity": 5}' | \
		jq '.' 2>/dev/null || echo "Failed. Is the service running?"

portfolio:
	@echo "Checking portfolio for test-user..."
	@curl -s http://localhost:3000/api/portfolio/test-user | \
		jq '.' 2>/dev/null || echo "Failed. Is the service running?"

# Development workflow shortcuts
restart: stop run-detached

rebuild: clean build run-detached

# Show running containers
ps:
	docker-compose ps