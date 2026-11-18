// @ts-check
import { readFileSync } from 'node:fs';
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

const zdlGrammar = JSON.parse(
	readFileSync(new URL('./src/syntaxes/zdl.tmLanguage.json', import.meta.url), 'utf-8'),
);
const zflGrammar = JSON.parse(
	readFileSync(new URL('./src/syntaxes/zfl.tmLanguage.json', import.meta.url), 'utf-8'),
);

/**
 * Build-time code block meta, no runtime cost:
 *   ```zfl {3,5-6} title="Step label"
 * {…} highlights lines (others are dimmed), title sets data-title on <pre>
 * (used as the step label inside <div class="code-steps">).
 */
function codeMetaTransformer() {
	return {
		name: 'code-meta',
		preprocess() {
			const raw = this.options.meta?.__raw ?? '';
			const range = raw.match(/\{([\d,\s-]+)\}/)?.[1];
			this.highlightLines = new Set(
				(range ?? '').split(',').flatMap((part) => {
					const [a, b] = part.trim().split('-').map(Number);
					if (!a) return [];
					return Array.from({ length: (b || a) - a + 1 }, (_, i) => a + i);
				}),
			);
			this.codeTitle = raw.match(/title="([^"]*)"/)?.[1];
		},
		pre(node) {
			if (this.highlightLines.size) this.addClassToHast(node, 'has-highlighted');
			if (this.codeTitle) node.properties['data-title'] = this.codeTitle;
		},
		line(node, line) {
			if (this.highlightLines.has(line)) this.addClassToHast(node, 'highlighted');
		},
	};
}

// https://astro.build/config
export default defineConfig({
	site: 'https://ivangsa.com',
	output: 'static',
	integrations: [sitemap()],
	markdown: {
		shikiConfig: {
			langs: [
				{
					id: 'zdl',
					scopeName: 'source.zdl',
					aliases: ['zdl', 'zw'],
					grammar: zdlGrammar,
				},
				{
					id: 'zfl',
					scopeName: 'source.zfl',
					aliases: ['zfl'],
					grammar: zflGrammar,
				},
			],
			langAlias: {
				zw: 'zdl',
			},
			transformers: [codeMetaTransformer()],
		},
	},
});
