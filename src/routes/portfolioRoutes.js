const express = require('express');
const router = express.Router();
const portfolioService = require('../services/portfolioService');
const asyncHandler = require('../utils/asyncHandler');
const { validateUserId } = require('../middleware/validation');

// GET /api/portfolio/:userId - Get user portfolio
router.get('/:userId', validateUserId, asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const portfolio = await portfolioService.getUserPortfolio(userId);

    res.json({
        status: 200,
        data: portfolio
    });
}));

module.exports = router;