const { getAllRecords } = require('../services/pocketbaseService');
const config = require('../config/config');
const fs = require('fs');
const createLoggerWithFilename = require('../services/logService');

const logger = createLoggerWithFilename(__filename);
const prompt_template = config.prompt_template;
const td_collection_id = config.tdCollectionId;

// Asynchronous function to fetch user details from PocketBase
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

// Function to format prompts for each user and write to file
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
    const now = new Date();
    const timestamp = `${now.getFullYear()}_${String(now.getMonth() + 1).padStart(2, '0')}_${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}_${String(now.getMinutes()).padStart(2, '0')}_${String(now.getSeconds()).padStart(2, '0')}`;
    const fileName = `${config.input_data_file}_${timestamp}.jsonl`;
    // Write each formatted prompt as a JSON line to 'batchinput.jsonl'
    const fileStream = fs.createWriteStream(fileName);
    formattedPrompts.forEach(prompt => {
        fileStream.write(JSON.stringify(prompt) + '\n');
    });
    fileStream.end();

    return fileName;
}

// Asynchronous function to create a batch request file
async function createBatchRequestFile() {
    const users = await fetchUserDetails();

    if (!users) {
        logger.info('No users to create batch input file');
        return;
    }

    const file_name = formatPromptForUsers(users, prompt_template)
    const timestamp = new Date().toISOString();
    logger.info(`Batch Input file ${file_name} is created successfully at ${timestamp}`)
    return file_name;
}

module.exports = {
    createBatchRequestFile
}