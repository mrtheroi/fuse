const cache = require('../utils/cache');
const stockService = require('./stockService');
const logger = require('../utils/logger');

class PortfolioService {
    constructor() {
        // In production, this should use a database
        // For this example, we'll use in-memory storage
        this.portfolios = new Map();
    }

    async getUserPortfolio(userId) {
        try {
            // Get user's holdings
            let holdings = this.portfolios.get(userId) || {};

            logger.debug(`Getting portfolio for user ${userId}:`, {
                hasHoldings: Object.keys(holdings).length > 0,
                holdings: holdings
            });

            // Get current stock prices
            const stocks = await stockService.getAllStocks();
            const stockPriceMap = new Map(stocks.map(s => [s.symbol, s]));

            // Build portfolio with current values
            const portfolio = {
                userId,
                holdings: [],
                totalValue: 0,
                lastUpdated: new Date().toISOString()
            };

            for (const [symbol, quantity] of Object.entries(holdings)) {
                const stockInfo = stockPriceMap.get(symbol);
                if (stockInfo) {
                    const holding = {
                        symbol,
                        name: stockInfo.name,
                        quantity,
                        currentPrice: stockInfo.price,
                        totalValue: quantity * stockInfo.price,
                        currency: stockInfo.currency || 'USD'
                    };
                    portfolio.holdings.push(holding);
                    portfolio.totalValue += holding.totalValue;
                }
            }

            // Sort holdings by total value (descending)
            portfolio.holdings.sort((a, b) => b.totalValue - a.totalValue);

            logger.info(`Retrieved portfolio for user ${userId}`, {
                holdings: portfolio.holdings.length,
                totalValue: portfolio.totalValue
            });

            return portfolio;
        } catch (error) {
            logger.error(`Error getting portfolio for user ${userId}:`, error);
            throw error;
        }
    }

    addToPortfolio(userId, symbol, quantity) {
        try {
            const holdings = this.portfolios.get(userId) || {};
            holdings[symbol] = (holdings[symbol] || 0) + quantity;
            this.portfolios.set(userId, holdings);

            logger.info(`Added ${quantity} shares of ${symbol} to user ${userId} portfolio`, {
                currentHoldings: holdings[symbol],
                totalSymbols: Object.keys(holdings).length
            });

            // Debug: log current state
            logger.debug('Current portfolio state:', {
                userId,
                holdings: holdings
            });
        } catch (error) {
            logger.error('Error adding to portfolio:', error);
            throw error;
        }
    }

    updatePortfolioFromTransaction(transaction) {
        logger.debug('Updating portfolio from transaction:', {
            transactionId: transaction.id,
            userId: transaction.userId,
            symbol: transaction.symbol,
            quantity: transaction.quantity,
            status: transaction.status
        });

        if (transaction.status === 'SUCCESS') {
            this.addToPortfolio(
                transaction.userId,
                transaction.symbol,
                transaction.quantity
            );
        }
    }

    // Get portfolio summary for reporting
    async getPortfolioSummary(userId) {
        const portfolio = await this.getUserPortfolio(userId);

        return {
            userId,
            totalHoldings: portfolio.holdings.length,
            totalValue: portfolio.totalValue,
            topHoldings: portfolio.holdings.slice(0, 5).map(h => ({
                symbol: h.symbol,
                value: h.totalValue,
                percentage: ((h.totalValue / portfolio.totalValue) * 100).toFixed(2)
            }))
        };
    }
}

module.exports = new PortfolioService();