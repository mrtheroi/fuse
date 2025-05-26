const vendorClient = require('./vendorClient');
const cache = require('../utils/cache');
const logger = require('../utils/logger');

class StockService {
    constructor() {
        this.cacheTTL = parseInt(process.env.CACHE_TTL_SECONDS) || 300; // 5 minutes
    }

    async getAllStocks() {
        try {
            // Check cache first
            const cachedStocks = cache.get('all_stocks');
            if (cachedStocks) {
                logger.debug('Returning cached stocks');
                return cachedStocks;
            }

            // Fetch all stocks with pagination
            const allStocks = [];
            let nextToken = null;
            let pageCount = 0;

            do {
                logger.info(`Fetching stocks page ${pageCount + 1}`);
                const response = await vendorClient.getStocks(nextToken);

                if (response.items && Array.isArray(response.items)) {
                    allStocks.push(...response.items);
                    nextToken = response.nextToken;
                    pageCount++;
                } else {
                    logger.warn('Invalid response structure from vendor API');
                    break;
                }
            } while (nextToken);

            logger.info(`Fetched ${allStocks.length} stocks in ${pageCount} pages`);

            // Cache the results
            cache.set('all_stocks', allStocks, this.cacheTTL);

            return allStocks;
        } catch (error) {
            logger.error('Error in getAllStocks:', error);
            throw error;
        }
    }

    async getStockBySymbol(symbol) {
        try {
            const stocks = await this.getAllStocks();
            const stock = stocks.find(s => s.symbol === symbol);

            if (!stock) {
                const error = new Error(`Stock with symbol ${symbol} not found`);
                error.status = 404;
                throw error;
            }

            return stock;
        } catch (error) {
            logger.error(`Error getting stock ${symbol}:`, error);
            throw error;
        }
    }

    validatePriceDeviation(requestedPrice, currentPrice) {
        const maxDeviation = parseFloat(process.env.MAX_PRICE_DEVIATION_PERCENT) || 2;
        const deviation = Math.abs(((requestedPrice - currentPrice) / currentPrice) * 100);

        logger.debug(`Price deviation check: requested=${requestedPrice}, current=${currentPrice}, deviation=${deviation.toFixed(2)}%`);

        return {
            isValid: deviation <= maxDeviation,
            deviation: deviation.toFixed(2),
            maxAllowed: maxDeviation
        };
    }

    async buyStock(symbol, requestedPrice, quantity, userId) {
        try {
            // Get current stock price
            const stock = await this.getStockBySymbol(symbol);
            const currentPrice = stock.price;

            // Validate price deviation
            const validation = this.validatePriceDeviation(requestedPrice, currentPrice);

            if (!validation.isValid) {
                const error = new Error(
                    `Price deviation of ${validation.deviation}% exceeds maximum allowed ${validation.maxAllowed}%. ` +
                    `Current price: $${currentPrice}, Requested price: $${requestedPrice}`
                );
                error.status = 400;
                error.code = 'PRICE_DEVIATION_EXCEEDED';
                throw error;
            }

            // Attempt to buy stock
            const result = await vendorClient.buyStock(symbol, requestedPrice, quantity);

            // Record successful transaction
            const transaction = {
                id: result?.transactionId || require('uuid').v4(),
                userId,
                symbol,
                name: stock.name,
                quantity,
                requestedPrice,
                currentPrice,
                deviation: validation.deviation,
                status: 'SUCCESS',
                timestamp: new Date().toISOString()
            };

            // Store transaction (in memory for this example, should be in DB)
            this.recordTransaction(transaction);

            return transaction;
        } catch (error) {
            // Record failed transaction
            const transaction = {
                id: require('uuid').v4(),
                userId,
                symbol,
                quantity,
                requestedPrice,
                status: 'FAILED',
                error: error.message,
                errorCode: error.code,
                timestamp: new Date().toISOString()
            };

            this.recordTransaction(transaction);

            throw error;
        }
    }

    recordTransaction(transaction) {
        // In production, this should be stored in a database
        const transactions = cache.get('transactions') || [];
        transactions.push(transaction);
        cache.set('transactions', transactions);

        logger.info(`Transaction recorded: ${transaction.status} - ${transaction.symbol}`, {
            transactionId: transaction.id,
            userId: transaction.userId
        });
    }

    getTransactions(filters = {}) {
        const transactions = cache.get('transactions') || [];

        // Apply filters
        let filtered = transactions;

        if (filters.userId) {
            filtered = filtered.filter(t => t.userId === filters.userId);
        }

        if (filters.status) {
            filtered = filtered.filter(t => t.status === filters.status);
        }

        if (filters.date) {
            const startOfDay = new Date(filters.date);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(filters.date);
            endOfDay.setHours(23, 59, 59, 999);

            filtered = filtered.filter(t => {
                const transactionDate = new Date(t.timestamp);
                return transactionDate >= startOfDay && transactionDate <= endOfDay;
            });
        }

        return filtered;
    }
}

module.exports = new StockService();