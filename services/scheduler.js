const cron = require('node-cron');
const fetch = require('node-fetch');
const createLoggerWithFilename = require('./logService');
const logger = createLoggerWithFilename(__filename);

// Function to schedule the daily notification job
function scheduleDailyNotifications() {
    cron.schedule('0 23 * * *', async () => {
        logger.info('Running daily notification job at 11 PM...');
        try {
            await fetch('http://localhost:3000/send-notification', { method: 'POST' });
            logger.info('Notifications sent successfully!');
        } catch (error) {
            logger.error('Error sending notifications: %o', error);
        }
    });

    logger.info('Daily notification job scheduled at 11 PM');
}

module.exports = { scheduleDailyNotifications }