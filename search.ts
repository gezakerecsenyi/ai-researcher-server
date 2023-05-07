import * as https from 'https';

const SUBSCRIPTION_KEY = '61850dc4a49d46e8ba9111d05c3cf502';

export interface BingResult {
    id: string;
    name: string;
    url: string;
    isFamilyFriendly: string;
    displayUrl: string;
    snippet: string;
    dateLastCrawled: string;
    language: string;
    isNavigational: boolean;
    contractualRules: Object;
}

export interface BingResponse {
    _type: string,
    queryContext: {
        originalQuery: string,
    },
    webPages: {
        webSearchUrl: string,
        totalEstimatedMatches: number,
        value: BingResult[];
    },
    rankingResponse: {
        mainline: Object,
    }
}

export function search(query: string): Promise<BingResponse> {
    return new Promise((resolve, reject) => {
        https.get({
            hostname: 'api.bing.microsoft.com',
            path: '/v7.0/search?mkt=en-GB&responseFilter=Webpages&answerCount=25&q=' + encodeURIComponent(query),
            headers: { 'Ocp-Apim-Subscription-Key': SUBSCRIPTION_KEY },
        }, res => {
            let body = '';
            res.on('data', part => body += part);

            res.on('end', () => {
                resolve(JSON.parse(body) as BingResponse);
            });

            res.on('error', e => {
                reject(e.message);
            });
        });
    });
}