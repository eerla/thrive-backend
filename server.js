require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const { Expo } = require('expo-server-sdk');
const { createRecord, updateRecord, getAllRecords } = require('./services/pocketbaseService');
const { sendMotivationalQuoteNotification } = require('./notifications/notificationService');
const cron = require('node-cron');
const fetch = require('node-fetch');

const createLoggerWithFilename = require('./services/logService'); // Import the logger
const logger = createLoggerWithFilename(__filename);

const app = express();
app.use(bodyParser.json());
let pb_collection_id = process.env.POCKETBASE_COLLECTION_ID;
// Endpoint to register the device token and save/update user data
app.post('/register', async (req, res) => {
    const { token, name, gender, age, occupation, language, frequency } = req.body;

    if (!Expo.isExpoPushToken(token)) {
        logger.info('Invalid Expo push token received');
        return res.status(400).send('Invalid Expo push token');
    }

    const data = { token, name, gender, age, occupation, language, frequency };

    try {
        await updateRecord(data);
        logger.info('User data updated successfully for token: %s', token);
        res.send('User data updated successfully');
    } catch (error) {
        logger.info('User not found, creating new record...');
        await createRecord(data);
        await sendMotivationalQuoteNotification(token, name, gender, age, occupation, language);
        logger.info('User data saved and notification sent for token: %s', token);
        res.send('User data saved successfully and notification sent!');
    }
});

// Endpoint to send notifications
app.post('/send-notification', async (req, res) => {
    try {
        const users = await getAllRecords(pb_collection_id);
        logger.info('fetching users from pocketbase...');

        if (users.length === 0) {
            logger.info('No users registered for notifications.');
            return res.send('No users registered for notifications.');
        }

        const notificationPromises = users.map(user => {
            if (Expo.isExpoPushToken(user.token)) {
                return sendMotivationalQuoteNotification(
                    user.token,
                    user.name,
                    user.gender,
                    user.age,
                    user.occupation,
                    user.language
                );
            }
        });

        logger.info('sending notifications to users...');
        await Promise.all(notificationPromises);
        logger.info('Notifications sent successfully to all users.');
        res.send('Notifications sent successfully!');
    } catch (error) {
        logger.error('Error sending notifications: %o', error);
        res.status(500).send('Failed to send notifications.');
    }
});

// Schedule the job to run every day at 11 PM
cron.schedule('0 23 * * *', async () => {
    logger.info('Running daily notification job at 11 PM...');
    try {
        await fetch('http://localhost:3000/send-notification', { method: 'POST' });
        logger.info('Notifications sent successfully!');
    } catch (error) {
        logger.error('Error sending notifications: %o', error);
    }
});

// Start the server
app.listen(process.env.PORT, () => {
    logger.info('Server running on port %s', process.env.PORT);
});