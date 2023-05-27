"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const processQuery_1 = __importDefault(require("./processQuery"));
const requestGPT_1 = __importDefault(require("./requestGPT"));
const template_1 = require("./template");
async function getCompletion(title, documents, pastMessages, ignoreIds, prevData, callTracker, forceResponse) {
    let reports = [];
    let responseSet = new Set();
    let duplicateRun = 0;
    async function getContinuation() {
        let response;
        if (forceResponse) {
            response = forceResponse;
        }
        else {
            const rawRes = await (0, requestGPT_1.default)({
                messages: [
                    {
                        role: 'system',
                        content: (0, template_1.getSystemText)(!!documents.length),
                    },
                    {
                        role: 'user',
                        name: 'Researcher',
                        content: (0, template_1.getInitText)(title, documents.map(e => e.title)),
                    },
                    ...pastMessages,
                ],
            }, callTracker);
            response = rawRes.data.choices[0].message.content;
        }
        if (responseSet.has(response)) {
            duplicateRun++;
            return 0;
        }
        lastCompletion = response;
        responseSet.add(response);
        console.log(`Processing response: "${response}"`);
        if (response.length > 500) {
            if (response.split(' ').length > 1000) {
                reports.push(response);
                return false;
            }
            const continuationRes = await (0, requestGPT_1.default)({
                messages: [
                    {
                        role: 'system',
                        content: (0, template_1.getSystemText)(!!documents.length),
                    },
                    {
                        role: 'user',
                        name: 'Researcher',
                        content: (0, template_1.getInitText)(title, documents.map(e => e.title)),
                    },
                    ...pastMessages,
                    {
                        role: 'assistant',
                        content: response,
                    },
                    {
                        role: 'user',
                        name: 'Researcher',
                        content: 'Thank you - that looks good, but is too short in its current form. Please add another section(s), using more of the research you have already gathered to continue writing.',
                    },
                ],
                temperature: 0.85,
                presence_penalty: 0.75,
                frequency_penalty: 0.55,
            }, callTracker);
            reports.push(`${response}\n\n[... re-prompted ...]\n\n${continuationRes.data.choices[0].message.content}`);
            return false;
        }
        return await (0, processQuery_1.default)(response, prevData, documents, ignoreIds);
    }
    let lastCompletion = '';
    let completions = [];
    const attemptsHere = Math.floor(Math.random() * 1) + 1;
    for (let completionIndex = 0; completionIndex < attemptsHere; completionIndex++) {
        console.log(`testing continuation ${completionIndex + 1}/${attemptsHere}`);
        const completion = await getContinuation();
        if (completion) {
            completions.push(completion);
        }
        else if (completion === 0) {
            console.log('skipped!');
        }
        else if (completion === false) {
            console.log('got report');
        }
        else {
            console.log(`failed to parse`);
        }
        if (duplicateRun >= 2) {
            break;
        }
    }
    return {
        reportsAscertained: reports,
        continuation: completions.length || reports.length ? completions : [
            {
                resultOffered: `I couldn't understand what you mean! Please try rephrasing your request in a simpler way so that I can understand what you'd like me to look up for you. Remember that I am also an AI, so can only understand basic commands as stated above.`,
                resultId: '',
                type: 'document',
                query: '',
                isEmpty: true,
                gptResponse: lastCompletion,
                isBad: true,
            },
        ],
    };
}
exports.default = getCompletion;
