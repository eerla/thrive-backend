require('dotenv').config();
const config = require('../config/config');
const { Expo } = require('expo-server-sdk');
const { fetchMotivationalQuote, makeBatchApiCall } = require('../services/openAIService');
const { getAllRecords, createFailedRecord, createUnregisteredRecord } = require('../services/pocketbaseService');
const createLoggerWithFilename = require('../services/logService');

const logger = createLoggerWithFilename(__filename);
const expo = new Expo();
const fp_collection_id = config.fpCollectionId;
const td_collection_id = config.tdCollectionId;
const ur_collection_id = config.urCollectionId;

async function sendNotificationsToUsers() {
    logger.info('Fetching users from PocketBase...');
    const users = await getAllRecords(td_collection_id);
    const user_cnt = users.length;
    logger.info(`User count: ${user_cnt}`);

    if (user_cnt === 0) {
        const msg = 'No users registered for notifications.';
        logger.info(msg);
        return msg;
    }

    let sentCount = 0;
    let failedToSendCount = 0;
    let deliveredCount = 0;
    let failedToDeliverCount = 0;

    const notificationPromises = await createNotificationPromises(users);
    const notificationResults = await Promise.allSettled(notificationPromises);

    // Count successfully sent and failed to send notifications
    logger.info('Processing notification sent promises')
    for (const result of notificationResults) {
        if (result.status === 'fulfilled' && result.value) {
            sentCount += result.value.length; // Assuming result.value is an array of tickets
        } else {
            failedToSendCount++;
            // Save unsuccessful records to the database
            logger.error(`Failed to send notification to token: ${result.value.user.token}. Reason: ${result.value.reason}`);
            await createFailedRecord(fp_collection_id, {
                token_x_user: result.value.user,
                reason: result.value.reason
            });
        }
    }

    logger.info(`Notifications successfully sent: ${sentCount}`);
    logger.info(`Notifications failed to send: ${failedToSendCount}`);

    logger.info('Processing delivered promises...')
    const successfulTickets = notificationResults
        .filter(result => result.status === 'fulfilled' && result.value)
        .flatMap(result => result.value);



    if (successfulTickets.length > 0) {
        const receiptResults = await processNotificationReceipts(successfulTickets);
        
        // Count successfully delivered and failed to deliver notifications
        receiptResults.forEach(result => {
            if (result.status === 'ok') {
                deliveredCount++;
            } else {
                failedToDeliverCount++;

                if (result.status === 'error') {
                    logger.error(`Failed to send notification to token: ${result.token}. Reason: ${result.reason}`);

                    if (result.reason.includes('Invalid') || result.reason.includes('DeviceNotRegistered')) {
                        // Token is invalid or device is not registered, remove the token from the database
                        async function handleInvalidToken(result) {
                            // Token is invalid or device is not registered, remove the token from the database
                            await removeTokenFromDatabase(result.token);
                            logger.info(`Removed invalid token: ${result.token}`);
                        }

                        handleInvalidToken(result);
                    }
                }
            }
        });
    }

    logger.info(`Notifications successfully delivered: ${deliveredCount}`);
    logger.info(`Notifications failed to deliver: ${failedToDeliverCount}`);
}

// Create notification promises
async function createNotificationPromises(users) {
    logger.info('Creating notification promises...');
    return users.map(usr => {
        const user = usr.token_x_user;
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
            return {
                status: 'rejected',
                user,
                reason: 'Invalid Expo Push Token'
            };
        }
    });
}

// Function to fetch motivational quote and send notification
async function sendMotivationalQuoteNotification(token, name, gender, age, occupation, language) {
    logger.info('Fetching Motivational quotes...');
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

    return tickets; // Return tickets for further processing
}


// Process notification receipts
async function processNotificationReceipts(tickets) {
    const receiptPromises = tickets.map(async (ticket) => {
        if (ticket.id) {
            try {
                const receiptId = ticket.id;
                const receipt = await expo.getPushNotificationReceiptsAsync([receiptId]);
                
                const status = receipt[receiptId].status;
                if (status === 'ok') {
                    logger.info(`Notification delivered successfully`);
                    return { status: 'ok', token: ticket.to };
                } else if (status === 'error') {
                    logger.error(`Error delivering notification to token: ${ticket.to}. Reason: ${receipt[receiptId].message}`);
                    return {
                        status: 'error',
                        token: ticket.to,
                        reason: receipt[receiptId].message,
                    };
                }
            } catch (error) {
                logger.error('Error retrieving receipt: ', error);
                return { status: 'error', token: ticket.to, reason: 'Receipt retrieval failed' };
            }
        } else if (ticket.status === 'error') {
            logger.error(`Error sending notification. Reason: ${ticket.message}`);
            return { status: 'error', token: ticket.to, reason: ticket.message };
        }
    });

    return await Promise.all(receiptPromises);
}

