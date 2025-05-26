const winston = require('winston');
const path = require('path');

const logLevel = process.env.NODE_ENV === 'production' ? 'info' : 'debug';

const logger = winston.createLogger({
    level: logLevel,
    format: winston.format.combine(
        winston.format.timestamp({
            format: 'YYYY-MM-DD HH:mm:ss'
        }),
        winston.format.errors({ stack: true }),
        winston.format.splat(),
        winston.format.json()
    ),
    defaultMeta: { service: 'stock-trading-service' },
    transports: [
        // Console transport
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple(),
                winston.format.printf(({ timestamp, level, message, ...meta }) => {
                    let metaStr = '';
                    if (Object.keys(meta).length > 0) {
                        metaStr = JSON.stringify(meta);
                    }
                    return `${timestamp} [${level}] ${message} ${metaStr}`;
                })
            )
        })
    ]
});

// In production, also log to files
if (process.env.NODE_ENV === 'production') {
    // Ensure logs directory exists
    const fs = require('fs');
    const logsDir = path.join(__dirname, '../../logs');

    try {
        if (!fs.existsSync(logsDir)) {
            fs.mkdirSync(logsDir, { recursive: true });
        }

        logger.add(new winston.transports.File({
            filename: path.join(logsDir, 'error.log'),
            level: 'error'
        }));

        logger.add(new winston.transports.File({
            filename: path.join(logsDir, 'combined.log')
        }));
    } catch (error) {
        console.error('Warning: Could not create logs directory. File logging disabled.', error.message);
        // Continue without file logging
    }
}

module.exports = logger;