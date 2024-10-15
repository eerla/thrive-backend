// load environment variables
require('dotenv').config();
const createLoggerWithFilename = require('./logService'); // Import the logger
const logger = createLoggerWithFilename(__filename);
let PocketBase;
let client;
let pb_collection_id = process.env.POCKETBASE_COLLECTION_ID;
// Function to initialize PocketBase
async function initializePocketBase() {
    if (!PocketBase) {
        PocketBase = (await import('pocketbase')).default;
        client = new PocketBase(process.env.POCKETBASE_URL);
        logger.info('PocketBase initialized');
        await client.admins.authWithPassword(process.env.POCKETBASE_ADMIN_USERNAME, process.env.POCKETBASE_ADMIN_PASSWORD);
        logger.info('admin authenticated');
    }
}

const sliceString = (token) => {
    return token.slice(25,40);
}
// Function to create a new record
async function createRecord(data) {
    await initializePocketBase(); // Ensure PocketBase is initialized
    try {
        const recordId = sliceString(data.token); // Use last 15 characters of the token as the record ID
        const record = await client.collection(pb_collection_id).create({ id: recordId, token_x_user: data });
        logger.info('Record created: %o', record);
        return record;
    } catch (error) {
        logger.error('Error creating record: %o', error);
    }
}

// Function to update an existing record
async function updateRecord(data) {
    await initializePocketBase(); // Ensure PocketBase is initialized
    try {
        const recordId = sliceString(data.token); // Use last 15 characters of the token as the record ID
        const record = await client.collection(pb_collection_id).update(recordId, { token_x_user: data });
        
        logger.info('Record updated: %o', record.id);
        return record;
    } catch (error) {
        if (error instanceof PocketBase.ClientResponseError && error.status === 404) {
            logger.warn('Record not found, attempting to create a new record: %o', error);
            try {
                
                const newRecord = await createRecord(data);
                return newRecord;
            } catch (createError) {
                logger.error('Error creating record after update failed: %o', createError);
                throw createError; // Re-throw the error to handle it further up the call stack
            }
        } else {
            logger.error('Error updating record: %o', error);
            throw error; // Re-throw the error to handle it further up the call stack
        }
    }
}

// Function to delete a record
async function deleteRecord(data) {
    await initializePocketBase(); // Ensure PocketBase is initialized
    try {
        const recordId = sliceString(data.token); // Use last 15 characters of the token as the record ID
        await client.collection(pb_collection_id).delete(recordId);
        logger.info('Record deleted: %o', recordId);
    } catch (error) {
        logger.error('Error deleting record: %o', error);
    }
}

// Function to fetch all records from a collection
async function getAllRecords(collectionName) {
    await initializePocketBase(); // Ensure PocketBase is initialized
    try {
        const records = await client.collection(collectionName).getFullList({
            sort: '-created',
        });
        return records;
    } catch (error) {
        logger.error('Error fetching records: %o', error);
    }
}

module.exports = { createRecord, updateRecord, deleteRecord, getAllRecords };