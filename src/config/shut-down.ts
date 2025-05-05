
// Schedule cleanup tasks
import {errorLogger, logger} from "./logger";
import {server} from "../server";
import {removeExpiredAds} from "../controllers/user/buy_and_sell/buy_and_sellController";

const DAILY_INTERVAL = 24 * 60 * 60 * 1000;
const cleanupInterval = setInterval(async () => {
    try {
        await removeExpiredAds();
        logger.info('Expired ads cleanup completed');
    } catch (error: any) {
        errorLogger('Failed to remove expired ads', { error: error?.message });
    }
}, DAILY_INTERVAL);

// Graceful shutdown handler
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

function gracefulShutdown() {
    logger.info('Received shutdown signal, closing server...');

    clearInterval(cleanupInterval);

    server.close(() => {
        logger.info('HTTP server closed');

        // Close database connections or any other resources
        process.exit(0);
    });

    // Force close after 10 seconds if graceful shutdown fails
    setTimeout(() => {
        errorLogger('Could not close connections in time, forcefully shutting down');
        process.exit(1);
    }, 10000);
}