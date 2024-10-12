const express = require('express');
const bodyParser = require('body-parser');
const { Expo } = require('expo-server-sdk');

let expo = new Expo();
const app = express();
app.use(bodyParser.json());

// Store device tokens (in-memory for simplicity)
let savedTokens = [];

// Endpoint to register the device token
app.post('/register', (req, res) => {
    const { token } = req.body;

    if (!Expo.isExpoPushToken(token)) {
        res.status(400).send('Invalid Expo push token');
        return;
    }

    savedTokens.push(token);
    res.send('Token registered successfully');
});

// Endpoint to send notification
app.post('/send-notification', (req, res) => {
    // create messages
    let messages = [];
    for (let pushToken of savedTokens) {
        if (Expo.isExpoPushToken(pushToken)) {
            messages.push({
                to: pushToken,
                sound: 'default',
                body: 'This is a test notification!',
                data: { withSome: 'data' },
            });
        }
    }

    // Send notifications
    let chunks = expo.chunkPushNotifications(messages);
    let tickets = [];
    (async () => {
        for (let chunk of chunks) {
            try {
                let ticketChunk = await expo.sendPushNotificationsAsync(chunk);
                tickets.push(...ticketChunk);
            } catch (error) {
                console.error(error);
            }
        }
    })();

    res.send('Notification sent!');
});

// Start the server
app.listen(3000, () => {
    console.log('Server running on port 3000');
});
