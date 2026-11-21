import { existsSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { PeError, readJson, resolveInside, writeFileAtomic, writeJsonAtomic } from '../session/fs.js';
import type { Ws } from '../session/store.js';

/**
 * "attach": "tag" — for apps that do not work behind the stage listener. One marked script tag is
 * added to the app's development HTML entry, so that the app loads the stage agent itself, and
 * "detach" takes it out again. The tag is only ever written by these two commands.
 */

const TAG = /[ \t]*<script\b[^>]*\bdata-picky-eater\b[^>]*><\/script>(?:<!--[^>]*picky-eater[^>]*-->)?[ \t]*\r?\n?/g;

const tagFor = (port: number) =>
  `<script src="http://127.0.0.1:${port}/__pe/agent.js" data-picky-eater></script><!-- added by "picky-eater attach" for the review; "picky-eater detach" removes it -->`;

const record = (ws: Ws) => join(ws.dir, 'attached.json');

/** Files that carry the tag, relative to the project. */
export function attachedFiles(ws: Ws): string[] {
  if (!existsSync(record(ws))) return [];
  try {
    const files = (readJson(record(ws)) as { files?: unknown }).files;
    return Array.isArray(files) ? files.filter((f): f is string => typeof f === 'string') : [];
  } catch {
    return [];
  }
}

function withTag(html: string, port: number): string {
  const clean = html.replace(TAG, '');
  const head = /<head(?:\s[^>]*)?>/i.exec(clean) ?? /<html(?:\s[^>]*)?>/i.exec(clean);
  if (!head) throw new PeError('That file has no <head> or <html> element. Name the HTML file your development server serves, e.g. index.html.', 'BAD_FILE');
  const at = head.index + head[0].length;
  return `${clean.slice(0, at)}\n    ${tagFor(port)}${clean.slice(at)}`;
}

export function attach(ws: Ws, file: string, port: number): void {
  const abs = resolveInside(ws.root, file);
  if (!existsSync(abs)) throw new PeError(`"${file}" does not exist in this project.`, 'BAD_FILE');
  writeFileAtomic(abs, withTag(readFileSync(abs, 'utf8'), port));
  writeJsonAtomic(record(ws), { files: [...new Set([...attachedFiles(ws), file])] });
}

/** Remove the tag from every file it was added to. Returns those files. */
export function detach(ws: Ws): string[] {
  const files = attachedFiles(ws);
  for (const file of files) {
    try {
      const abs = resolveInside(ws.root, file);
      if (existsSync(abs)) writeFileAtomic(abs, readFileSync(abs, 'utf8').replace(TAG, ''));
    } catch {
      /* the file moved; there is nothing left to clean */
    }
  }
  rmSync(record(ws), { force: true });
  return files;
}

/** The stage listener may have had to take another port: keep the tags pointing at it. */
export function syncAttached(ws: Ws, port: number): void {
  for (const file of attachedFiles(ws)) {
    try {
      const abs = resolveInside(ws.root, file);
      if (!existsSync(abs)) continue;
      const html = readFileSync(abs, 'utf8');
      const next = withTag(html, port);
      if (next !== html) writeFileAtomic(abs, next);
    } catch {
      /* reported by "status" as a tag that is not in place */
    }
  }
}
