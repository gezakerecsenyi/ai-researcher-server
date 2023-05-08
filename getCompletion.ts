import { ChatCompletionRequestMessage } from 'openai';
import processQuery from './processQuery';
import requestGPT from './requestGPT';
import { BingResult } from './search';
import { getInitText, systemText } from './template';

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
    callTracker: () => void,
    forceResponse?: string,
): Promise<CompletionReport> {
    let reports: string[] = [];
    let responseSet = new Set<string>();

    let duplicateRun = 0;

    async function getContinuation(): Promise<ResponseRecallData | undefined | 0 | false> {
        let response: string;
        if (forceResponse) {
            response = forceResponse;
        } else {
            const rawRes = await requestGPT(
                {
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
                },
                callTracker,
            );

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
            if (response.split(' ').length > 1000) {
                reports.push(response);
                return false;
            }

            const continuationRes = await requestGPT(
                {
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
                },
                callTracker,
            );

            reports.push(`${response}\n\n[... re-prompted ...]\n\n${continuationRes.data.choices[0].message!.content}`);
            return false;
        }

        return await processQuery(
            response,
            prevData,
            documents,
            ignoreIds,
        );
    }

    let lastCompletion = '';
    let completions = [];
    const attemptsHere = Math.round(Math.random() * 1) + 1;
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