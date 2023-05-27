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
const jsdom_1 = require("jsdom");
function getDomText(domString) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const virtualConsole = new jsdom_1.VirtualConsole();
            let startTime = new Date().getTime();
            let lastUpdate = startTime;
            const handler = () => {
                lastUpdate = new Date().getTime();
            };
            virtualConsole.on('error', handler);
            virtualConsole.on('warn', handler);
            virtualConsole.on('info', handler);
            virtualConsole.on('dir', handler);
            virtualConsole.on('jsdomError', handler);
            let dom = new jsdom_1.JSDOM(domString, {
                runScripts: 'dangerously',
                resources: 'usable',
                virtualConsole,
            });
            yield new Promise((r) => setTimeout(r, 5000));
            while ((new Date().getTime() - lastUpdate) < 100) {
                if (new Date().getTime() - startTime > 20000) {
                    break;
                }
                yield new Promise((r) => setTimeout(r, 100));
            }
            function naiveInnerText(node) {
                return [...node.childNodes].map(node => {
                    var _a;
                    const Node = node;
                    switch (node.nodeType) {
                        case Node.TEXT_NODE:
                            const { textContent } = node;
                            if (!textContent)
                                return '';
                            return ` ${(_a = node.textContent) === null || _a === void 0 ? void 0 : _a.trim()} `;
                        case Node.ELEMENT_NODE:
                            if (![
                                'script',
                                'style',
                                'head',
                                'link',
                            ].includes(node.nodeName.toLowerCase())) {
                                return naiveInnerText(node);
                            }
                            else {
                                return '';
                            }
                        default:
                            return '';
                    }
                }).join('\n');
            }
            const rawText = naiveInnerText(dom.window.document.getElementsByTagName('body')[0]);
            dom.window.close();
            dom = null;
            return rawText
                .replace(/ {2,}/g, '  ')
                .replace(/\t+/g, '\t')
                .replace(/([ \t]*\n)+/g, '\n');
        }
        catch (e) {
            console.log(e);
            return '';
        }
    });
}
exports.default = getDomText;
