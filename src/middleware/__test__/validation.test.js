const { validateBuyOrder } = require('../validation');

describe('Buy Order Validation', () => {
    let req, res, next;

    beforeEach(() => {
        req = { body: {} };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        next = jest.fn();
    });

    it('should pass valid buy order', () => {
        req.body = {
            userId: 'user123',
            symbol: 'AAPL',
            price: 175.50,
            quantity: 10
        };

        validateBuyOrder(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
    });

    it('should reject negative price', () => {
        req.body = {
            userId: 'user123',
            symbol: 'AAPL',
            price: -100,
            quantity: 10
        };

        validateBuyOrder(req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            status: 400,
            error: 'Validation failed',
            details: expect.arrayContaining([
                expect.objectContaining({
                    field: 'price',
                    message: expect.stringContaining('positive')
                })
            ])
        });
    });

    it('should reject zero quantity', () => {
        req.body = {
            userId: 'user123',
            symbol: 'AAPL',
            price: 100,
            quantity: 0
        };

        validateBuyOrder(req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(next).not.toHaveBeenCalled();
    });

    it('should uppercase symbol automatically', () => {
        req.body = {
            userId: 'user123',
            symbol: 'aapl',
            price: 100,
            quantity: 5
        };

        validateBuyOrder(req, res, next);

        expect(req.body.symbol).toBe('AAPL');
        expect(next).toHaveBeenCalled();
    });
});