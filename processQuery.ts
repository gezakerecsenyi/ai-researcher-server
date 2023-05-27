import { Document, ResponseRecallData } from './getCompletion';
import getDomText from './getDomText';
import { search } from './search';
import { expectCloseSpeechMark, expectDocumentReference, formatSearchResults, lookupWordsInText } from './utils';

import { JSDOM } from 'jsdom';

export default async function processQuery(response: string, prevData: ResponseRecallData, documents: Document[], ignoreIds: string[] = []): Promise<ResponseRecallData | undefined> {
    try {
        const words = response.toLowerCase().replace(/[^a-z ]/g, '').split(' ');
        const initialWords = words.slice(0, 8);
        if (
            [
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
            prevData.type === 'website'
        ) {
            const query = expectCloseSpeechMark(response);

            return lookupWordsInText(
                prevData.searchDomain!,
                query,
                {
                    locator: prevData.locator,
                    gptResponse: response,
                },
                ignoreIds,
                true,
            );
        }

        if (
            [
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
            ].some(e => initialWords.includes(e))
        ) {
            if (prevData.type === 'document') {
                return lookupWordsInText(
                    prevData.searchDomain!,
                    prevData.query,
                    {
                        locator: prevData.locator,
                        gptResponse: response,
                    },
                    ignoreIds,
                );
            } else if (prevData.type === 'internet') {
                return formatSearchResults(
                    prevData.otherResults!,
                    {
                        gptResponse: response,
                        query: prevData.query,
                    },
                );
            } else {
                return lookupWordsInText(
                    prevData.searchDomain!,
                    prevData.query,
                    {
                        locator: prevData.locator,
                        gptResponse: response,
                    },
                    ignoreIds,
                    true,
                );
            }
        }

        const identifiers = response.match(
            /^([a-z',.!? ]\n)*[a-z',. ]{0,80}(now|please|instead)* ?(search|find|query|look) /i);

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
        let internetSearchMatch: RegExpMatchArray | null;
        let websiteSearchMatch: RegExpMatchArray | null;
        let queryDocument: Document | null = null;

        const invertedQueryMatch = remainingString.trim().match(/^(?: for)?(["'`])/g);
        if (invertedQueryMatch) {
            remainingString = remainingString.slice(invertedQueryMatch[0].length);
            searchQuery = expectCloseSpeechMark(remainingString, invertedQueryMatch[1]);

            internetSearchMatch = remainingString.match(/^(on )?(Google|Bing|the internet)/i);
            websiteSearchMatch = remainingString.match(/^((on|(with)?in) )?(this|that) ((web)?site)/i);
            if (!internetSearchMatch && !websiteSearchMatch) {
                remainingString = remainingString.trim().replace(/^(on|(with)?in) /, '');

                const [success, document, newStr] = expectDocumentReference(
                    remainingString,
                    documents,
                );

                if (!success) return;

                queryDocument = document;
                remainingString = newStr;
            } else if (internetSearchMatch) {
                remainingString = remainingString.slice(internetSearchMatch[0].length);
            } else if (websiteSearchMatch) {
                remainingString = remainingString.slice(websiteSearchMatch[0].length);
            }
        } else {
            internetSearchMatch = remainingString
                .match(/^(on )?(Google|Bing|the internet)/i);
            websiteSearchMatch = remainingString
                .match(/^((on|(with)?in) )?(this|that|(the )?([A-Z][a-z]+ )+) ((web)?site)/);

            if (!internetSearchMatch && !websiteSearchMatch) {
                const [success, document, newStr] = expectDocumentReference(
                    remainingString,
                    documents,
                );
                if (!success) return;

                queryDocument = document;
                remainingString = newStr;
            } else if (internetSearchMatch) {
                remainingString = remainingString.slice(internetSearchMatch[0].length);
            } else if (websiteSearchMatch) {
                remainingString = remainingString.slice(websiteSearchMatch[0].length);
            }

            const speechMarkSearch = remainingString
                .match(
                    /^ ?(?:again|once again|instead)?(?:for )?(?:(?:(?:more|further|another) )?(?:mentions? of|references? to|instances of|the (?:search )?term|the query) )?(["'`])/i);
            if (speechMarkSearch) {
                remainingString = remainingString.slice(speechMarkSearch[0].length);
                searchQuery = expectCloseSpeechMark(remainingString, speechMarkSearch[1]);
            } else {
                const prepositionSearch = remainingString
                    .match(
                        /^ ?(?:again|once again)?(?:for )?(?:(?:(?:more|further|another) )?(?:mentions? of|references? to|instances of|the (?:search )?term|the query|(?:any )?information related to|(?:info|data|information|statistics) (?:on|about|relating to)) )?/i);
                if (prepositionSearch) {
                    searchQuery = remainingString
                        .slice(prepositionSearch.length)
                        .trim()
                        .replace(/( (instead|please))?[.?!]$/g, '')
                        .trim();
                } else {
                    return;
                }
            }
        }

        if (internetSearchMatch) {
            const allResults = (await search(searchQuery)).webPages.value;
            return formatSearchResults(
                allResults,
                {
                    gptResponse: response,
                    query: searchQuery,
                },
            );
        } else if (websiteSearchMatch) {
            if (prevData.type === 'internet') {
                console.log('asked to get results for', prevData);
                const res = await fetch(prevData.locator!).then(t => t.text());
                const text = await getDomText(res);

                console.log('Got inner text as', text);

                return lookupWordsInText(
                    text,
                    searchQuery,
                    {
                        locator: prevData.locator,
                        gptResponse: response,
                    },
                    [],
                    true,
                );
            } else {
                return undefined;
            }
        } else {
            return lookupWordsInText(
                queryDocument!.text,
                searchQuery,
                {
                    locator: queryDocument!.title,
                    gptResponse: response,
                },
            );
        }
    } catch (e) {
        console.log('got error', e);
    }
}