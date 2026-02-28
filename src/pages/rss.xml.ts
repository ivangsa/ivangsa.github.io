import { getCollection } from 'astro:content';

const xmlEscape = (value: string) =>
	value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&apos;');

export async function GET({ site }: { site: URL }) {
	const articles = (await getCollection('articles')).sort(
		(a, b) => b.data.date.valueOf() - a.data.date.valueOf(),
	);

	const origin = site.origin;
	const items = articles
		.map((entry) => {
			const link = new URL(`/articles/${entry.id}/`, origin).toString();
			return `<item>
<title>${xmlEscape(entry.data.title)}</title>
<link>${link}</link>
<guid>${link}</guid>
<pubDate>${entry.data.date.toUTCString()}</pubDate>
<description>${xmlEscape(entry.data.summary)}</description>
</item>`;
		})
		.join('\n');

	const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
<title>Ivan Garcia Sainz-Aja - Articles</title>
<link>${origin}</link>
<description>Event-Driven Architecture, AsyncAPI, and Kafka articles.</description>
${items}
</channel>
</rss>`;

	return new Response(xml, {
		headers: {
			'Content-Type': 'application/rss+xml; charset=utf-8',
		},
	});
}
