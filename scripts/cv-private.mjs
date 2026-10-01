#!/usr/bin/env node
/**
 * Runs Astro with CV_PRIVATE=1 so /cv includes the confidential overlay:
 * real client names, contact details and dates.
 *
 *   npm run cv:dev     -> dev server, open http://localhost:4321/cv and print to PDF
 *   npm run cv:build   -> static build into dist-private/ (gitignored)
 *
 * The overlay lives outside this repo, because this repo is public.
 * See src/lib/cv-private-path.mjs for where it is looked up.
 *
 * The plain `npm run build` never sets CV_PRIVATE, so the deployed site
 * cannot contain private data.
 */
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { privatePathCandidates, resolvePrivatePath } from '../src/lib/cv-private-path.mjs';

const root = new URL('../', import.meta.url);
const astroBin = fileURLToPath(new URL('node_modules/astro/astro.js', root));

const overlay = resolvePrivatePath();
if (!overlay) {
	console.error('Could not find cv.private.json. Looked in:');
	for (const candidate of privatePathCandidates()) console.error(`  ${candidate}`);
	console.error('\nCopy cv.private.example.json to one of those locations and fill in the real values,');
	console.error('or point CV_PRIVATE_PATH at the file or the directory that holds it.');
	process.exit(1);
}
console.log(`[cv] using private overlay: ${overlay}`);

const [command = 'dev', ...rest] = process.argv.slice(2);
const args = command === 'build' ? ['build', '--outDir', 'dist-private', ...rest] : [command, ...rest];

const child = spawn(process.execPath, [astroBin, ...args], {
	stdio: 'inherit',
	cwd: fileURLToPath(root),
	env: { ...process.env, CV_PRIVATE: '1' },
});

child.on('exit', (code) => process.exit(code ?? 0));
