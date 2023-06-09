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
exports.openai = void 0;
const body_parser_1 = __importDefault(require("body-parser"));
const cors_1 = __importDefault(require("cors"));
const express_1 = __importDefault(require("express"));
const openai_1 = require("openai");
const getCompletion_1 = __importDefault(require("./getCompletion"));
const configuration = new openai_1.Configuration({
    apiKey: '',
    organization: 'org-xRYHdeBLidnPhskNJHZ9WaTR',
});
exports.openai = new openai_1.OpenAIApi(configuration);
const errorMessage = '__too_many_calls__';
function getReports(title, documents, initialSearch, reportCount = 1, callLimit = (reportCount + 1) * 30) {
    return __awaiter(this, void 0, void 0, function* () {
        let attempts = 0;
        let totalCalls = 0;
        try {
            while (attempts < 5) {
                console.log('out of backtracks. going again.');
                let currentState = {
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
                let reportsGathered = [];
                let possibleAlternatePaths = [];
                function evaluateState(state) {
                    return __awaiter(this, void 0, void 0, function* () {
                        const { lastReport, chatSoFar, matchesForThis, lastResponse, badCycle, depth, } = state;
                        const reportedState = Object.assign(Object.assign({}, state), { lastReport: yield (0, getCompletion_1.default)(title, documents, chatSoFar, matchesForThis, lastResponse, () => {
                                totalCalls++;
                                if (totalCalls > callLimit) {
                                    throw new Error(errorMessage);
                                }
                            }, currentState.depth === 0 && initialSearch ?
                                `Search the internet for "${initialSearch}"` :
                                undefined) });
                        reportsGathered.push(...reportedState.lastReport.reportsAscertained);
                        const continuations = [];
                        for (let continuation of reportedState.lastReport.continuation) {
                            const stateHere = Object.assign({}, reportedState);
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
                            }
                            else {
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
                    });
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
                        }
                        else {
                            failureState = true;
                            break;
                        }
                        forceRecovery = false;
                    }
                    if (failureState) {
                        break;
                    }
                    console.log(`Running from depth ${currentState.depth}.`);
                    const continuations = yield evaluateState(currentState);
                    if (continuations.length) {
                        possibleAlternatePaths.push(currentState, ...continuations.slice(1));
                        currentState = continuations[0];
                    }
                    else {
                        forceRecovery = true;
                    }
                }
                if (failureState && !reportsGathered.length) {
                    attempts++;
                    continue;
                }
                return reportsGathered;
            }
        }
        catch (e) {
            if ((e === null || e === void 0 ? void 0 : e.message) === errorMessage) {
                return [];
            }
            else {
                throw e;
            }
        }
        return [];
    });
}
const app = (0, express_1.default)();
const port = 3000;
app.use((0, cors_1.default)());
app.use(body_parser_1.default.json());
app.use(body_parser_1.default.urlencoded({
    extended: true,
}));
app.post('/query', (req, res) => {
    const title = req.query.title;
    const docsString = req.body.docs;
    const documents = docsString ?
        docsString.split(',').map(e => JSON.parse(decodeURIComponent(e))) :
        [];
    console.log(documents);
    const initialTerm = req.query.term;
    const reportCount = parseInt(req.query.count);
    getReports(title, documents, initialTerm, reportCount)
        .then(e => {
        res.send(JSON.stringify({ res: e }));
    })
        .catch(e => {
        console.log(e);
        res.sendStatus(400);
    });
});
app.use(express_1.default.static('build'));
app.listen(port, () => __awaiter(void 0, void 0, void 0, function* () {
    console.log(`App listening on port ${port}`);
    const listener = () => {
    };
    process.on('uncaughtException', listener);
}));
