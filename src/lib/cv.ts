import { readFileSync } from 'node:fs';
import publicCv from '../data/cv.json';
import { resolvePrivatePath } from './cv-private-path.mjs';

/**
 * The public CV lives in src/data/cv.json and is committed.
 * Confidential details (client names, phone, address, dates) live in
 * cv.private.json, kept outside this public repo, and are only merged
 * when CV_PRIVATE=1 (see scripts/cv-private.mjs).
 */

/** A plain bullet, or one whose opening phrase is set in bold so the list scans. */
export type Highlight = string | { lead: string; text: string };

export type Role = {
	role: string;
	company: string;
	client?: string;
	period?: string;
	summary: string;
	highlights?: Highlight[];
	highlightsCompact?: Highlight[];
};

export type Project = {
	name: string;
	url: string;
	/** A single paragraph, or several. */
	summary: string | string[];
	summaryCompact?: string | string[];
	hideInCompact?: boolean;
	compactOnly?: boolean;
};

export type EducationEntry = {
	title: string;
	institution: string;
	period?: string;
	hideInCompact?: boolean;
};

export type SkillGroup = {
	category: string;
	items: string[];
	itemsCompact?: string[];
};

export type Cv = typeof publicCv & {
	basics: typeof publicCv.basics & { phone?: string; email?: string; address?: string };
	current: Role[];
	experience: Role[];
	earlier: { summary: string; items: string[]; itemsCompact: string[] };
	openSource: Project[];
	skills: SkillGroup[];
	education: EducationEntry[];
};

type Overlay = {
	basics?: Record<string, string>;
	roles?: Record<string, { period?: string; client?: string; highlights?: string[] }>;
	earlierPeriods?: string[];
	education?: Record<string, { period?: string }>;
};

/**
 * `force` is for the dev-only /cv.private route, which always wants the
 * overlay regardless of CV_PRIVATE. Every other caller leaves it alone,
 * so a plain `astro build` never reads the overlay at all.
 */
function loadOverlay(force = false): Overlay | undefined {
	if (!force && process.env.CV_PRIVATE !== '1') return undefined;
	const privatePath = resolvePrivatePath();
	if (!privatePath) {
		console.warn('[cv] cv.private.json was not found. Rendering the public CV.');
		return undefined;
	}
	return JSON.parse(readFileSync(privatePath, 'utf-8')) as Overlay;
}

export function hasPrivateOverlay(force = false): boolean {
	return (force || process.env.CV_PRIVATE === '1') && resolvePrivatePath() !== undefined;
}

export const isPrivate = hasPrivateOverlay();

/** Earlier-experience lines are "Company: rest", in both the data and the overlay. */
const beforeColon = (line: string) => line.slice(0, line.indexOf(':')).trim();
const afterColon = (line: string) => line.slice(line.indexOf(':') + 1).trim();
const companyKey = (line: string) => beforeColon(line).toLowerCase();

export function getCv(force = false): Cv {
	const cv = structuredClone(publicCv) as Cv;
	const overlay = loadOverlay(force);
	if (!overlay) return cv;

	Object.assign(cv.basics, overlay.basics ?? {});

	for (const role of [...cv.current, ...cv.experience]) {
		const extra = overlay.roles?.[role.company];
		if (!extra) continue;
		if (extra.period) role.period = extra.period;
		if (extra.client) role.client = extra.client;
		if (extra.highlights) {
			role.highlights = [...(role.highlights ?? []), ...extra.highlights];
			if (role.highlightsCompact) {
				role.highlightsCompact = [...role.highlightsCompact, ...extra.highlights];
			}
		}
	}

	if (overlay.earlierPeriods?.length) {
		// The overlay carries only the dates. Merge them into the public lines
		// instead of replacing them, so the private CV keeps the descriptions,
		// and keep cv.json's order, which is the reverse-chronological one.
		const periods = new Map(
			overlay.earlierPeriods.map((line) => [companyKey(line), afterColon(line)]),
		);
		const withPeriod = (line: string) => {
			const period = periods.get(companyKey(line));
			if (!period) return line;
			return `${beforeColon(line)}, ${period}: ${afterColon(line)}`;
		};
		cv.earlier.items = cv.earlier.items.map(withPeriod);
		cv.earlier.itemsCompact = cv.earlier.itemsCompact.map(withPeriod);
	}

	for (const entry of cv.education) {
		const extra = overlay.education?.[entry.title];
		if (extra?.period) entry.period = extra.period;
	}

	return cv;
}
