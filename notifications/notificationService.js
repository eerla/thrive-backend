require('dotenv').config();
const config = require('../config/config');
const { Expo } = require('expo-server-sdk');
const { fetchMotivationalQuote, makeBatchApiCall } = require('../services/openAIService');
const { getAllRecords, createFailedRecord, createUnregisteredRecord } = require('../services/pocketbaseService');
const createLoggerWithFilename = require('../services/logService');
const { createBatchRequestFile } = require('../app_data/makeDataFile');
const fs = require('fs');

const logger = createLoggerWithFilename(__filename);
const expo = new Expo();
const fp_collection_id = config.fpCollectionId;
const td_collection_id = config.tdCollectionId;
const ur_collection_id = config.urCollectionId;

// TO BE ARCHIVED
// async function sendNotificationsToUsers() {
//     logger.info('Fetching users from PocketBase...');
//     const users = await getAllRecords(td_collection_id, filter='token_x_user != null');
//     const user_cnt = users.length;
//     logger.info(`User count: ${user_cnt}`);

//     if (user_cnt === 0) {
//         const msg = 'No users registered for notifications.';
//         logger.info(msg);
//         return msg;
//     }

//     let sentCount = 0;
//     let failedToSendCount = 0;
//     let deliveredCount = 0;
//     let failedToDeliverCount = 0;

//     const notificationPromises = await createNotificationPromises(users);
//     const notificationResults = await Promise.allSettled(notificationPromises);

//     // Count successfully sent and failed to send notifications
//     logger.info('Processing notification sent promises')
//     for (const result of notificationResults) {
//         if (result.status === 'fulfilled' && result.value) {
//             sentCount += result.value.length; // Assuming result.value is an array of tickets
//         } else {
//             failedToSendCount++;
//             // Save unsuccessful records to the database
//             logger.error(`Failed to send notification to token: ${result.value.user.token}. Reason: ${result.value.reason}`);
//             await createFailedRecord(fp_collection_id, {
//                 token_x_user: result.value.user,
//                 reason: result.value.reason
//             });
//         }
//     }

//     logger.info(`Notifications successfully sent: ${sentCount}`);
//     logger.info(`Notifications failed to send: ${failedToSendCount}`);

//     logger.info('Processing delivered promises...')
//     const successfulTickets = notificationResults
//         .filter(result => result.status === 'fulfilled' && result.value)
//         .flatMap(result => result.value);



//     if (successfulTickets.length > 0) {
//         const receiptResults = await processNotificationReceipts(successfulTickets);
        
//         // Count successfully delivered and failed to deliver notifications
//         receiptResults.forEach(result => {
//             if (result.status === 'ok') {
//                 deliveredCount++;
//             } else {
//                 failedToDeliverCount++;

//                 if (result.status === 'error') {
//                     logger.error(`Failed to send notification to token: ${result.token}. Reason: ${result.reason}`);

//                     if (result.reason.includes('Invalid') || result.reason.includes('DeviceNotRegistered')) {
//                         // Token is invalid or device is not registered, remove the token from the database
//                         async function handleInvalidToken(result) {
//                             // Token is invalid or device is not registered, remove the token from the database
//                             await removeTokenFromDatabase(result.token);
//                             logger.info(`Removed invalid token: ${result.token}`);
//                         }

//                         handleInvalidToken(result);
//                     }
//                 }
//             }
//         });
//     }

//     logger.info(`Notifications successfully delivered: ${deliveredCount}`);
//     logger.info(`Notifications failed to deliver: ${failedToDeliverCount}`);
// }

// // Create notification promises
// async function createNotificationPromises(users) {
//     logger.info('Creating notification promises...');
//     return users.map(usr => {
//         const user = usr.token_x_user;
//         if (Expo.isExpoPushToken(user.token)) {
//             return sendMotivationalQuoteNotification(
//                 user.token,
//                 user.name,
//                 user.gender,
//                 user.age,
//                 user.occupation,
//                 user.language
//             ).catch(error => ({
//                 status: 'rejected',
//                 user,
//                 reason: error.message
//             }));
//         } else {
//             return {
//                 status: 'rejected',
//                 user,
//                 reason: 'Invalid Expo Push Token'
//             };
//         }
//     });
// }

