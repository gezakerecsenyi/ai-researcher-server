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
const index_1 = require("./index");
function requestGPT(data, callTracker) {
    return __awaiter(this, void 0, void 0, function* () {
        if (callTracker) {
            callTracker();
        }
        yield new Promise((resolve) => {
            setTimeout(resolve, 1000);
        });
        console.log('making new chatgpt req');
        return yield index_1.openai.createChatCompletion(Object.assign({ model: 'gpt-4', temperature: 0.6, n: 1, presence_penalty: 0.5, frequency_penalty: 0.3, max_tokens: 3000 }, data));
    });
}
exports.default = requestGPT;
