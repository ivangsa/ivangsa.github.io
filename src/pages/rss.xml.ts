import { getCollection } from 'astro:content';

const xmlEscape = (value: string) =>
	value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&apos;');

const cdataEscape = (value: string) => value.replaceAll(']]>', ']]]]><![CDATA[>');

function absolutizeHtmlUrls(html: string, origin: string) {
	return html.replace(/\b(href|src)="\/([^"]*)"/g, (_match, attribute: string, path: string) => {
		return `${attribute}="${new URL(`/${path}`, origin).toString()}"`;
	});
}

export async function GET({ site }: { site: URL }) {
	const articles = (await getCollection('articles'))
		.filter((article) => !article.data.draft)
		.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());

	const origin = site.origin;
	const items = articles
		.map((entry) => {
			const link = new URL(`/articles/${entry.id}/`, origin).toString();
			const originalLink = entry.data.canonical ?? entry.data.externalUrl ?? link;
			const summary = entry.data.summary;
			const content = entry.data.externalOnly
				? `<p>${xmlEscape(summary)}</p>`
				: (entry.rendered?.html ?? `<p>${xmlEscape(summary)}</p>`);
			const htmlContent = `${absolutizeHtmlUrls(content, origin)}<p><em>Originally published at <a href="${xmlEscape(originalLink)}">ivangsa.com</a>.</em></p>`;
			return `<item>
<title>${xmlEscape(entry.data.title)}</title>
<link>${link}</link>
<guid>${link}</guid>
<pubDate>${entry.data.date.toUTCString()}</pubDate>
<description>${xmlEscape(`${summary} Originally published at ivangsa.com: ${originalLink}`)}</description>
<content:encoded><![CDATA[${cdataEscape(htmlContent)}]]></content:encoded>
</item>`;
		})
		.join('\n');

	const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/">
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
