require('dotenv').config();
const config = require('./config/config');
const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const { sendNotificationsToUsers, sendNotifications } = require('./notifications/notificationService');
const { registerUser, updateUser } = require('./services/userService');
const createLoggerWithFilename = require('./services/logService');
const { scheduleDailyNotifications } = require('./services/scheduler')
const { makeBatchApiCall } = require('./services/openAIService');
const { createBatchRequestFile } = require('./app_data/makeDataFile');
const logger = createLoggerWithFilename(__filename);
const app = express();
app.use(bodyParser.json());

const td_collection_id = config.tdCollectionId;

// Endpoint to register the device token and save/update user data
app.post('/register', async (req, res) => {
    const { token, name, gender, age, occupation, language, frequency } = req.body;

    try {
        logger.info('Registering new user...')
        const message = await registerUser(td_collection_id, token, name, gender, age, occupation, language, frequency);
        res.send(message);
    } catch (error) {
        logger.error('Error in user registration: %o', error);
        res.status(400).send(error.message);
    }
});


// Endpoint to update user data
app.put('/update', async (req, res) => {
    const { token, name, gender, age, occupation, language, frequency } = req.body;

    try {
        logger.info('Updating user details...')
        const message = await updateUser(td_collection_id, token, name, gender, age, occupation, language, frequency);
        res.send(message);
    } catch (error) {
        logger.error('Error updating user data: %o', error);
        res.status(400).send(error.message);
    }
});

// Endpoint to send notifications
// app.post('/send-notification', async (req, res) => {
//     try {
//         logger.info('Sending notifications to users...');
//         await sendNotificationsToUsers();
//         res.send('Notifications processed successfully!');
//     } catch (error) {
//         logger.error('Error sending notifications: %o', error);
//         res.status(500).send('Failed to send notifications.');
//     }
// });

// // Endpoint to trigger batch API call: loads batchinput file to openai and gets responses and send notifications
app.post('/send-notification-v2', async (req, res) => {
    try {
        logger.info('Sending notifications to users busing batch api call...');
        await sendNotifications();
        logger.info('Completed sending notifications.')
        res.send('Notifications processed successfully!');
    } catch (error) {
        logger.error('Error sending notifications: %o', error);
        res.status(500).send('Failed to send notifications.');
    }
});

// test end points
// Endpoint to create batch request file in root folder to load into open ai
app.post('/create-batch-request-file', async (req, res) => {
    try {
        logger.info('Creating batch request file...');
        await createBatchRequestFile();
        res.send('Batch request file created successfully!');
    } catch (error) {
        logger.error('Error creating batch request file: %o', error);
        res.status(500).send('Failed to create batch request file.');
    }
});

// Function to get the batch input file
function getBatchInputFile() {
    const directoryPath = path.join(__dirname, 'app_data');
    const files = fs.readdirSync(directoryPath);

    const fileName = files.find(file => 
        file.startsWith('batchinput') && file.endsWith('.jsonl')
    );

    return fileName ? path.join('app_data', fileName) : null;
}

// Endpoint to trigger batch API call: loads batchinput file to openai and gets responses
app.post('/batch-api-call', async (req, res) => {
    try {
        logger.info('Initiating batch API call...');
        
        const fileName = getBatchInputFile();
        if (!fileName) {
            logger.error('No batch input file found.');
            return res.status(404).send('Batch input file not found.');
        }
        logger.info(`Found file : ${fileName}`)
        const response = await makeBatchApiCall(fileName);
        res.status(200).send(response);
    } catch (error) {
        logger.error('Error during batch API call: %o', error);
        res.status(500).send('Failed to make batch API call.');
    }
});


// Schedule the job to run every day at 11 PM
scheduleDailyNotifications();

// Start the server
app.listen(config.port, () => {
    logger.info('Server running on port %s', config.port);
});
