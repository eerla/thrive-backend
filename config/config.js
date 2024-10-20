// config.js
module.exports = {
    pocketbaseUrl: "https://thrive.pockethost.io",
    tdCollectionId: "thrive_data",
    fpCollectionId: "failed_promises",
    port: 3000,
    input_data_file: 'app_data/batchinput.jsonl',
    openAI_URL: 'https://api.openai.com',
    openAIModel: "gpt-4o-mini",
    // openAIModel: 'gpt-3.5-turbo',
    styles: "Tony Robbins,Les Brown,Simon Sinek,Eric Thomas,Brené Brown,Zig Ziglar,Mel Robbins,Gary Vaynerchuk,Jim Rohn,Robin Sharma,Brendon Burchard,Lisa Nichols,Grant Cardone,Nick Vujicic,Brian Tracy,T.D. Jakes,John Maxwell,Tim Ferriss,Jay Shetty,Inky Johnson,David Goggins,Jocko Willink",
    prompt_template: {
        "custom_id": "$$token",
        "method": "POST",
        "url": "/v1/chat/completions",
        "body": {
            "model": "gpt-4o-mini",
            "temperature": 0.9,
            "messages": [
                {
                    "role": "system",
                    "content": "You are a master of crafting motivational, impactful, and emotionally resonant quotes. Your task is to create quotes that inspire self-growth, perseverance, accountability, and respect for oneself and others. Each quote should reflect the importance of ethics, family values, discipline, and awareness, and should encourage personal and professional development. Avoid repetitive structures, ensuring each quote is unique in style, tone, and length. Vary the emotions and use creative devices like metaphors, anecdotes, or direct calls to action. Themes may include overcoming challenges, achieving goals, self-awareness, leadership, teamwork, creativity, and the pursuit of excellence. The quotes should evoke a sense of purpose and empowerment, blending encouragement with a touch of wisdom. Aim for variety in length, emotion, and intensity, ensuring that the quotes are uplifting and values-driven."
                },
                {
                    "role": "user",
                    "content": "Create a quote that resonates with the themes of perseverance, creativity, discipline, and self-growth. It should also reflect respect for family, accountability, and ethics. the quote should be powerful and slightly personalized, infusing a message that resonates with their journey to someone who's name is $$name, a $$age year-old $$gender working as a $$occupation. Keep the quote short, impactful, and emotionally engaging."
                }
            ],
            "max_tokens": 500
        }
    }
};