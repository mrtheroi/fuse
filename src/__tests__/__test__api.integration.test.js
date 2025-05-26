const request = require('supertest');
const app = require('../index');

describe('API Integration Tests', () => {
    describe('GET /health', () => {
        it('should return health status', async () => {
            const response = await request(app)
                .get('/health')
                .expect(200);

            expect(response.body).toMatchObject({
                status: 'UP',
                service: 'stock-trading-service',
                version: '1.0.0'
            });
        });
    });

    describe('POST /api/transactions/buy', () => {
        it('should validate required fields', async () => {
            const response = await request(app)
                .post('/api/transactions/buy')
                .send({
                    // Missing required fields
                    symbol: 'AAPL'
                })
                .expect(400);

            expect(response.body.error).toBe('Validation failed');
            expect(response.body.details).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({ field: 'userId' }),
                    expect.objectContaining({ field: 'price' }),
                    expect.objectContaining({ field: 'quantity' })
                ])
            );
        });
    });

    describe('GET /api/portfolio/:userId', () => {
        it('should return empty portfolio for new user', async () => {
            const response = await request(app)
                .get('/api/portfolio/new-test-user')
                .expect(200);

            expect(response.body.data).toMatchObject({
                userId: 'new-test-user',
                holdings: [],
                totalValue: 0
            });
        });
    });
});