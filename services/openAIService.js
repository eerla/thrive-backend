const axios = require('axios');
require('dotenv').config();
const OPENAI_API_KEY = process.env.OPENAI_API_KEY; // Make sure this is set in your .env file

// Fetch motivational quote from OpenAI
async function fetchMotivationalQuote(name, gender, age, occupation, language, style = 'jim rohn') {
    if (gender === 'Neutral') {
        gender = '';
    }

  const prompt = `Generate a ${style} style motivational quote for a person with name ${name}, ${age}-year-old ${gender} ${occupation} who speaks ${language}.`;

  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-3.5-turbo', // or 'gpt-4' based on your preference
        messages: [
          {role: 'system', content: 'You are an assistant that generates motivational quotes.'},
          {role: 'user', content: prompt}
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
      console.warn('No choices returned from API.');
      return 'Stay motivated!';
    }
  } catch (error) {
    console.error('Error fetching quote:', error);
    return 'Stay motivated!';
  }
}

module.exports = { fetchMotivationalQuote };
    