const express = require('express');
const router = express.Router();
const stockService = require('../services/stockService');
const portfolioService = require('../services/portfolioService');
const asyncHandler = require('../utils/asyncHandler');
const { validateBuyOrder } = require('../middleware/validation');

// POST /api/transactions/buy - Execute stock purchase
router.post('/buy', validateBuyOrder, asyncHandler(async (req, res) => {
    const { userId, symbol, price, quantity } = req.body;

    // Execute purchase
    const transaction = await stockService.buyStock(
        symbol.toUpperCase(),
        price,
        quantity,
        userId
    );

    // Update portfolio if successful
    if (transaction.status === 'SUCCESS') {
        portfolioService.updatePortfolioFromTransaction(transaction);
    }

    res.status(201).json({
        status: 201,
        message: 'Stock purchase completed successfully',
        data: {
            transactionId: transaction.id,
            symbol: transaction.symbol,
            quantity: transaction.quantity,
            price: transaction.requestedPrice,
            total: transaction.quantity * transaction.requestedPrice,
            status: transaction.status,
            timestamp: transaction.timestamp
        }
    });
}));

module.exports = router;