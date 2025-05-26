const Joi = require('joi');

const schemas = {
    buyOrder: Joi.object({
        userId: Joi.string().required().min(1).max(50),
        symbol: Joi.string().required().uppercase().min(1).max(10),
        price: Joi.number().positive().required().precision(2),
        quantity: Joi.number().integer().positive().required().min(1)
    }),

    userId: Joi.object({
        userId: Joi.string().required().min(1).max(50)
    }),

    pagination: Joi.object({
        page: Joi.number().integer().positive().optional(),
        limit: Joi.number().integer().positive().max(100).optional()
    })
};

const validate = (schema, source = 'body') => {
    return (req, res, next) => {
        let dataToValidate;

        // Determine which part of the request to validate
        switch (source) {
            case 'params':
                dataToValidate = req.params;
                break;
            case 'query':
                dataToValidate = req.query;
                break;
            case 'body':
            default:
                dataToValidate = req.body;
                break;
        }

        const { error, value } = schema.validate(dataToValidate, { abortEarly: false });

        if (error) {
            const errors = error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message
            }));

            return res.status(400).json({
                status: 400,
                error: 'Validation failed',
                details: errors
            });
        }

        // Replace request data with validated values
        switch (source) {
            case 'params':
                req.params = value;
                break;
            case 'query':
                req.query = value;
                break;
            case 'body':
            default:
                req.body = value;
                break;
        }

        next();
    };
};

module.exports = {
    validateBuyOrder: validate(schemas.buyOrder, 'body'),
    validateUserId: validate(schemas.userId, 'params'),
    validatePagination: validate(schemas.pagination, 'query')
};