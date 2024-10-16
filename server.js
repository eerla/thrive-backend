require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const { sendNotificationsToUsers, registerUser, scheduleDailyNotifications } = require('./notifications/notificationService');
const createLoggerWithFilename = require('./services/logService');

const logger = createLoggerWithFilename(__filename);
const app = express();
app.use(bodyParser.json());

const td_collection_id = process.env.TD_COLLECTION_ID;

// Endpoint to register the device token and save/update user data
app.post('/register', async (req, res) => {
    const { token, name, gender, age, occupation, language, frequency } = req.body;

    try {
        const message = await registerUser(td_collection_id, token, name, gender, age, occupation, language, frequency);
        res.send(message);
    } catch (error) {
        logger.error('Error in user registration: %o', error);
        res.status(400).send(error.message);
    }
});

// Endpoint to send notifications
app.post('/send-notification', async (req, res) => {
    try {
        logger.info('Sending notifications to users...');
        await sendNotificationsToUsers();
        res.send('Notifications processed successfully!');
    } catch (error) {
        logger.error('Error sending notifications: %o', error);
        res.status(500).send('Failed to send notifications.');
    }
});

// Schedule the job to run every day at 11 PM
scheduleDailyNotifications();

// Start the server
app.listen(process.env.PORT, () => {
    logger.info('Server running on port %s', process.env.PORT);
});
