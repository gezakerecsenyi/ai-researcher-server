import { JSDOM, VirtualConsole } from 'jsdom';

export default async function getDomText(domString: string): Promise<string> {
    try {
        const virtualConsole = new VirtualConsole();

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

        let dom: JSDOM | null = new JSDOM(domString, {
            runScripts: 'dangerously',
            resources: 'usable',
            virtualConsole,
        });

        await new Promise((r) => setTimeout(r, 5000));

        while ((new Date().getTime() - lastUpdate) < 100) {
            if (new Date().getTime() - startTime > 20000) {
                break;
            }

            await new Promise((r) => setTimeout(r, 100));
        }

        function naiveInnerText(node: Node): string {
            return [...node.childNodes].map(node => {
                const Node = node;
                switch (node.nodeType) {
                    case Node.TEXT_NODE:
                        const { textContent } = node;
                        if (!textContent) return '';

                        return ` ${node.textContent?.trim()} `;
                    case Node.ELEMENT_NODE:
                        if (![
                            'script',
                            'style',
                            'head',
                            'link',
                        ].includes(node.nodeName.toLowerCase())) {
                            return naiveInnerText(node);
                        } else {
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
    } catch (e) {
        console.log(e);
        return '';
    }
}