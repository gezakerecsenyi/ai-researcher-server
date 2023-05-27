"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("./index");
async function requestGPT(data, callTracker) {
    if (callTracker) {
        callTracker();
    }
    await new Promise((resolve) => {
        setTimeout(resolve, 1000);
    });
    console.log('making new chatgpt req');
    return await index_1.openai.createChatCompletion({
        model: 'gpt-4',
        temperature: 0.6,
        n: 1,
        presence_penalty: 0.5,
        frequency_penalty: 0.3,
        max_tokens: 3000,
        ...data,
    });
}
exports.default = requestGPT;
