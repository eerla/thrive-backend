const express = require('express');
const bodyParser = require('body-parser');
const { Expo } = require('expo-server-sdk');
const { createRecord, updateRecord, getAllRecords } = require('./services/pocketbaseService');
const { sendMotivationalQuoteNotification } = require('./notifications/notificationService');
const cron = require('node-cron');
const fetch = require('node-fetch');

const app = express();
app.use(bodyParser.json());

// Endpoint to register the device token and save/update user data
app.post('/register', async (req, res) => {
    const { token, name, gender, age, occupation, language, frequency } = req.body;

    if (!Expo.isExpoPushToken(token)) {
        return res.status(400).send('Invalid Expo push token');
    }

    const data = { token, name, gender, age, occupation, language, frequency };

    try {
        // Attempt to update the record; if it doesn't exist, create it
        await updateRecord(data);
        res.send('User data updated successfully');
    } catch (error) {
        await createRecord(data);
        await sendMotivationalQuoteNotification(token, name, gender, age, occupation, language);
        res.send('User data saved successfully and notification sent!');
    }
});

// Endpoint to send notifications
app.post('/send-notification', async (req, res) => {
    try {
        const users = await getAllRecords('token_x_user'); // Fetch all user records

        if (users.length === 0) {
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

        await Promise.all(notificationPromises);
        res.send('Notifications sent successfully!');
    } catch (error) {
        console.error('Error sending notifications:', error);
        res.status(500).send('Failed to send notifications.');
    }
});

// Schedule the job to run every day at 11 PM
cron.schedule('0 23 * * *', async () => {
    console.log('Running daily notification job at 11 PM...');
    try {
        await fetch('http://localhost:3000/send-notification', { method: 'POST' });
        console.log('Notifications sent successfully!');
    } catch (error) {
        console.error('Error sending notifications:', error);
    }
});

// Start the server
app.listen(3000, () => {
    console.log('Server running on port 3000');
});