require('dotenv').config();
const config = require('../config/config');
const createLoggerWithFilename = require('./logService');
const logger = createLoggerWithFilename(__filename);
let PocketBase;
let client;

// Function to initialize PocketBase
async function initializePocketBase() {
    if (!PocketBase) {
        PocketBase = (await import('pocketbase')).default;
        client = new PocketBase(config.pocketbaseUrl);
        logger.info('PocketBase initialized');
        await client.admins.authWithPassword(process.env.POCKETBASE_ADMIN_USERNAME, process.env.POCKETBASE_ADMIN_PASSWORD);
        logger.info('Admin authenticated');
    }
}

const sliceString = (token) => token.slice(25, 40);

// Function to create a new record
async function createRecord(collectionName, data) {
    await initializePocketBase();
    try {
        const recordId = sliceString(data.token);
        const record = await client.collection(collectionName).create({ id: recordId, token_x_user: data });
        logger.info('Record created: %o', record.id);
        return record;
    } catch (error) {
        if (error.response && error.response.code === 400 && error.response.data.id.message.includes('The model id is invalid or already exists')) {
            logger.info(`Record already exists for id: ${sliceString(data.token)}`);
            return null; // Return null or a specific value to indicate the record already exists
        } else {
            logger.error('Error creating record: %o', error);
            throw error; // Re-throw the error if it's not the specific case
        }
    }
}

// Function to update an existing record
async function updateRecord(collectionName, data) {
    await initializePocketBase();
    try {
        const recordId = sliceString(data.token);
        const record = await client.collection(collectionName).update(recordId, { token_x_user: data });
        logger.info(`Record updated: ${record.id}`);
        return record;
    } catch (error) {
        logger.error(`Error updating record: ${error}`);
        throw error;
    }
}

// Function to delete a record by token
async function deleteRecord(collectionName, data) {
    await initializePocketBase();
    try {
        const recordId = sliceString(data.token);
        await client.collection(collectionName).delete(recordId);
        logger.info('Record deleted: %o', recordId);
    } catch (error) {
        logger.error('Error deleting record: %o', error);
    }
}

// Function to fetch all records from a collection
async function getAllRecords(collectionName, filter='') {
    await initializePocketBase();
    try {
        const records = await client.collection(collectionName).getFullList({
            filter: filter,
        });

        logger.info('filtering unregistered tokens..')
        const unregistered_tokens = await client.collection('unregistered_tokens').getFullList({
            sort: '-created',
        });

        // Extract ids from pb_unregistered
        const unregisteredIds = new Set(unregistered_tokens.map(unregistered => unregistered.id));
        // Filter pb_users to remove objects with ids present in pb_unregistered
        const validRecords = records.filter(user => !unregisteredIds.has(user.id));

        return validRecords;
    } catch (error) {
        logger.error('Error fetching records: %o', error);
    }
}

// Function to create a new record
async function createFailedRecord(collectionName, data) {
    await initializePocketBase();
    try {
        const record = await client.collection(collectionName).create({ token_x_user:data.token_x_user, reason:data.reason });
        logger.info('Failed promise is recorded: %o', record);
        return record;
    } catch (error) {
        logger.error('Error recording failed promise: %o', error);
    }
}

// Function to create a new record
async function createUnregisteredRecord(collectionName, data) {
    await initializePocketBase();

    try {
        const recordId = sliceString(data.expo_token);
        const record = await client.collection(collectionName).create({ 
            id: recordId, 
            expo_token: data.expo_token, 
            reason: data.reason, 
            error: data.error 
        });
        logger.info('Undelivered record created: %o', record.id);
        return record;
    } catch (error) {
        if (error.response && error.response.code === 400 && error.response.data.id.message.includes('The model id is invalid or already exists')) {
            logger.info(`Record already exists for id: ${sliceString(data.expo_token)}`);
            return null; // Return null or a specific value to indicate the record already exists
        } else {
            logger.error('Error creating record: %o', error);
            throw error; // Re-throw the error if it's not the specific case
        }
    }
}

module.exports = { createRecord, updateRecord, deleteRecord, getAllRecords, createFailedRecord, createUnregisteredRecord };