const { getAllRecords } = require('../services/pocketbaseService');
const config = require('../config/config');
const fs = require('fs');
const createLoggerWithFilename = require('../services/logService');

const logger = createLoggerWithFilename(__filename);
const prompt_template = config.prompt_template;
const td_collection_id = config.tdCollectionId;

async function fetchUserDetails() {
    logger.info('Fetching users from PocketBase...');
        const users = await getAllRecords(td_collection_id, filter='token_x_user != null');
        const user_cnt = users.length;
        logger.info(`User count: ${user_cnt}`);

        if (user_cnt === 0) {
            logger.info('No users registered for notifications.');
            return;
        }
        return users;
};

// const users = await fetchUserDetails();
function formatPromptForUsers(users, promptTemplate) {
    logger.info('Formatting prompts...')
    const formattedPrompts = users.map(usr => {
        const user = usr.token_x_user;
        const formattedPrompt = JSON.stringify(promptTemplate).replace(/\$\$(\w+)/g, (_, key) => {
            return user[key] || '';
        });
        // console.log(formattedPrompt);
        return JSON.parse(formattedPrompt);
    });

    logger.info('creating batch input file...')
    // Write each formatted prompt as a JSON line to 'batchinput.jsonl'
    const fileStream = fs.createWriteStream('app_data/batchinput.jsonl');
    formattedPrompts.forEach(prompt => {
        fileStream.write(JSON.stringify(prompt) + '\n');
    });
    fileStream.end();
}

async function createBatchRequestFile() {
    const users = await fetchUserDetails();

    if (!users) {
        logger.info('No users to create batch input file');
        return;
    }

    formatPromptForUsers(users, prompt_template)
    const timestamp = new Date().toISOString();
    logger.info(`Batch Input file is created successfully at ${timestamp}`)

}

module.exports = {
    createBatchRequestFile
}