require('dotenv').config();
const createLoggerWithFilename = require('./logService');
const logger = createLoggerWithFilename(__filename);
let PocketBase;
let client;

// Function to initialize PocketBase
async function initializePocketBase() {
    if (!PocketBase) {
        PocketBase = (await import('pocketbase')).default;
        client = new PocketBase(process.env.POCKETBASE_URL);
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
        logger.error('Error creating record: %o', error);
    }
}

// Function to update an existing record
async function updateRecord(collectionName, data) {
    await initializePocketBase();
    try {
        const recordId = sliceString(data.token);
        const record = await client.collection(collectionName).update(recordId, { token_x_user: data });
        logger.info('Record updated: %o', record.id);
        return record;
    } catch (error) {
        if (error instanceof PocketBase.ClientResponseError && error.status === 404) {
            logger.warn('Record not found, attempting to create a new record: %o', error);
            try {
                const newRecord = await createRecord(collectionName, data);
                return newRecord;
            } catch (createError) {
                logger.error('Error creating record after update failed: %o', createError);
                throw createError;
            }
        } else {
            logger.error('Error updating record: %o', error);
            throw error;
        }
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
async function getAllRecords(collectionName) {
    await initializePocketBase();
    try {
        const records = await client.collection(collectionName).getFullList({
            sort: '-created',
        });
        return records;
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

module.exports = { createRecord, updateRecord, deleteRecord, getAllRecords, createFailedRecord };