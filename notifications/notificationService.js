const { Expo } = require('expo-server-sdk');
const { fetchMotivationalQuote } = require('../services/openAIService');

let expo = new Expo();

// Function to fetch motivational quote and send notification
async function sendMotivationalQuoteNotification(token, name, gender, age, occupation, language) {
    console.log('calling openai service');
    const quote = await fetchMotivationalQuote(name, gender, age, occupation, language);

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

module.exports = { sendMotivationalQuoteNotification };