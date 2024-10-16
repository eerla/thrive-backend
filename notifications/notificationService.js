require('dotenv').config();
const { Expo } = require('expo-server-sdk');
const { fetchMotivationalQuote } = require('../services/openAIService');
const { getAllRecords, createFailedRecord } = require('../services/pocketbaseService');
const createLoggerWithFilename = require('../services/logService');

const logger = createLoggerWithFilename(__filename);
const expo = new Expo();
const fp_collection_id = process.env.FP_COLLECTION_ID;
const td_collection_id = process.env.TD_COLLECTION_ID;

// Function to send notifications to users
async function sendNotificationsToUsers() {
    logger.info('Fetching users from PocketBase...');
    const users = await getAllRecords(td_collection_id);
    const user_cnt = users.length;
    logger.info(`User count: ${user_cnt}`);

    if (user_cnt === 0) {
        const msg = 'No users registered for notifications.';
        logger.info(msg);
        return msg;
    }
    const notificationPromises = await createNotificationPromises(users);
    const notificationResults = await Promise.allSettled(notificationPromises);
    await handleNotificationResults(notificationResults);
}

// Create notification promises
async function createNotificationPromises(users) {
    logger.info('Creating notification promises...');
    return users.map(usr => {
        const user = usr.token_x_user;
        if (Expo.isExpoPushToken(user.token)) {
            return sendMotivationalQuoteNotification(
                user.token,
                user.name,
                user.gender,
                user.age,
                user.occupation,
                user.language
            ).catch(error => ({
                status: 'rejected',
                user,
                reason: error.message
            }));
        } else {
            return {
                status: 'rejected',
                user,
                reason: 'Invalid Expo Push Token'
            };
        }
    });
}

// Function to fetch motivational quote and send notification
async function sendMotivationalQuoteNotification(token, name, gender, age, occupation, language) {
    logger.info('Calling OpenAI service...');
    const quote = await fetchMotivationalQuote(name, gender, age, occupation, language);

    const message = {
        to: token,
        sound: 'default',
        body: quote,
        data: { withSome: 'data' },
    };

    const chunks = expo.chunkPushNotifications([message]);
    const tickets = [];

    for (const chunk of chunks) {
        try {
            const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
            tickets.push(...ticketChunk);
        } catch (error) {
            logger.error('Error sending notification: %o', error);
        }
    }

    return tickets; // Return tickets for further processing
}

// Function to handle notification results
async function handleNotificationResults(results) {
    const successfulTickets = [];
    for (const result of results) {
        if (result.status === 'fulfilled' && result.value) {
            logger.info(`Notification sent successfully`);
            successfulTickets.push(...result.value); // Collect successful tickets
        } else {
            logger.error(`Failed to send notification to token: ${result.value.user.token}. Reason: ${result.value.reason}`);
            await createFailedRecord(fp_collection_id, {
                token_x_user: result.value.user,
                reason: result.value.reason
            });
        }
    }
    logger.info('Finished sending notifications.');

    // Process receipts only for successfully sent notifications
    if (successfulTickets.length > 0) {
        logger.info('processing notifications receipts...')
        await processNotificationReceipts(successfulTickets);
    }
}

// Process notification receipts
async function processNotificationReceipts(tickets) {
    const receiptPromises = tickets.map(async (ticket) => {
        if (ticket.id) {
            try {
                const receiptId = ticket.id;
                const receipt = await expo.getPushNotificationReceiptsAsync([receiptId]);
                const status = receipt[receiptId].status;
                if (status === 'ok') {
                    logger.info(`Notification delived to device successfully`);
                    return { status: 'ok', token: ticket.to };
                } else if (status === 'error') {
                    logger.error(`Error sending notification to device: ${ticket.to}. Reason: ${receipt[receiptId].message}`);
                    return {
                        status: 'error',
                        token: ticket.to,
                        reason: receipt[receiptId].message,
                    };
                }
            } catch (error) {
                logger.error('Error retrieving receipt: ', error);
                return { status: 'error', token: ticket.to, reason: 'Receipt retrieval failed' };
            }
        } else if (ticket.status === 'error') {
            logger.error(`Error sending notification. Reason: ${ticket.message}`);
            return { status: 'error', token: ticket.to, reason: ticket.message };
        }
    });

    const results = await Promise.all(receiptPromises);
    await handleReceiptResults(results);
}

// Function to handle receipt results
async function handleReceiptResults(results) {
    logger.info('processing delivered promises to handle unregistered devices...')
    for (const result of results) {
        if (result.status === 'ok') {
            logger.info(`Notification sent successfully!`);
        } else if (result.status === 'error') {
            logger.error(`Failed to send notification to token: ${result.token}. Reason: ${result.reason}`);

            if (result.reason.includes('Invalid') || result.reason.includes('DeviceNotRegistered')) {
                // Token is invalid or device is not registered, remove the token from the database
                await removeTokenFromDatabase(result.token);
                logger.info(`Removed invalid token: ${result.token}`);
            }
        }
    }
}

async function removeTokenFromDatabase(token) {
    // Logic to remove the token from the database or mark it as inactive
    // Example: await updateRecord(td_collection_id, { token: null }, { token });
    // move to thrive_data_unregistered and delete from main
    logger.info(`Token ${token} removed from the database.`);
}

module.exports = { sendNotificationsToUsers, sendMotivationalQuoteNotification };