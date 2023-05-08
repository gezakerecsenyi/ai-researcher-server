import { Document, ResponseRecallData } from './getCompletion';
import { BingResult } from './search';

export function expectCloseSpeechMark(string: string, quoteCharacter?: string) {
    let detectedQuoteCharacter = quoteCharacter;

    let result = '';
    let index = 0;
    let lastChunk = '';

    while (index < string.length) {
        if (detectedQuoteCharacter) {
            if (string[index] === detectedQuoteCharacter) {
                result += lastChunk;
                lastChunk = '';
            }

            lastChunk += string[index];
        } else {
            if ('\'`"'.includes(string[index])) {
                detectedQuoteCharacter = string[index];
            }
        }

        index++;
    }

    return result;
}

export function expectDocumentReference(string: string, documents: Document[]): [false] | [true, Document, string] {
    let remainingString = string;

    const documentLiteralSearchMatch = remainingString
        .match(/^Document (\d\d?)/i);
    const documentOrdinalSearchMatch = remainingString
        .match(/^the (\d\d?)(?:st|nd|rd|th) (?:[a-z]{0,10} )?(?:document|text)/i);
    const documentTextSearchMatch = remainingString
        .match(/^the (first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth) (?:[a-z]{0,10} )?(?:document|text)/i);

    let number;
    const numericMatch = (documentLiteralSearchMatch || documentOrdinalSearchMatch);
    if (numericMatch) {
        number = parseInt(numericMatch[1]) - 1;
        remainingString = remainingString.slice(numericMatch[0].length);
    } else if (documentTextSearchMatch) {
        number = [
            'first',
            'second',
            'third',
            'fourth',
            'fifth',
            'sixth',
            'seventh',
            'eighth',
            'ninth',
            'tenth',
        ].indexOf(documentTextSearchMatch[1]);
        remainingString = remainingString.slice(documentTextSearchMatch[0].length);
    } else {
        return [false];
    }

    const queryDocument = documents[number];

    if (!queryDocument) return [false];

    return [true, queryDocument, remainingString];
}

export function lookupWordsInText(text: string, rawSearchQuery: string, responseHeaders: Pick<ResponseRecallData, 'locator' | 'gptResponse'>, ignore: string[] = [], isFromWebsite: boolean = false): ResponseRecallData {
    const searchQuery = rawSearchQuery.trim();
    let res = text.indexOf(searchQuery);
    if (res > -1) {
        const rawResult = text.slice(Math.max(0, res - 150), res + 150);
        return {
            ...responseHeaders,
            resultOffered: `I found ${ignore.length ? 'another' : 'a'} mention${isFromWebsite ? ' on that website' : ''} - "... ${rawResult.trim()} ..."`,
            resultId: rawResult,
            type: 'document',
            query: searchQuery,
            searchDomain: text,
        };
    }

    if (!res) {
        const words = searchQuery.split(' ');

        for (let windowSize = words.length - 1; windowSize > 0; windowSize--) {
            for (let start = 0; start <= words.length - windowSize; start++) {
                const substr = words.slice(start, start + windowSize).join('');

                let res = text.indexOf(substr);
                if (res > -1) {
                    const rawResult = text.slice(Math.max(0, res - 150), res + 150);
                    if (ignore.includes(rawResult)) continue;

                    return {
                        ...responseHeaders,
                        resultOffered: `I couldn't find an exact-text match${isFromWebsite ? ' on that website' : ''}, but I found a match for just "${substr}" - "... ${rawResult.trim()} ...". If necessary, please try searching again with alternative phrasing.`,
                        resultId: rawResult,
                        type: 'document',
                        query: searchQuery,
                        searchDomain: text,
                    };
                }
            }
        }
    }

    return {
        ...responseHeaders,
        resultOffered: `I couldn't find ${ignore.length ? 'any more' : 'any'} exact-text mentions of "${searchQuery}"${isFromWebsite ? ' on that website' : ''}. Please try rephrasing to be more generic (one or two word searches are ideal, as this uses exact matching!), or request an alternative query.`,
        resultId: '',
        type: 'document',
        query: searchQuery,
        isEmpty: true,
    };
}

export function formatSearchResults(results: BingResult[], responseHeaders: Pick<ResponseRecallData, 'query' | 'gptResponse'>): ResponseRecallData {
    const rawRes = results[0];
    let result;

    let titleExtraction = rawRes.name.split('|');
    if (titleExtraction.length === 2) {
        result = `Result from ${titleExtraction[1].trim()} - "${rawRes.snippet}". `;
    } else {
        result = `Result entitled "${rawRes.name.trim()}" - "${rawRes.snippet}". `;
    }

    result += "Let me know if you would like more excerpts from this source, if you'd like to search for a keyword within this source, or if you would like to conduct a new search.";

    return {
        ...responseHeaders,
        resultOffered: result,
        resultId: rawRes.url,
        locator: rawRes.url,
        otherResults: results.slice(1),
        type: 'internet',
    };
}