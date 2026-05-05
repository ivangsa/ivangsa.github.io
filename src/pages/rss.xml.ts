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

function absoluteUrl(path: string, origin: string) {
	if (/^(https?:)?\/\//.test(path)) return path;
	return new URL(path.startsWith('/') ? path : `/${path}`, origin).toString();
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
			const content = entry.data.externalOnly ? '' : (entry.rendered?.html ?? '');
			const imageUrl = entry.data.featuredImage ? absoluteUrl(entry.data.featuredImage, origin) : undefined;
			const imageAlt = entry.data.featuredImageAlt ?? '';
			const rssHeader = [
				`<h1>${xmlEscape(entry.data.title)}</h1>`,
				entry.data.showSummaryInArticleBody ? `<p>${xmlEscape(summary)}</p>` : '',
				imageUrl ? `<p><img src="${xmlEscape(imageUrl)}" alt="${xmlEscape(imageAlt)}" /></p>` : '',
			].join('');
			const htmlContent = `${rssHeader}${absolutizeHtmlUrls(content, origin)}<p><em>Originally published at <a href="${xmlEscape(originalLink)}">ivangsa.com</a>.</em></p>`;
			return `<item>
<title>${xmlEscape(entry.data.title)}</title>
<link>${link}</link>
<guid>${link}</guid>
<pubDate>${entry.data.date.toUTCString()}</pubDate>
${imageUrl ? `<media:content url="${xmlEscape(imageUrl)}" medium="image" />
<media:thumbnail url="${xmlEscape(imageUrl)}" />` : ''}
<description>${xmlEscape(`${summary} Originally published at ivangsa.com: ${originalLink}`)}</description>
<content:encoded><![CDATA[${cdataEscape(htmlContent)}]]></content:encoded>
</item>`;
		})
		.join('\n');

	const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:media="http://search.yahoo.com/mrss/">
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
