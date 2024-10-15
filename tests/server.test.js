const express = require('express');
const bodyParser = require('body-parser');
const { Expo } = require('expo-server-sdk');
const { fetchMotivationalQuote } = require('./services/openAIService'); // Import the function
const { createRecord, updateRecord, deleteRecord } = require('./services/pocketbaseService'); // Import PocketBase functions
const cron = require('node-cron'); // Import node-cron
const fetch = require('node-fetch'); // Import node-fetch for making HTTP requests

let expo = new Expo();
const app = express();
app.use(bodyParser.json());

// Store device tokens and user data (in-memory for simplicity)
let users = [];

// Function to fetch motivational quote and send notification
async function sendMotivationalQuoteNotification(token, name, gender, age, occupation, language) {
    // Fetch motivational quote
    console.log('calling openai service');
    const quote = await fetchMotivationalQuote(name, gender, age, occupation, language);

    // Send notification with the motivational quote
    const message = {
        to: token,
        sound: 'default',
        body: quote,
        data: { withSome: 'data' },
    };

    let chunks = expo.chunkPushNotifications([message]);
    let tickets = [];

    for (let chunk of chunks) {
        try {
            let ticketChunk = await expo.sendPushNotificationsAsync(chunk);
            tickets.push(...ticketChunk);
        } catch (error) {
            console.error(error);
        }
    }
}

// Endpoint to register the device token and save/update user data
app.post('/register', async (req, res) => {
    const { token, name, gender, age, occupation, language, frequency } = req.body;
    
    if (!Expo.isExpoPushToken(token)) {
        res.status(400).send('Invalid Expo push token');
        return;
    }

    // Check if the user already exists by token
    const existingUserIndex = users.findIndex(user => user.token === token);

    if (existingUserIndex !== -1) {
        // Update existing user data (without sending notification)
        users[existingUserIndex] = { token, name, gender, age, occupation, language, frequency };
        res.send('User data updated successfully');
    } else {
        // Save new user data and send motivational quote notification
        users.push({ token, name, gender, age, occupation, language, frequency });

        // Call the function to send the motivational quote notification
        await sendMotivationalQuoteNotification(token, name, gender, age, occupation, language);

        res.send('User data saved successfully and notification sent!');
    }
});

// Endpoint to send notifications
app.post('/send-notification', async (req, res) => {
    // Check if there are users to send notifications to
    if (users.length === 0) {
        return res.send('No users registered for notifications.');
    }

    // Create an array to hold all notification promises
    const notificationPromises = [];

    for (let user of users) {
        if (Expo.isExpoPushToken(user.token)) {
            // Call the sendMotivationalQuoteNotification function for each user
            const notificationPromise = sendMotivationalQuoteNotification(
                user.token,
                user.name,
                user.gender,
                user.age,
                user.occupation,
                user.language
            );
            notificationPromises.push(notificationPromise);
        }
    }

    // Wait for all notifications to be sent
    try {
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