// // Function to fetch motivational quote and send notification
// async function sendMotivationalQuoteNotification(token, name, gender, age, occupation, language) {
//     logger.info('Fetching Motivational quotes...');
//     const quote = await fetchMotivationalQuote(name, gender, age, occupation, language);

//     const message = {
//         to: token,
//         sound: 'default',
//         body: quote,
//         data: { withSome: 'data' },
//     };

//     const chunks = expo.chunkPushNotifications([message]);
//     const tickets = [];

//     for (const chunk of chunks) {
//         try {
//             const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
//             tickets.push(...ticketChunk);
//         } catch (error) {
//             logger.error('Error sending notification: %o', error);
//         }
//     }

//     return tickets; // Return tickets for further processing
// }


// // Process notification receipts
// async function processNotificationReceipts(tickets) {

//     // [{ "status": "ok", "id": "XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX" }]
//     const receiptPromises = tickets.map(async (ticket) => {
//         if (ticket.id) {
//             try {
//                 const receiptId = ticket.id;
//                 const receipt = await expo.getPushNotificationReceiptsAsync([receiptId]);

//                 // {
//                 //     "data": {
//                 //       "XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX": { "status": "ok" },
//                 //       "ZZZZZZZZ-ZZZZ-ZZZZ-ZZZZ-ZZZZZZZZZZZZ": { "status": "ok" }
//                 //       // When there is no receipt with a given ID (YYYYYYYY-YYYY-YYYY-YYYY-YYYYYYYYYYYY in this
//                 //       // example), the ID is omitted from the response.
//                 //     }
//                 //   }

//                 //RESPONSE receipt
//                 // {
//                 //     "data": {
//                 //       Receipt ID: {
//                 //         "status": "error" | "ok",
//                 //         // if status === "error"
//                 //         "message": string,
//                 //         "details": JSON
//                 //       },
//                 //       ...
//                 //     },
//                 //     // only populated if there was an error with the entire request
//                 //     "errors": [{
//                 //       "code": string,
//                 //       "message": string
//                 //     }]
//                 //   }
                
//                 const status = receipt[receiptId].status;
//                 if (status === 'ok') {
//                     logger.info(`Notification delivered successfully`);
//                     return { status: 'ok' };
//                 } else if (status === 'error') {
//                     logger.error(`Error delivering notification. Reason: ${receipt[receiptId].message}`);
//                     logger.error(`Details: ${receipt[receiptId].details}`);

//                     return {
//                         status: receipt[receiptId].status,
//                         details: receipt[receiptId].details,
//                         reason: receipt[receiptId].message,
//                     };
//                 }
//             } catch (error) {
//                 logger.error('Error retrieving receipt: ', error);
//                 return { status: 'error', token: ticket.id, reason: 'Receipt retrieval failed', request_error: error };
//             }
//         } else if (ticket.status === 'error') {
//             logger.error(`Error sending notification. Reason: ${ticket.message}`);
//             return { status: 'error', token: ticket.id, reason: ticket.message };
//         }
//     });

//     return await Promise.allSettled(receiptPromises);
// }

