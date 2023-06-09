import bodyParser from 'body-parser';
import cors from 'cors';

import express from 'express';
import { ChatCompletionRequestMessage, Configuration, OpenAIApi } from 'openai';
import getCompletion, { CompletionReport, Document, ResponseRecallData } from './getCompletion';

const configuration = new Configuration({
    apiKey: '',
    organization: 'org-xRYHdeBLidnPhskNJHZ9WaTR',
});
export const openai = new OpenAIApi(configuration);

interface HistoryState {
    chatSoFar: ChatCompletionRequestMessage[];
    matchesForThis: string[];
    lastResponse: ResponseRecallData;
    depth: number;
    badCycle: number;
    id: 0;
    lastReport: CompletionReport | null,
}

const errorMessage = '__too_many_calls__';

async function getReports(
    title: string,
    documents: Document[],
    initialSearch?: string,
    reportCount: number = 1,
    callLimit: number = (reportCount + 1) * 30,
): Promise<string[]> {
    let attempts = 0;
    let totalCalls = 0;

    try {
        while (attempts < 5) {
            console.log('out of backtracks. going again.');

            let currentState: HistoryState = {
                badCycle: 0,
                chatSoFar: [],
                depth: 0,
                id: 0,
                lastResponse: {
                    gptResponse: '',
                    type: 'document',
                    query: '',
                    resultOffered: '',
                    resultId: '',
                },
                lastReport: null,
                matchesForThis: [],
            };

            let reportsGathered: string[] = [];
            let possibleAlternatePaths: HistoryState[] = [];

            async function evaluateState(state: HistoryState): Promise<HistoryState[]> {
                const {
                    lastReport,
                    chatSoFar,
                    matchesForThis,
                    lastResponse,
                    badCycle,
                    depth,
                } = state;
                const reportedState = {
                    ...state,
                    lastReport: await getCompletion(
                        title,
                        documents,
                        chatSoFar,
                        matchesForThis,
                        lastResponse,
                        () => {
                            totalCalls++;
                            if (totalCalls > callLimit) {
                                throw new Error(errorMessage);
                            }
                        },
                        currentState.depth === 0 && initialSearch ?
                            `Search the internet for "${initialSearch}"` :
                            undefined,
                    ),
                };

                reportsGathered.push(...reportedState.lastReport.reportsAscertained);

                const continuations: HistoryState[] = [];
                for (let continuation of reportedState.lastReport.continuation) {
                    const stateHere: HistoryState = Object.assign({}, reportedState);
                    stateHere.depth++;

                    stateHere.chatSoFar = [
                        ...stateHere.chatSoFar,
                        {
                            role: 'assistant',
                            content: continuation.gptResponse,
                        },
                        {
                            role: 'user',
                            name: 'Researcher',
                            content: continuation.resultOffered + (depth >= 12 ?
                                '\nAlso, you could consider beginning to write the report soon! Let me know when you\'re ready.' :
                                ''),
                        },
                    ];

                    if (continuation.isBad) {
                        stateHere.badCycle++;
                    } else {
                        stateHere.badCycle = 0;
                    }

                    if (!continuation.isEmpty) {
                        stateHere.matchesForThis = lastResponse.type !== 'internet' &&
                        lastResponse.query === continuation.query &&
                        lastResponse.locator === continuation.locator ?
                            [
                                ...matchesForThis,
                                continuation.resultId,
                            ] :
                            [continuation.resultId];
                        stateHere.lastResponse = continuation;
                    }

                    continuations.push(stateHere);
                }

                return continuations;
            }

            let failureState = false;
            let forceRecovery = false;
            while (reportsGathered.length < reportCount) {
                while (currentState.depth > 20 || currentState.badCycle > 3 || forceRecovery) {
                    if (possibleAlternatePaths.length) {
                        console.log('\n\n\nbacktracking!\n\n\n');
                        const restoredState = Math.floor(Math.random() * possibleAlternatePaths.length);
                        currentState = possibleAlternatePaths[restoredState];
                        possibleAlternatePaths.splice(restoredState, 1);
                    } else {
                        failureState = true;
                        break;
                    }

                    forceRecovery = false;
                }

                if (failureState) {
                    break;
                }

                console.log(`Running from depth ${currentState.depth}.`);
                const continuations = await evaluateState(currentState);

                if (continuations.length) {
                    possibleAlternatePaths.push(currentState, ...continuations.slice(1));
                    currentState = continuations[0];
                } else {
                    forceRecovery = true;
                }
            }

            if (failureState && !reportsGathered.length) {
                attempts++;
                continue;
            }

            return reportsGathered;
        }
    } catch (e) {
        if ((e as Error)?.message === errorMessage) {
            return [];
        } else {
            throw e;
        }
    }

    return [];
}

const app = express();
const port = 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true,
}));

app.post('/query', (req, res) => {
    const title = req.query.title as string;

    const docsString = req.body.docs as string | undefined;
    const documents = docsString ?
        docsString.split(',').map(e => JSON.parse(decodeURIComponent(e)) as Document) :
        [];

    console.log(documents);

    const initialTerm = req.query.term as string;
    const reportCount = parseInt(req.query.count as string);

    getReports(title, documents, initialTerm, reportCount)
        .then(e => {
            res.send(JSON.stringify({ res: e }));
        })
        .catch(e => {
            console.log(e);
            res.sendStatus(400);
        });
});

app.use(express.static('build'));

app.listen(port, async () => {
    console.log(`App listening on port ${port}`);

    const listener = () => {
    };
    process.on('uncaughtException', listener);
});
