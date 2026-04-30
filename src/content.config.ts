import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { basename, dirname, extname } from 'node:path/posix';

const dateFreeUrlStart = Date.UTC(2026, 3, 26);

function dateValue(date: unknown) {
	if (date instanceof Date) return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
	if (typeof date === 'string') {
		const [year, month, day] = date.split('-').map(Number);
		if (year && month && day) return Date.UTC(year, month - 1, day);
	}
	return undefined;
}

function filenameId(entry: string, data: { date?: unknown }) {
	const normalizedEntry = entry.replace(/\\/g, '/');
	const filename = basename(normalizedEntry, extname(normalizedEntry));
	const directory = dirname(normalizedEntry);
	const directorySlug = directory
		.split('/')
		.filter((part) => part !== '.' && !/^\d+$/.test(part))
		.join('/');
	const shouldUseDateFreeUrl = (dateValue(data.date) ?? 0) >= dateFreeUrlStart;
	const slug = shouldUseDateFreeUrl ? filename.replace(/^\d{4}-\d{2}-\d{2}-/, '') : filename;

	return directorySlug ? `${directorySlug}/${slug}` : slug;
}

export const collections = {
	articles: defineCollection({
		loader: glob({
			base: './src/content/articles',
			pattern: '**/*.md',
			generateId: ({ entry, data }) => filenameId(entry, data),
		}),
		schema: z.object({
			title: z.string(),
			date: z.coerce.date(),
			summary: z.string(),
			tags: z.array(z.string()),
			featured: z.boolean(),
			draft: z.boolean().or(z.undefined()).default(false),
			showSummaryInArticleBody: z.boolean().or(z.undefined()).default(true),
			readingTime: z.string().optional(),
			featuredImage: z.string().optional(),
			featuredImageAlt: z.string().optional(),
			canonical: z.string().url().optional(),
			externalUrl: z.string().url().optional(),
			externalSite: z.string().optional(),
			externalOnly: z.boolean().or(z.undefined()).default(false),
			lang: z.enum(['en', 'es']).or(z.undefined()).default('en'),
		}),
	}),
	tutorials: defineCollection({
		loader: glob({ base: './src/content/tutorials', pattern: '**/*.md' }),
		schema: z.object({
			title: z.string(),
			date: z.coerce.date(),
			summary: z.string(),
			tags: z.array(z.string()),
			featured: z.boolean(),
			readingTime: z.string().optional(),
			featuredImage: z.string().optional(),
			featuredImageAlt: z.string().optional(),
			canonical: z.string().url().optional(),
			lang: z.enum(['en', 'es']).or(z.undefined()).default('en'),
		}),
	}),
	talks: defineCollection({
		loader: glob({ base: './src/content/talks', pattern: '**/*.md' }),
		schema: z.object({
			title: z.string(),
			date: z.coerce.date(),
			summary: z.string(),
			tags: z.array(z.string()),
			featured: z.boolean(),
			duration: z.string().optional(),
			slides: z.string().url().optional(),
			video: z.string().url().optional(),
			event: z.string().url().optional(),
		}),
	}),
	projects: defineCollection({
		loader: glob({ base: './src/content/projects', pattern: '**/*.md' }),
		schema: z.object({
			title: z.string(),
			date: z.coerce.date(),
			summary: z.string(),
			tags: z.array(z.string()),
			featured: z.boolean(),
		}),
	}),
};






