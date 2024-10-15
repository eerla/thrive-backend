const { Expo } = require('expo-server-sdk');
const { fetchMotivationalQuote } = require('../services/openAIService');
const createLoggerWithFilename = require('../services/logService'); // Import the logger
const logger = createLoggerWithFilename(__filename);

let expo = new Expo();

// Function to fetch motivational quote and send notification
async function sendMotivationalQuoteNotification(token, name, gender, age, occupation, language) {
    logger.info('calling openai service');
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
            logger.error('Error sending notification: %o', error);
        }
    }
}

module.exports = { sendMotivationalQuoteNotification };