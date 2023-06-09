"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatSearchResults = exports.lookupWordsInText = exports.expectDocumentReference = exports.expectCloseSpeechMark = void 0;
function expectCloseSpeechMark(string, quoteCharacter) {
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
        }
        else {
            if ('\'`"'.includes(string[index])) {
                detectedQuoteCharacter = string[index];
            }
        }
        index++;
    }
    return result;
}
exports.expectCloseSpeechMark = expectCloseSpeechMark;
function expectDocumentReference(string, documents) {
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
    }
    else if (documentTextSearchMatch) {
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
    }
    else {
        return [false];
    }
    const queryDocument = documents[number];
    if (!queryDocument)
        return [false];
    return [true, queryDocument, remainingString];
}
exports.expectDocumentReference = expectDocumentReference;
function lookupWordsInText(text, rawSearchQuery, responseHeaders, ignore = [], isFromWebsite = false) {
    const searchQuery = rawSearchQuery.trim();
    let res = text.indexOf(searchQuery);
    if (res > -1) {
        const rawResult = text.slice(Math.max(0, res - 150), res + 150);
        return Object.assign(Object.assign({}, responseHeaders), { resultOffered: `I found ${ignore.length ? 'another' : 'a'} mention${isFromWebsite ? ' on that website' : ''} - "... ${rawResult.trim()} ..."`, resultId: rawResult, type: 'document', query: searchQuery, searchDomain: text });
    }
    if (!res) {
        const words = searchQuery.split(' ');
        for (let windowSize = words.length - 1; windowSize > 0; windowSize--) {
            for (let start = 0; start <= words.length - windowSize; start++) {
                const substr = words.slice(start, start + windowSize).join('');
                let res = text.indexOf(substr);
                if (res > -1) {
                    const rawResult = text.slice(Math.max(0, res - 150), res + 150);
                    if (ignore.includes(rawResult))
                        continue;
                    return Object.assign(Object.assign({}, responseHeaders), { resultOffered: `I couldn't find an exact-text match${isFromWebsite ? ' on that website' : ''}, but I found a match for just "${substr}" - "... ${rawResult.trim()} ...". If necessary, please try searching again with alternative phrasing.`, resultId: rawResult, type: 'document', query: searchQuery, searchDomain: text });
                }
            }
        }
    }
    return Object.assign(Object.assign({}, responseHeaders), { resultOffered: `I couldn't find ${ignore.length ? 'any more' : 'any'} exact-text mentions of "${searchQuery}"${isFromWebsite ? ' on that website' : ''}. Please try rephrasing to be more generic (one or two word searches are ideal, as this uses exact matching!), or request an alternative query.`, resultId: '', type: 'document', query: searchQuery, isEmpty: true });
}
exports.lookupWordsInText = lookupWordsInText;
function formatSearchResults(results, responseHeaders) {
    const rawRes = results[0];
    let result;
    let titleExtraction = rawRes.name.split('|');
    if (titleExtraction.length === 2) {
        result = `Result from ${titleExtraction[1].trim()} - "${rawRes.snippet}". `;
    }
    else {
        result = `Result entitled "${rawRes.name.trim()}" - "${rawRes.snippet}". `;
    }
    result += "Let me know if you would like more excerpts from this source, if you'd like to search for a keyword within this source, or if you would like to conduct a new search.";
    return Object.assign(Object.assign({}, responseHeaders), { resultOffered: result, resultId: rawRes.url, locator: rawRes.url, otherResults: results.slice(1), type: 'internet' });
}
exports.formatSearchResults = formatSearchResults;
