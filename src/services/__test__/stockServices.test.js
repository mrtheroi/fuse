const stockService = require('../stockService');

describe('StockService', () => {
    describe('validatePriceDeviation', () => {
        it('should allow price within 2% deviation', () => {
            const result = stockService.validatePriceDeviation(98, 100);

            expect(result.isValid).toBe(true);
            expect(result.deviation).toBe('2.00');
            expect(result.maxAllowed).toBe(2);
        });

        it('should reject price exceeding 2% deviation', () => {
            const result = stockService.validatePriceDeviation(95, 100);

            expect(result.isValid).toBe(false);
            expect(result.deviation).toBe('5.00');
        });

        it('should handle price increases correctly', () => {
            const result = stockService.validatePriceDeviation(102.5, 100);

            expect(result.isValid).toBe(false);
            expect(result.deviation).toBe('2.50');
        });

        it('should handle exact price match', () => {
            const result = stockService.validatePriceDeviation(100, 100);

            expect(result.isValid).toBe(true);
            expect(result.deviation).toBe('0.00');
        });
    });
});

describe('Transaction Recording', () => {
    beforeEach(() => {
        // Clear any existing transactions
        const cache = require('../../utils/cache');
        cache.clear();
    });

    it('should record successful transactions', () => {
        const transaction = {
            id: 'test-123',
            userId: 'user1',
            symbol: 'AAPL',
            quantity: 10,
            requestedPrice: 100,
            status: 'SUCCESS',
            timestamp: new Date().toISOString()
        };

        stockService.recordTransaction(transaction);
        const transactions = stockService.getTransactions();

        expect(transactions).toHaveLength(1);
        expect(transactions[0]).toMatchObject({
            id: 'test-123',
            status: 'SUCCESS'
        });
    });

    it('should filter transactions by status', () => {
        // Record multiple transactions
        stockService.recordTransaction({
            id: '1',
            userId: 'user1',
            status: 'SUCCESS',
            timestamp: new Date().toISOString()
        });

        stockService.recordTransaction({
            id: '2',
            userId: 'user1',
            status: 'FAILED',
            timestamp: new Date().toISOString()
        });

        const successfulOnly = stockService.getTransactions({ status: 'SUCCESS' });
        const failedOnly = stockService.getTransactions({ status: 'FAILED' });

        expect(successfulOnly).toHaveLength(1);
        expect(failedOnly).toHaveLength(1);
        expect(successfulOnly[0].id).toBe('1');
        expect(failedOnly[0].id).toBe('2');
    });
});