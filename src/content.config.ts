import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

export const collections = {
	articles: defineCollection({
		loader: glob({ base: './src/content/articles', pattern: '**/*.md' }),
		schema: z.object({
			title: z.string(),
			date: z.coerce.date(),
			summary: z.string(),
			tags: z.array(z.string()),
			featured: z.boolean(),
			draft: z.boolean().or(z.undefined()).default(false),
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






