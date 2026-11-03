import { getCollection } from 'astro:content';

const xmlEscape = (value: string) =>
	value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&apos;');

const cdataEscape = (value: string) => value.replaceAll(']]>', ']]]]><![CDATA[>');

// Older talks stay out of the feed so an RSS sync does not republish the back catalog.
const talksRssFrom = Date.UTC(2026, 9, 1);

function absolutizeHtmlUrls(html: string, origin: string) {
	return html.replace(/\b(href|src)="\/([^"]*)"/g, (_match, attribute: string, path: string) => {
		return `${attribute}="${new URL(`/${path}`, origin).toString()}"`;
	});
}

function absoluteUrl(path: string, origin: string) {
	if (/^(https?:)?\/\//.test(path)) return path;
	return new URL(path.startsWith('/') ? path : `/${path}`, origin).toString();
}

type FeedEntry = {
	title: string;
	date: Date;
	path: string;
	originalLink?: string;
	summary: string;
	html: string;
	showSummary: boolean;
	imageUrl?: string;
	imageAlt: string;
};

function renderItem(entry: FeedEntry, origin: string) {
	const link = new URL(entry.path, origin).toString();
	const originalLink = entry.originalLink ?? link;
	const imageUrl = entry.imageUrl ? absoluteUrl(entry.imageUrl, origin) : undefined;
	const rssHeader = [
		`<h1>${xmlEscape(entry.title)}</h1>`,
		entry.showSummary ? `<p>${xmlEscape(entry.summary)}</p>` : '',
		imageUrl ? `<p><img src="${xmlEscape(imageUrl)}" alt="${xmlEscape(entry.imageAlt)}" /></p>` : '',
	].join('');
	const htmlContent = `${rssHeader}${absolutizeHtmlUrls(entry.html, origin)}<p><em>Originally published at <a href="${xmlEscape(originalLink)}">ivangsa.com</a>.</em></p>`;
	return `<item>
<title>${xmlEscape(entry.title)}</title>
<link>${link}</link>
<guid>${link}</guid>
<pubDate>${entry.date.toUTCString()}</pubDate>
${imageUrl ? `<media:content url="${xmlEscape(imageUrl)}" medium="image" />
<media:thumbnail url="${xmlEscape(imageUrl)}" />` : ''}
<description>${xmlEscape(`${entry.summary} Originally published at ivangsa.com: ${originalLink}`)}</description>
<content:encoded><![CDATA[${cdataEscape(htmlContent)}]]></content:encoded>
</item>`;
}

export async function GET({ site }: { site: URL }) {
	const origin = site.origin;
	const articles = (await getCollection('articles')).filter((article) => !article.data.draft);
	const talks = (await getCollection('talks')).filter((talk) => talk.data.date.getTime() >= talksRssFrom);

	const items = [
		...articles.map((entry) => ({
			date: entry.data.date.getTime(),
			xml: renderItem(
				{
					title: entry.data.title,
					date: entry.data.date,
					path: `/articles/${entry.id}/`,
					originalLink: entry.data.canonical ?? entry.data.externalUrl,
					summary: entry.data.summary,
					html: entry.data.externalOnly ? '' : (entry.rendered?.html ?? ''),
					showSummary: entry.data.showSummaryInArticleBody,
					imageUrl: entry.data.featuredImage,
					imageAlt: entry.data.featuredImageAlt ?? '',
				},
				origin,
			),
		})),
		...talks.map((entry) => ({
			date: entry.data.date.getTime(),
			xml: renderItem(
				{
					title: entry.data.title,
					date: entry.data.date,
					path: `/talks/${entry.id}/`,
					summary: entry.data.summary,
					html: entry.rendered?.html ?? '',
					showSummary: true,
					imageAlt: '',
				},
				origin,
			),
		})),
	]
		.sort((a, b) => b.date - a.date)
		.map((entry) => entry.xml)
		.join('\n');

	const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:media="http://search.yahoo.com/mrss/">
<channel>
<title>Ivan Garcia Sainz-Aja - Articles and talks</title>
<link>${origin}</link>
<description>Event-Driven Architecture, AsyncAPI, and Kafka articles and talks.</description>
${items}
</channel>
</rss>`;

	return new Response(xml, {
		headers: {
			'Content-Type': 'application/rss+xml; charset=utf-8',
		},
	});
}