// creates latest input data file with users from PocketBase
// upload to open ai, make batch api call, get responses for all users
// send the response messages as push messages to devices
async function sendNotifications() {
    logger.info('Preparing batch request file for all users...')
    const input_file_name = await createBatchRequestFile();
    logger.info(`Initiating bulk notification process with file : ${input_file_name}`)
    await new Promise(resolve => setTimeout(resolve, 10000));
    const final_messages = await makeBatchApiCall(input_file_name);

    // const final_messages = [{"custom_id":"ExponentPushToken[ZHFeXSD0dyCE7N3Om3rxx01]","message":"Test2, remember that every challenge is a stepping stone—embrace creativity and discipline as your tools, and let your family's values guide you. In the pursuit of your dreams, accountability will be your compass, leading you to a future where your potential knows no bounds."},{"custom_id":"ExponentPushToken[rWrSnjKhftL_oA5t8mmQx21]","message":"Eerla, remember that every challenge you face as an engineer is a brushstroke on the canvas of your life; with discipline, creativity, and unwavering respect for those who support you, you can transform obstacles into masterpieces of growth and accountability."}]
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

    // deleting input file
    logger.info(`Deleting input file: ${input_file_name}... `)
    fs.unlink(input_file_name, (err) => {
        if (err) {
            logger.error(`Error deleting file: ${input_file_name}`, err);
        } else {
            logger.info(`Successfully deleted file: ${input_file_name}`);
        }
    });

    // logger.info(`Notification tickets: ${JSON.stringify(tickets)}`)
    // SAMPLE SUCCESS TICKET FORMAT
    // {
    //     "data": [
    //       { "status": "ok", "id": "XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX" },
    //       { "status": "ok", "id": "YYYYYYYY-YYYY-YYYY-YYYY-YYYYYYYYYYYY" },
    //       { "status": "ok", "id": "ZZZZZZZZ-ZZZZ-ZZZZ-ZZZZ-ZZZZZZZZZZZZ" },
    //       { "status": "ok", "id": "AAAAAAAA-AAAA-AAAA-AAAA-AAAAAAAAAAAA" }
    //     ]
    //   }

    //PUSH TICKET FORMAT 
    // {
    //     "data": [
    //       {
    //         "status": "error" | "ok",
    //         "id": string, // this is the Receipt ID
    //         // if status === "error"
    //         "message": string,
    //         "details": JSON
    //       },
    //       ...
    //     ],
    //     // only populated if there was an error with the entire request
    //     "errors": [{
    //       "code": string,
    //       "message": string
    //     }]
    //   }
    logger.info('Processing notification deliveries...')
    const successfulTickets = tickets.filter(result => result.status === 'ok');
    const UnsuccessfulTickets = tickets.filter(result => result.status === 'error');

    logger.info(`Notifications successfully sent: ${successfulTickets.length}`)
    logger.info(`Notifications failed to send: ${tickets.length - successfulTickets.length}`)

    // log unsuccessful (DeviceNotRegistered) tickets
    if (UnsuccessfulTickets.length > 0) {
        logger.info('Processing notifications failed to send... logging to pocketBase')
        for (const ticket of UnsuccessfulTickets) {
            await createUnregisteredRecord(ur_collection_id, {
                expo_token: ticket.details.expoPushToken,
                reason: ticket.message,
                error: ticket.details.error
            });
        }
        logger.info('completed saving failed notifications')
    }

    // process successfully sent notifications
    if (successfulTickets.length > 0) {
        logger.info('Processing notifications successfully sent for delivery confirmation...')
        let messagesDeliveredCount = 0;
        let messagesUnDeliveredCount = 0;

        for (const ticket of successfulTickets) {
            try {
                const receiptId = ticket.id;
                const receipt = await expo.getPushNotificationReceiptsAsync([receiptId]);
    
                const status = receipt[receiptId].status;
                if (status === 'ok') {
                    logger.info(`Notification delivered successfully for id : ${receiptId}`);
                    messagesDeliveredCount++;
                } else if (status === 'error') {
                    messagesUnDeliveredCount++;
                    logger.error(`Error delivering notification. Reason: ${receipt[receiptId].message}`);
                    logger.error(`Details: ${receipt[receiptId].details}`);
                    logger.info('logging to pocketBase...')
                    await createUnregisteredRecord(ur_collection_id, {
                        expo_token: ticket.details.expoPushToken,
                        reason: ticket.message,
                        error: ticket.details.error
                    });
                    logger.info('Completed logging')
                }
            } catch (error) {
                logger.error('Error retrieving receipt: ', error);
                messagesUnDeliveredCount++;
            }
        }

        logger.info(`Notifications successfully delivered: ${messagesDeliveredCount}`);
        logger.info(`Notifications failed to deliver: ${messagesUnDeliveredCount}`);
        }

        logger.info('Bulk notifications are sent and processed successfully!');

}


module.exports = { sendNotifications };