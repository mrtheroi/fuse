const cron = require('node-cron');
const nodemailer = require('nodemailer');
const stockService = require('./stockService');
const portfolioService = require('./portfolioService');
const logger = require('../utils/logger');

class ReportService {
    constructor() {
        this.transporter = null;
        this.initializeEmailTransporter();
    }

    initializeEmailTransporter() {
        try {
            this.transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST,
                port: parseInt(process.env.SMTP_PORT),
                secure: process.env.SMTP_SECURE === 'true',
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS
                }
            });

            // Verify transporter configuration
            this.transporter.verify((error, success) => {
                if (error) {
                    logger.error('Email transporter verification failed:', error);
                } else {
                    logger.info('Email transporter is ready');
                }
            });
        } catch (error) {
            logger.error('Failed to initialize email transporter:', error);
        }
    }

    async generateDailyReport() {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // Get all transactions for today
            const transactions = stockService.getTransactions({ date: today });

            // Separate successful and failed transactions
            const successfulTransactions = transactions.filter(t => t.status === 'SUCCESS');
            const failedTransactions = transactions.filter(t => t.status === 'FAILED');

            // Calculate statistics
            const stats = {
                total: transactions.length,
                successful: successfulTransactions.length,
                failed: failedTransactions.length,
                successRate: transactions.length > 0
                    ? ((successfulTransactions.length / transactions.length) * 100).toFixed(2)
                    : 0,
                totalVolume: successfulTransactions.reduce((sum, t) => sum + (t.quantity * t.requestedPrice), 0)
            };

            // Group transactions by user
            const userTransactions = this.groupTransactionsByUser(transactions);

            // Generate HTML report
            const htmlReport = this.generateHTMLReport({
                date: today,
                stats,
                successfulTransactions,
                failedTransactions,
                userTransactions
            });

            return {
                stats,
                htmlReport,
                successfulTransactions,
                failedTransactions
            };
        } catch (error) {
            logger.error('Error generating daily report:', error);
            throw error;
        }
    }

    groupTransactionsByUser(transactions) {
        const grouped = {};

        transactions.forEach(t => {
            if (!grouped[t.userId]) {
                grouped[t.userId] = {
                    successful: [],
                    failed: [],
                    totalVolume: 0
                };
            }

            if (t.status === 'SUCCESS') {
                grouped[t.userId].successful.push(t);
                grouped[t.userId].totalVolume += t.quantity * t.requestedPrice;
            } else {
                grouped[t.userId].failed.push(t);
            }
        });

        return grouped;
    }

    generateHTMLReport(data) {
        const { date, stats, successfulTransactions, failedTransactions, userTransactions } = data;

        return `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        h1, h2 { color: #333; }
        table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #4CAF50; color: white; }
        tr:nth-child(even) { background-color: #f2f2f2; }
        .success { color: #4CAF50; }
        .failed { color: #f44336; }
        .stats-box { 
            background-color: #f0f0f0; 
            padding: 15px; 
            border-radius: 5px; 
            margin-bottom: 20px;
        }
        .stat-item { 
            display: inline-block; 
            margin-right: 30px; 
            font-weight: bold;
        }
    </style>
</head>
<body>
    <h1>Daily Trading Report - ${date.toDateString()}</h1>
    
    <div class="stats-box">
        <h2>Summary Statistics</h2>
        <div class="stat-item">Total Transactions: ${stats.total}</div>
        <div class="stat-item" class="success">Successful: ${stats.successful}</div>
        <div class="stat-item" class="failed">Failed: ${stats.failed}</div>
        <div class="stat-item">Success Rate: ${stats.successRate}%</div>
        <div class="stat-item">Total Volume: $${stats.totalVolume.toFixed(2)}</div>
    </div>

    <h2>Successful Transactions</h2>
    ${successfulTransactions.length > 0 ? `
    <table>
        <tr>
            <th>Time</th>
            <th>User ID</th>
            <th>Symbol</th>
            <th>Quantity</th>
            <th>Price</th>
            <th>Total</th>
            <th>Price Deviation</th>
        </tr>
        ${successfulTransactions.map(t => `
        <tr>
            <td>${new Date(t.timestamp).toLocaleTimeString()}</td>
            <td>${t.userId}</td>
            <td>${t.symbol}</td>
            <td>${t.quantity}</td>
            <td>$${t.requestedPrice.toFixed(2)}</td>
            <td>$${(t.quantity * t.requestedPrice).toFixed(2)}</td>
            <td>${t.deviation}%</td>
        </tr>
        `).join('')}
    </table>
    ` : '<p>No successful transactions today.</p>'}

    <h2>Failed Transactions</h2>
    ${failedTransactions.length > 0 ? `
    <table>
        <tr>
            <th>Time</th>
            <th>User ID</th>
            <th>Symbol</th>
            <th>Quantity</th>
            <th>Price</th>
            <th>Error</th>
        </tr>
        ${failedTransactions.map(t => `
        <tr>
            <td>${new Date(t.timestamp).toLocaleTimeString()}</td>
            <td>${t.userId}</td>
            <td>${t.symbol}</td>
            <td>${t.quantity}</td>
            <td>$${t.requestedPrice.toFixed(2)}</td>
            <td>${t.error}</td>
        </tr>
        `).join('')}
    </table>
    ` : '<p>No failed transactions today.</p>'}

    <h2>User Activity Summary</h2>
    <table>
        <tr>
            <th>User ID</th>
            <th>Successful Trades</th>
            <th>Failed Trades</th>
            <th>Total Volume</th>
        </tr>
        ${Object.entries(userTransactions).map(([userId, data]) => `
        <tr>
            <td>${userId}</td>
            <td class="success">${data.successful.length}</td>
            <td class="failed">${data.failed.length}</td>
            <td>$${data.totalVolume.toFixed(2)}</td>
        </tr>
        `).join('')}
    </table>

    <p style="margin-top: 30px; color: #666;">
        This is an automated report generated by the Stock Trading Service.<br>
        Report generated at: ${new Date().toISOString()}
    </p>
</body>
</html>
    `;
    }

    async sendDailyReport() {
        try {
            if (!this.transporter) {
                logger.error('Email transporter not initialized');
                return;
            }

            const report = await this.generateDailyReport();

            const mailOptions = {
                from: process.env.EMAIL_FROM,
                to: process.env.EMAIL_TO,
                subject: `Daily Trading Report - ${new Date().toDateString()}`,
                html: report.htmlReport,
                attachments: [
                    {
                        filename: `trading-report-${new Date().toISOString().split('T')[0]}.json`,
                        content: JSON.stringify({
                            stats: report.stats,
                            transactions: {
                                successful: report.successfulTransactions,
                                failed: report.failedTransactions
                            }
                        }, null, 2)
                    }
                ]
            };

            const info = await this.transporter.sendMail(mailOptions);
            logger.info('Daily report sent successfully', { messageId: info.messageId });

            return report.stats;
        } catch (error) {
            logger.error('Error sending daily report:', error);
            throw error;
        }
    }
}

const reportService = new ReportService();

function startDailyReportScheduler() {
    const schedule = process.env.DAILY_REPORT_SCHEDULE || '0 9 * * *';

    cron.schedule(schedule, async () => {
        logger.info('Starting daily report generation');
        try {
            const stats = await reportService.sendDailyReport();
            logger.info('Daily report completed', stats);
        } catch (error) {
            logger.error('Daily report failed:', error);
        }
    });

    logger.info(`Daily report scheduler started with cron: ${schedule}`);
}

module.exports = {
    reportService,
    startDailyReportScheduler
};