// load environment variables
require('dotenv').config();

let PocketBase;
let client;
let pb_collection_id = process.env.POCKETBASE_COLLECTION_ID;
// Function to initialize PocketBase
async function initializePocketBase() {
    if (!PocketBase) {
        PocketBase = (await import('pocketbase')).default;
        client = new PocketBase(process.env.POCKETBASE_URL);
        console.log('PocketBase initialized');
        await client.admins.authWithPassword(process.env.POCKETBASE_ADMIN_USERNAME, process.env.POCKETBASE_ADMIN_PASSWORD);
        console.log('admin authenticated');
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
        const record = await client.collection(pb_collection_id).create({ id: recordId, ...data });
        console.log('Record created:', record);
        return record;
    } catch (error) {
        console.error('Error creating record:', error);
    }
}

// Function to update an existing record
async function updateRecord(data) {
    await initializePocketBase(); // Ensure PocketBase is initialized
    try {
        const recordId = sliceString(data.token); // Use last 15 characters of the token as the record ID
        const record = await client.collection(pb_collection_id).update(recordId, {token_x_user: data});
        
        console.log('Record updated:', record);
        return record;
    } catch (error) {
        console.error('Error updating record:', error);
    }
}

// Function to delete a record
async function deleteRecord(token) {
    await initializePocketBase(); // Ensure PocketBase is initialized
    try {
        const recordId = sliceString(data.token); // Use last 15 characters of the token as the record ID
        await client.collection(pb_collection_id).delete(recordId);
        console.log('Record deleted:', recordId);
    } catch (error) {
        console.error('Error deleting record:', error);
    }
}

// Function to fetch all records from a collection
async function getAllRecords(collectionName) {
    await initializePocketBase(); // Ensure PocketBase is initialized
    try {
        const records = await client.collection(collectionName).getFullList({
            sort: '-created',
        });
        console.log('Fetched records:', records);
        return records;
    } catch (error) {
        console.error('Error fetching records:', error);
    }
}

module.exports = { createRecord, updateRecord, deleteRecord, getAllRecords };