const express = require('express');
const router = express.Router();
const stockService = require('../services/stockService');
const asyncHandler = require('../utils/asyncHandler');
const { validatePagination } = require('../middleware/validation');

// GET /api/stocks - List all available stocks
router.get('/', validatePagination, asyncHandler(async (req, res) => {
    const stocks = await stockService.getAllStocks();

    // Apply pagination if requested
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;

    const paginatedStocks = stocks.slice(startIndex, endIndex);

    res.json({
        status: 200,
        data: {
            items: paginatedStocks,
            pagination: {
                page,
                limit,
                total: stocks.length,
                totalPages: Math.ceil(stocks.length / limit),
                hasNext: endIndex < stocks.length,
                hasPrev: page > 1
            }
        }
    });
}));

// GET /api/stocks/:symbol - Get specific stock details
router.get('/:symbol', asyncHandler(async (req, res) => {
    const { symbol } = req.params;
    const stock = await stockService.getStockBySymbol(symbol.toUpperCase());

    res.json({
        status: 200,
        data: stock
    });
}));

module.exports = router;