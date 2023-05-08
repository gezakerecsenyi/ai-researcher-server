import { ChatCompletionRequestMessage, CreateChatCompletionRequest } from 'openai';
import { openai } from './index';
import { getInitText, systemText } from './template';

export default async function requestGPT(data: Partial<CreateChatCompletionRequest> & Pick<CreateChatCompletionRequest, 'messages'>, callTracker?: () => void) {
    if (callTracker) {
        callTracker();
    }

    await new Promise((resolve) => {
        setTimeout(resolve, 1000);
    });

    console.log('making new chatgpt req');

    return await openai.createChatCompletion({
        model: 'gpt-4',
        temperature: 0.6,
        n: 1,
        presence_penalty: 0.5,
        frequency_penalty: 0.3,
        max_tokens: 3000,
        ...data,
    });
}