"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("./index");
const processQuery_1 = __importDefault(require("./processQuery"));
const template_1 = require("./template");
function getCompletion(title, documents, pastMessages, ignoreIds, prevData, forceResponse) {
    return __awaiter(this, void 0, void 0, function* () {
        let reports = [];
        let responseSet = new Set();
        let duplicateRun = 0;
        function getContinuation() {
            return __awaiter(this, void 0, void 0, function* () {
                yield new Promise((resolve) => {
                    setTimeout(resolve, 300);
                });
                let response;
                if (forceResponse) {
                    response = forceResponse;
                }
                else {
                    const rawRes = yield index_1.openai.createChatCompletion({
                        model: 'gpt-4',
                        messages: [
                            {
                                role: 'system',
                                content: template_1.systemText,
                            },
                            {
                                role: 'user',
                                name: 'Researcher',
                                content: (0, template_1.getInitText)(title, documents.map(e => e.title)),
                            },
                            ...pastMessages,
                        ],
                        temperature: 0.6,
                        n: 1,
                        presence_penalty: 0.5,
                        frequency_penalty: 0.3,
                        max_tokens: 600,
                    });
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
                    reports.push(response);
                    return false;
                }
                return yield (0, processQuery_1.default)(response, prevData, documents, ignoreIds);
            });
        }
        let lastCompletion = '';
        let completions = [];
        const attemptsHere = Math.round(Math.random() * 1) + 1;
        for (let completionIndex = 0; completionIndex < attemptsHere; completionIndex++) {
            console.log(`testing continuation ${completionIndex}/${attemptsHere}`);
            const completion = yield getContinuation();
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
    });
}
exports.default = getCompletion;
