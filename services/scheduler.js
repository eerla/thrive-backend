const cron = require('node-cron');
const fetch = require('node-fetch');
const createLoggerWithFilename = require('./logService');
const makeBatchApiCall = require('./openAIService')
const { createBatchRequestFile } = require('../app_data/makeDataFile');
const logger = createLoggerWithFilename(__filename);

// Function to schedule the daily notification job
function scheduleDailyNotifications() {
    cron.schedule('0 4 * * *', async () => {
        logger.info('Running daily notification job at 11 PM...');
        try {
            await fetch('http://localhost:3000/send-notification-v2', { method: 'POST' });
            logger.info('Notifications sent successfully!');
        } catch (error) {
            logger.error('Error sending notifications: %o', error);
        }
    });

    logger.info('Daily notification job scheduled at 4 AM');
}

// Function to poll batch call retriever 
function pollRetriever() {
    cron.schedule('*/15 * * * *', async () => {
        logger.info('Polling batch call retriever..');
        try {
            await fetch('http://localhost:3000/batch-api-call', { method: 'POST' });
            logger.info('content retrieved successfully!');
        } catch (error) {
            logger.error('Error retrieving content from batch api call');
        }
    });

    logger.info('Scheduled polling batch call retriever...');
}

// function create api call batch input file
function createBatchFile() {
    cron.schedule('0 1 * * *', async () => {
        try {
            logger.info('Scheduled task: Creating batch request file at 1 AM...');
            await createBatchRequestFile();
        } catch (error) {
            logger.error('Error in scheduled task for batch request file: %o', error);
        }
    });
}

// function create api call batch input file
function executeBatchApiCall() {
    cron.schedule('0 2 * * *', async () => {
        try {
            logger.info('Scheduled task: Creating batch request file at 1 AM...');
            const responses = await makeBatchApiCall();
            return responses;
        } catch (error) {
            logger.error('Error in scheduled task for batch request file: %o', error);
        }
    });
}


module.exports = { 
    scheduleDailyNotifications, 
    pollRetriever, 
    createBatchFile,
    executeBatchApiCall }