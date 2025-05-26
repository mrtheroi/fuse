const axios = require('axios');
const logger = require('../utils/logger');

class VendorClient {
    constructor() {
        this.client = axios.create({
            baseURL: process.env.VENDOR_API_BASE_URL,
            timeout: parseInt(process.env.API_TIMEOUT) || 30000,
            headers: {
                'x-api-key': process.env.VENDOR_API_KEY,
                'Content-Type': 'application/json'
            }
        });

        this.maxRetries = parseInt(process.env.API_RETRY_ATTEMPTS) || 3;

        // Request interceptor for logging
        this.client.interceptors.request.use(
            (config) => {
                logger.debug(`Vendor API Request: ${config.method?.toUpperCase()} ${config.url}`);
                return config;
            },
            (error) => {
                logger.error('Vendor API Request Error:', error);
                return Promise.reject(error);
            }
        );

        // Response interceptor for logging
        this.client.interceptors.response.use(
            (response) => {
                logger.debug(`Vendor API Response: ${response.status} ${response.config.url}`);
                return response;
            },
            (error) => {
                if (error.response) {
                    logger.error(`Vendor API Error Response: ${error.response.status}`, {
                        url: error.config?.url,
                        data: error.response.data
                    });
                } else {
                    logger.error('Vendor API Network Error:', error.message);
                }
                return Promise.reject(error);
            }
        );
    }

    async retryRequest(fn, retries = this.maxRetries) {
        try {
            return await fn();
        } catch (error) {
            if (retries > 0 && this.shouldRetry(error)) {
                const delay = Math.pow(2, this.maxRetries - retries) * 1000;
                logger.warn(`Retrying request in ${delay}ms. Retries left: ${retries}`);

                await new Promise(resolve => setTimeout(resolve, delay));
                return this.retryRequest(fn, retries - 1);
            }
            throw error;
        }
    }

    shouldRetry(error) {
        // Retry on network errors or 5xx status codes
        return !error.response || (error.response && error.response.status >= 500);
    }

    async getStocks(nextToken = null) {
        try {
            const fn = async () => {
                const params = nextToken ? { nextToken } : {};
                const response = await this.client.get('/stocks', { params });

                if (response.data.status === 200 && response.data.data) {
                    return response.data.data;
                }

                throw new Error('Invalid response format from vendor API');
            };

            return await this.retryRequest(fn);
        } catch (error) {
            logger.error('Error fetching stocks:', error);
            throw this.handleError(error);
        }
    }

    async buyStock(symbol, price, quantity) {
        try {
            const fn = async () => {
                const response = await this.client.post(`/stocks/${symbol}/buy`, {
                    price,
                    quantity
                });

                if (response.data.status === 200) {
                    return response.data.data;
                }

                throw new Error(response.data.message || 'Purchase failed');
            };

            return await this.retryRequest(fn);
        } catch (error) {
            logger.error(`Error buying stock ${symbol}:`, error);
            throw this.handleError(error);
        }
    }

    handleError(error) {
        if (error.response) {
            // The request was made and the server responded with error
            const status = error.response.status;
            const message = error.response.data?.message || error.message;

            const customError = new Error(message);
            customError.status = status;
            customError.code = error.response.data?.code || 'VENDOR_API_ERROR';

            return customError;
        } else if (error.request) {
            // The request was made but no response was received
            const customError = new Error('Vendor API is not responding');
            customError.status = 503;
            customError.code = 'VENDOR_UNAVAILABLE';
            return customError;
        }

        // Something else happened
        return error;
    }
}

module.exports = new VendorClient();