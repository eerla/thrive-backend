require('dotenv').config();
const config = require('../config/config');
const axios = require('axios');
const createLoggerWithFilename = require('./logService');
const logger = createLoggerWithFilename(__filename);

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const stylesArray = config.styles.split(',');

// Function to get a random style from the stylesArray
function getRandomStyle() {
    const randomIndex = Math.floor(Math.random() * stylesArray.length);
    return stylesArray[randomIndex];
}
// Fetch motivational quote from OpenAI
async function fetchMotivationalQuote(name, gender, age, occupation) {
    if (gender === 'Neutral') {
        gender = '';
    }
    const style = getRandomStyle();

    const prompt = `Generate a ${style} style motivational quote for a person with name ${name}, ${age}-year-old ${gender} ${occupation}.`;

    try {
        const response = await axios.post(
            config.openAI_URL,
            {
                model: config.openAIModel,
                messages: [
                    { role: 'system', content: 'You are an assistant that generates motivational quotes.' },
                    { role: 'user', content: prompt }
                ],
                max_tokens: 100,
                temperature: 0.7
            },
            {
                headers: {
                    Authorization: `Bearer ${OPENAI_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (response.data.choices && response.data.choices.length > 0) {
            return response.data.choices[0].message.content.trim();
        } else {
            logger.warn('No choices returned from API.');
            return 'Stay motivated!';
        }
    } catch (error) {
        logger.error('Error fetching quote: %o', error);
        return 'Stay motivated!';
    }
}

module.exports = { fetchMotivationalQuote };