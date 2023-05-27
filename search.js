"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.search = void 0;
const https = __importStar(require("https"));
const SUBSCRIPTION_KEY = '61850dc4a49d46e8ba9111d05c3cf502';
function search(query) {
    return new Promise((resolve, reject) => {
        https.get({
            hostname: 'api.bing.microsoft.com',
            path: '/v7.0/search?mkt=en-GB&responseFilter=Webpages&answerCount=25&q=' + encodeURIComponent(query),
            headers: { 'Ocp-Apim-Subscription-Key': SUBSCRIPTION_KEY },
        }, res => {
            let body = '';
            res.on('data', part => body += part);
            res.on('end', () => {
                resolve(JSON.parse(body));
            });
            res.on('error', e => {
                reject(e.message);
            });
        });
    });
}
exports.search = search;
