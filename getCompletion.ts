import { ChatCompletionRequestMessage } from 'openai';
import { openai } from './index';
import processQuery from './processQuery';
import { BingResult, search } from './search';
import { getInitText, systemText } from './template';
import { expectCloseSpeechMark, expectDocumentReference, formatSearchResults, lookupWordsInText } from './utils';

export interface Document {
    title: string;
    text: string;
}

export interface ResponseRecallData {
    gptResponse: string;
    type: 'document' | 'website' | 'internet',
    locator?: string;
    query: string;
    resultOffered: string;
    resultId: string;
    otherResults?: BingResult[];
    searchDomain?: string;
    isEmpty?: boolean;
    isBad?: boolean;
}

export interface CompletionReport {
    reportsAscertained: string[],
    continuation: ResponseRecallData[],
}

export default async function getCompletion(
    title: string,
    documents: Document[],
    pastMessages: ChatCompletionRequestMessage[],
    ignoreIds: string[],
    prevData: ResponseRecallData,
    forceResponse?: string,
): Promise<CompletionReport> {
    let reports: string[] = [];
    let responseSet = new Set<string>();

    let duplicateRun = 0;

    async function getContinuation(): Promise<ResponseRecallData | undefined | 0 | false> {
        await new Promise((resolve) => {
            setTimeout(resolve, 300);
        });

        let response: string;
        if (forceResponse) {
            response = forceResponse;
        } else {
            const rawRes = await openai.createChatCompletion({
                model: 'gpt-4',
                messages: [
                    {
                        role: 'system',
                        content: systemText,
                    },
                    {
                        role: 'user',
                        name: 'Researcher',
                        content: getInitText(
                            title,
                            documents.map(e => e.title),
                        ),
                    },
                    ...pastMessages,
                ],
                temperature: 0.6,
                n: 1,
                presence_penalty: 0.5,
                frequency_penalty: 0.3,
                max_tokens: 600,
            });

            response = rawRes.data.choices[0].message!.content;
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

        return await processQuery(
            response,
            prevData,
            documents,
            ignoreIds
        );
    }

    let lastCompletion = '';
    let completions = [];
    const attemptsHere = Math.round(Math.random() * 3) + 1;
    for (let completionIndex = 0; completionIndex < attemptsHere; completionIndex++) {
        console.log(`testing continuation ${completionIndex}/${attemptsHere}`);

        const completion = await getContinuation();
        if (completion) {
            completions.push(completion);
        } else if (completion === 0) {
            console.log('skipped!');
        } else if (completion === false) {
            console.log('got report');
        } else {
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