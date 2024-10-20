require('dotenv').config();
const config = require('../config/config');
const axios = require('axios');
const { OpenAI } = require('openai');
const fs = require('fs');
const createLoggerWithFilename = require('./logService');
const logger = createLoggerWithFilename(__filename);
const openai = new OpenAI();
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const stylesArray = config.styles.split(',');

// Function to get a random style from the stylesArray
// function getRandomStyle() {
//     const randomIndex = Math.floor(Math.random() * stylesArray.length);
//     return stylesArray[randomIndex];
// }
// // Fetch motivational quote from OpenAI
// async function fetchMotivationalQuote(name, gender, age, occupation) {
//     if (gender === 'Neutral') {
//         gender = '';
//     }
//     const style = getRandomStyle();

//     const prompt = `Generate a ${style} style motivational quote for a person with name ${name}, ${age}-year-old ${gender} ${occupation}.`;

//     try {
//         const response = await axios.post(
//             `${config.openAI_URL}/v1/chat/completions`,
//             {
//                 model: config.openAIModel,
//                 messages: [
//                     { role: 'system', content: 'You are an assistant that generates motivational quotes.' },
//                     { role: 'user', content: prompt }
//                 ],
//                 max_tokens: 100,
//                 temperature: 0.7
//             },
//             {
//                 headers: {
//                     Authorization: `Bearer ${OPENAI_API_KEY}`,
//                     'Content-Type': 'application/json'
//                 }
//             }
//         );

//         if (response.data.choices && response.data.choices.length > 0) {
//             return response.data.choices[0].message.content.trim();
//         } else {
//             logger.warn('No choices returned from API.');
//             return 'Stay motivated!';
//         }
//     } catch (error) {
//         logger.error('Error fetching quote: %o', error);
//         return 'Stay motivated!';
//     }
// }

// Function to fetch multiple motivational quotes in batch
// Uploads a file to OpenAI for batch processing
async function uploadFileToOpenAI(file_path) {
    const file = await openai.files.create({
      file: fs.createReadStream(file_path),
      purpose: "batch",
    });
  
    return file
  }

// Creates a batch process for a given file ID
async function createBatch(file_id) {
    const batch = await openai.batches.create({
        input_file_id: file_id,
        endpoint: "/v1/chat/completions",
        completion_window: "24h"
        });

    return batch;
}

// Retrieves the final output from OpenAI using the output file ID
async function getFinalOutput(output_file_id) {
    logger.info(`Fetching file content using file id : ${output_file_id}`)
    const fileResponse = await openai.files.content(output_file_id);
    const fileContents = await fileResponse.text();

    return fileContents;
  }

// Continuously checks the status of a batch until it is completed
async function retrieveBatch(batch_id) {
    let batch;
    const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

    try {
        do {
            batch = await openai.batches.retrieve(batch_id);
            console.log(`Batch status: ${batch.status}`);
            if (batch.status !== 'completed') {
                await delay(600000); // Wait for 10 mins before checking again
            }
        } while (batch.status !== 'completed');

        const output = await getFinalOutput(batch.output_file_id);
        return output;
    } catch (error) {
        logger.error(`Error retrieving batch: ${error}`);
        return 'Error retrieving batch';
    }
}

// Extracts messages from the response string
function extractMessages(response) {

    logger.info('Extracting token and message from response...');

    let final_messages = [];

    // Check if response is a string
    if (typeof response === 'string') {
        // Split the string by newlines to get individual JSON objects
        const responseLines = response.trim().split('\n');

        responseLines.forEach(line => {
            try {
                // Parse each line as a JSON object
                const item = JSON.parse(line);

                // Extract the custom_id and message content
                const custom_id = item.custom_id;
                const message = item.response.body.choices[0].message.content.replace(/^"|"$/g, '');
                final_messages.push({ custom_id, message });
            } catch (error) {
                logger.error('Failed to parse line as JSON:', error.message);
                logger.debug('Line content:', line);
            }
        });
    } else {
        logger.warn('Response is not a string.');
    }

    logger.info(`final messages: ${JSON.stringify(final_messages)}`);
    return final_messages;
}

// Orchestrates the batch API call process
async function makeBatchApiCall(file_path) {
    try {
        logger.info(`Uploading ${file_path} to Open AI...`);
        const file = await uploadFileToOpenAI(file_path);
        if (!file || !file.id) {
            throw new Error('Failed to upload file or retrieve file ID.');
        }

        logger.info(`Creating batch file for file with id ${file.id}`);
        const batch = await createBatch(file.id);
        if (!batch || !batch.id) {
            throw new Error('Failed to create batch or retrieve batch ID.');
        }

        logger.info(`Waiting for batch call with id ${batch.id} to complete...`);
        const responses = await retrieveBatch(batch.id);
        if (!responses) {
            throw new Error('Failed to retrieve batch responses.');
        }

        logger.info('Batch responses are returned successfully');
        const final_messages = extractMessages(responses);
        return final_messages;
    } catch (error) {
        logger.error('Error in makeBatchApiCall: %o', error);
        throw error; // Re-throw the error to be caught by the calling function
    }
}

module.exports = { makeBatchApiCall };