async function sendNotifications() {
    logger.info('Initiating bulk notification process')
    const input_data_file = config.input_data_file;
    // const final_messages = await makeBatchApiCall(input_data_file);

    const final_messages = [{"custom_id":"ExponentPushToken[ZHFeXSD0dyCE7N3Om3rxx1]","message":"Test2, remember that the journey of an engineer is crafted not only in the precision of your designs but in the discipline to learn from every failure, the creativity to envision the impossible, and the respect for your roots that fuels your growth. Persevere with purpose, for in every challenge, you’re not just building structures, but the foundation of your legacy."},{"custom_id":"ExponentPushToken[rWrSnjKhftL_oA5t8mmQx2]","message":"Gurubrahma, remember that every challenge you face as an engineer is a canvas awaiting your creativity; with discipline as your brush and perseverance as your palette, paint a future that honors your family, respects your ethics, and showcases the strength of your journey."}]
    // Create the messages array
    let messages = [];

    logger.info('creating messages for notifications...')
    for (let { custom_id, message } of final_messages) {
        // Check if the custom_id is a valid Expo push token
        if (!Expo.isExpoPushToken(custom_id)) {
            console.error(`Push token ${custom_id} is not a valid Expo push token`);
            continue;
        }

        // Construct a message
        messages.push({
            to: custom_id,
            sound: 'default',
            body: message,
            data: { withSome: 'data' },
        });
    }

    logger.info('Pushing notifications...')
    // Chunk the messages to send them in batches
    let chunks = expo.chunkPushNotifications(messages);
    let tickets = [];

    // Send the chunks
    for (let chunk of chunks) {
        try {
            let ticketChunk = await expo.sendPushNotificationsAsync(chunk);
            tickets.push(...ticketChunk);
        } catch (error) {
            logger.error(error);
        }
    }

    // logger.info(`Notification tickets: ${JSON.stringify(tickets)}`)
    
    const successfulTickets = tickets.filter(result => result.status === 'ok');
    const UnsuccessfulTickets = tickets.filter(result => result.status === 'error');

    logger.info(`Notifications successfully sent: ${successfulTickets.length}`)
    logger.info(`Notifications failed to send: ${tickets.length - successfulTickets.length}`)
    
    // process notifications
    if (successfulTickets.length > 0) {
        logger.info('Processing pushed notifications...')
        let messagesDeliveredCount = 0;
        let messagesUnDeliveredCount = 0;
        const receiptResults = await processNotificationReceipts(successfulTickets);
        
        console.log(`Delivery receipts: ${JSON.stringify(receiptResults)}`)
        // Count successfully delivered and failed to deliver notifications
        receiptResults.forEach(result => {
            if (result.status === 'ok') {
                messagesDeliveredCount++;
            } else {
                // handle the result here, this is delivered or not
                messagesUnDeliveredCount++;
                logger.info(`Error delivering notification: ${result}`)
            }
        });

        logger.info(`Notifications successfully delivered: ${messagesDeliveredCount}`);
        logger.info(`Notifications failed to deliver: ${messagesUnDeliveredCount}`);
    } 

    // log unsuccessful (DeviceNotRegistered) tickets
    if (UnsuccessfulTickets.length > 0) {
        logger.info('logging failed to sent notifications..')
        for (const ticket of UnsuccessfulTickets) {
            await createUnregisteredRecord(ur_collection_id, {
                expo_token: ticket.details.expoPushToken,
                reason: ticket.message,
                error: ticket.details.error
            });
        }
        logger.info('completed saving failed notifications')
    }

}


async function removeTokenFromDatabase(token) {
    // Logic to remove the token from the database or mark it as inactive
    // Example: await updateRecord(td_collection_id, { token: null }, { token });
    // move to thrive_data_unregistered and delete from main
    logger.info(`Token ${token} removed from the database.`);
}

module.exports = { 
    sendNotificationsToUsers, 
    sendMotivationalQuoteNotification, 
    sendNotifications };