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
Object.defineProperty(exports, "__esModule", { value: true });
const search_1 = require("./search");
const utils_1 = require("./utils");
function processQuery(response, prevData, documents, ignoreIds = []) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const words = response.toLowerCase().replace(/[^a-z ]/g, '').split(' ');
            const initialWords = words.slice(0, 8);
            if ([
                'instead',
                'that website',
                'this website',
                'the website',
            ].some(e => response.toLowerCase().includes(e)) &&
                [
                    'search',
                    'look',
                    'test',
                    'match',
                ].some(e => response.toLowerCase().includes(e)) &&
                prevData.type === 'internet') {
                const query = (0, utils_1.expectCloseSpeechMark)(response);
                return (0, utils_1.lookupWordsInText)(prevData.searchDomain, query, {
                    locator: prevData.locator,
                    gptResponse: response,
                }, ignoreIds, true);
            }
            if ([
                'repeat',
                'again',
                'another',
                'different',
            ].some(e => initialWords.includes(e)) &&
                [
                    'result',
                    'response',
                    'search',
                    'hit',
                    'match',
                ].some(e => initialWords.includes(e))) {
                if (prevData.type === 'document') {
                    return (0, utils_1.lookupWordsInText)(prevData.searchDomain, prevData.query, {
                        locator: prevData.locator,
                        gptResponse: response,
                    }, ignoreIds);
                }
                else if (prevData.type === 'internet') {
                    return (0, utils_1.formatSearchResults)(prevData.otherResults, {
                        gptResponse: response,
                        query: prevData.query,
                    });
                }
                else {
                    return (0, utils_1.lookupWordsInText)(prevData.searchDomain, prevData.query, {
                        locator: prevData.locator,
                        gptResponse: response,
                    }, ignoreIds, true);
                }
            }
            const identifiers = response.match(/^([a-z',.!? ]\n)*[a-z',. ]{0,80}(now|please|instead)* ?(search|find|query|look) /i);
            if (!identifiers) {
                if (words.length < 20 && [
                    'write',
                    'ready',
                    'begin',
                    'writing',
                    'report',
                    'here is',
                    'okay',
                ].filter(e => response.includes(e)).length > 1) {
                    return {
                        gptResponse: response,
                        type: 'document',
                        query: '',
                        resultOffered: 'Sounds great! Please send your 1500-word report, mentioning any sources that you have used in its writing. Remember that it should be quite long and discursive - consider breaking it into multiple sections, and writing 2-3 paragraphs for each.',
                        resultId: '',
                        isEmpty: true,
                    };
                }
                return;
            }
            let remainingString = response.slice(identifiers[0].length).trim().replace(/^(on|in) /, '');
            let searchQuery = '';
            let internetSearchMatch;
            let websiteSearchMatch;
            let queryDocument = null;
            const invertedQueryMatch = remainingString.trim().match(/^(?: for)?(["'`])/g);
            if (invertedQueryMatch) {
                remainingString = remainingString.slice(invertedQueryMatch[0].length);
                searchQuery = (0, utils_1.expectCloseSpeechMark)(remainingString, invertedQueryMatch[1]);
                internetSearchMatch = remainingString.match(/^(on )?(Google|Bing|the internet)/i);
                websiteSearchMatch = remainingString.match(/^((on|(with)?in) )?(this|that) ((web)?site)/i);
                if (!internetSearchMatch && !websiteSearchMatch) {
                    remainingString = remainingString.trim().replace(/^(on|(with)?in) /, '');
                    const [success, document, newStr] = (0, utils_1.expectDocumentReference)(remainingString, documents);
                    if (!success)
                        return;
                    queryDocument = document;
                    remainingString = newStr;
                }
                else if (internetSearchMatch) {
                    remainingString = remainingString.slice(internetSearchMatch[0].length);
                }
                else if (websiteSearchMatch) {
                    remainingString = remainingString.slice(websiteSearchMatch[0].length);
                }
            }
            else {
                internetSearchMatch = remainingString
                    .match(/^(on )?(Google|Bing|the internet)/i);
                websiteSearchMatch = remainingString
                    .match(/^((on|(with)?in) )?(this|that|(the )?([A-Z][a-z]+ )+) ((web)?site)/);
                if (!internetSearchMatch && !websiteSearchMatch) {
                    const [success, document, newStr] = (0, utils_1.expectDocumentReference)(remainingString, documents);
                    if (!success)
                        return;
                    queryDocument = document;
                    remainingString = newStr;
                }
                else if (internetSearchMatch) {
                    remainingString = remainingString.slice(internetSearchMatch[0].length);
                }
                else if (websiteSearchMatch) {
                    remainingString = remainingString.slice(websiteSearchMatch[0].length);
                }
                const speechMarkSearch = remainingString
                    .match(/^ ?(?:again|once again|instead)?(?:for )?(?:(?:(?:more|further|another) )?(?:mentions? of|references? to|instances of|the (?:search )?term|the query) )?(["'`])/i);
                if (speechMarkSearch) {
                    remainingString = remainingString.slice(speechMarkSearch[0].length);
                    searchQuery = (0, utils_1.expectCloseSpeechMark)(remainingString, speechMarkSearch[1]);
                }
                else {
                    const prepositionSearch = remainingString
                        .match(/^ ?(?:again|once again)?(?:for )?(?:(?:(?:more|further|another) )?(?:mentions? of|references? to|instances of|the (?:search )?term|the query|(?:any )?information related to|(?:info|data|information|statistics) (?:on|about|relating to)) )?/i);
                    if (prepositionSearch) {
                        searchQuery = remainingString
                            .slice(prepositionSearch.length)
                            .trim()
                            .replace(/( (instead|please))?[.?!]$/g, '')
                            .trim();
                    }
                    else {
                        return;
                    }
                }
            }
            if (internetSearchMatch) {
                const allResults = (yield (0, search_1.search)(searchQuery)).webPages.value;
                return (0, utils_1.formatSearchResults)(allResults, {
                    gptResponse: response,
                    query: searchQuery,
                });
            }
            else if (websiteSearchMatch) {
                if (prevData.type === 'internet') {
                    console.log('asked to get results for', prevData);
                    const res = yield fetch(prevData.locator).then(t => t.text());
                    const text = new DOMParser().parseFromString(res, 'text/html').body.innerText;
                    return (0, utils_1.lookupWordsInText)(text, searchQuery, {
                        locator: prevData.locator,
                        gptResponse: response,
                    }, [], true);
                }
                else {
                    return undefined;
                }
            }
            else {
                return (0, utils_1.lookupWordsInText)(queryDocument.text, searchQuery, {
                    locator: queryDocument.title,
                    gptResponse: response,
                });
            }
        }
        catch (e) {
            console.log('got error', e);
        }
    });
}
exports.default = processQuery;
