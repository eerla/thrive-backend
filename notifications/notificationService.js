require('dotenv').config();
const { Expo } = require('expo-server-sdk');
const { fetchMotivationalQuote } = require('../services/openAIService');
const { createRecord, updateRecord, getAllRecords, createFailedRecord } = require('../services/pocketbaseService');
const createLoggerWithFilename = require('../services/logService');
const cron = require('node-cron');
const fetch = require('node-fetch');

const logger = createLoggerWithFilename(__filename);
const expo = new Expo();
const fp_collection_id = process.env.FP_COLLECTION_ID;
const td_collection_id = process.env.TD_COLLECTION_ID;
// Function to fetch motivational quote and send notification
async function sendMotivationalQuoteNotification(token, name, gender, age, occupation, language) {
    logger.info('Calling OpenAI service');
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
}

async function createNotificationPromises(users) {
    return users.map(usr => {
        const user = usr.token_x_user
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
            console.log('in else case')
            return {
                status: 'rejected',
                user,
                reason: 'Invalid Expo Push Token'
            };
        }
    });
}

// Function to handle notification results
async function handleNotificationResults(results) {
    console.log(results)
    for (const result of results) {
        if (result.status === 'fulfilled' && result.value == undefined) {
            logger.info(`Notification sent successfully`);
        } else {
            logger.error(`Failed to send notification to token: ${result.value.user.token}. Reason: ${result.value.reason}`);
            
            await createFailedRecord(fp_collection_id, {
                token_x_user: result.value.user,
                reason: result.value.reason
            });
        }
    }
    logger.info('Finished processing notifications.');
}

// Function to send notifications to users
async function sendNotificationsToUsers() {
    logger.info('Fetching users from PocketBase...');
    const users = await getAllRecords(td_collection_id);

    if (users.length === 0) {
        const msg = 'No users registered for notifications.';
        logger.info(msg);
        return res.send(msg);
    }
    const notificationPromises = await createNotificationPromises(users);
    const results = await Promise.allSettled(notificationPromises);
    await handleNotificationResults(results);
}

// Function to register a user
async function registerUser(collectionName, token, name, gender, age, occupation, language, frequency) {
    const data = { token, name, gender, age, occupation, language, frequency };

    if (!Expo.isExpoPushToken(token)) {
        logger.info('Invalid Expo push token received');
        throw new Error('Invalid Expo push token');
    }

    try {
        await updateRecord(collectionName, data);
        logger.info('User data updated successfully for token: %s', token);
        return 'User data updated successfully';
    } catch (error) {
        logger.info('User not found, creating new user record...');
        await createRecord(collectionName, data);
        await sendMotivationalQuoteNotification(token, name, gender, age, occupation, language);
        logger.info('User data saved and notification sent for token: %s', token);
        return 'User data saved successfully and notification sent!';
    }
}

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

module.exports = { sendNotificationsToUsers, registerUser, scheduleDailyNotifications };