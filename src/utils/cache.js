const logger = require('./logger');

class SimpleCache {
    constructor() {
        this.cache = new Map();
        this.timers = new Map();
    }

    set(key, value, ttlSeconds = 300) {
        // Clear existing timer if exists
        if (this.timers.has(key)) {
            clearTimeout(this.timers.get(key));
        }

        // Set new value
        this.cache.set(key, {
            value,
            timestamp: Date.now()
        });

        // Set expiration timer
        const timer = setTimeout(() => {
            this.delete(key);
        }, ttlSeconds * 1000);

        this.timers.set(key, timer);
        logger.debug(`Cache set: ${key} with TTL ${ttlSeconds}s`);
    }

    get(key) {
        const item = this.cache.get(key);
        if (item) {
            logger.debug(`Cache hit: ${key}`);
            return item.value;
        }
        logger.debug(`Cache miss: ${key}`);
        return null;
    }

    delete(key) {
        // Clear timer
        if (this.timers.has(key)) {
            clearTimeout(this.timers.get(key));
            this.timers.delete(key);
        }

        // Delete from cache
        this.cache.delete(key);
        logger.debug(`Cache delete: ${key}`);
    }

    clear() {
        // Clear all timers
        for (const timer of this.timers.values()) {
            clearTimeout(timer);
        }

        // Clear cache
        this.cache.clear();
        this.timers.clear();
        logger.debug('Cache cleared');
    }

    size() {
        return this.cache.size;
    }

    has(key) {
        return this.cache.has(key);
    }
}

// Export singleton instance
module.exports = new SimpleCache();