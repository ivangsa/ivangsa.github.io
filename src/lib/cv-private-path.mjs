import { existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { isAbsolute, join, resolve } from 'node:path';

/**
 * Locates the private CV overlay. It is never inside this repo by default:
 * this repo is public, so the confidential data lives in the private
 * PersonalDocuments repo checked out next to it.
 *
 * Resolution order:
 *   1. $CV_PRIVATE_PATH  (a file, or a directory containing cv.private.json)
 *   2. ../PersonalDocuments/docs/cv/cv.private.json
 *   3. ./cv.private.json  (repo root, gitignored fallback)
 */

const FILENAME = 'cv.private.json';
const repoRoot = fileURLToPath(new URL('../../', import.meta.url));

/** @returns {string[]} every path that would be tried, in order. */
export function privatePathCandidates() {
	const candidates = [];

	const fromEnv = process.env.CV_PRIVATE_PATH;
	if (fromEnv) {
		const target = isAbsolute(fromEnv) ? fromEnv : resolve(repoRoot, fromEnv);
		const isDirectory = existsSync(target) && statSync(target).isDirectory();
		candidates.push(isDirectory ? join(target, FILENAME) : target);
	}

	candidates.push(resolve(repoRoot, '..', 'PersonalDocuments', 'docs', 'cv', FILENAME));
	candidates.push(join(repoRoot, FILENAME));

	return candidates;
}

/** @returns {string | undefined} the first candidate that exists. */
export function resolvePrivatePath() {
	return privatePathCandidates().find((candidate) => existsSync(candidate));
}
