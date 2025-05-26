const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
    // Log error
    logger.error('Error occurred:', {
        error: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
        body: req.body,
        params: req.params
    });

    // Determine status code
    const status = err.status || err.statusCode || 500;

    // Prepare error response
    const response = {
        status,
        error: {
            message: err.message || 'Internal server error',
            code: err.code || 'INTERNAL_ERROR'
        }
    };

    // In development, include stack trace
    if (process.env.NODE_ENV === 'development') {
        response.error.stack = err.stack;
    }

    // Add specific error details based on error type
    if (err.name === 'ValidationError') {
        response.error.code = 'VALIDATION_ERROR';
        response.error.details = err.details;
    } else if (err.code === 'VENDOR_UNAVAILABLE') {
        response.error.message = 'Stock vendor service is temporarily unavailable. Please try again later.';
    } else if (err.code === 'PRICE_DEVIATION_EXCEEDED') {
        response.error.details = {
            deviation: err.deviation,
            maxAllowed: err.maxAllowed
        };
    }

    res.status(status).json(response);
};

module.exports = errorHandler;