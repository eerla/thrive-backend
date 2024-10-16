require('dotenv').config();
const { Expo } = require('expo-server-sdk');
const { createRecord, updateRecord } = require('./pocketbaseService');
const { sendMotivationalQuoteNotification } = require('../notifications/notificationService')
const createLoggerWithFilename = require('./logService');
const logger = createLoggerWithFilename(__filename);

// Function to register a user
async function registerUser(collectionName, token, name, gender, age, occupation, language, frequency) {
    const data = { token, name, gender, age, occupation, language, frequency };

    if (!Expo.isExpoPushToken(token)) {
        logger.info('Invalid Expo push token received');
        throw new Error('Invalid Expo push token');
    }

    try {
        await createRecord(collectionName, data);
        logger.info('User data saved successfully for token: %s', token);
        await sendMotivationalQuoteNotification(token, name, gender, age, occupation, language);
        logger.info('Notification sent for token: %s', token);
        return 'User data saved successfully and notification sent!';
    } catch (error) {
        logger.error('Error saving user data: %o', error);
        throw new Error('Failed to save user data');
    }
}

async function updateUser(collectionName, token, name, gender, age, occupation, language, frequency) {
    const data = { token, name, gender, age, occupation, language, frequency };

    if (!Expo.isExpoPushToken(token)) {
        logger.info('Invalid Expo push token received');
        throw new Error('Invalid Expo push token');
    }

    try {
        await updateRecord(collectionName, data);
        logger.info('User data updated successfully for token: %s', token);
        return 'User data updated successfully!';
    } catch (error) {
        logger.error('Error updating user data: %o', error);
        throw new Error('Failed to update user data');
    }
}


module.exports = {  registerUser, updateUser };