// @ts-check
import { readFileSync } from 'node:fs';
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

const zdlGrammar = JSON.parse(
	readFileSync(new URL('./src/syntaxes/zdl.tmLanguage.json', import.meta.url), 'utf-8'),
);

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
			],
			langAlias: {
				zw: 'zdl',
			},
		},
	},
});
