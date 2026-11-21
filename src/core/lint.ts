/**
 * Static checks of mockup HTML and CSS, without a DOM. This is the first of three layers that keep
 * mockups inert: these checks at "validate", the sanitizer when the page is composed in the
 * browser, and the script-less sandbox the result is rendered in.
 */

export interface LintIssue {
  code: string;
  message: string;
}

export interface Scan {
  issues: LintIssue[];
  /** data-pe-area values, in document order. */
  slots: string[];
  /** Cut ids named by data-pe-in, data-pe-not, data-pe-go and data-pe-go-invalid. */
  cutRefs: string[];
  /** Relative files named by src attributes and CSS url(). */
  assets: string[];
}

export const ASSET_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'svg'];

const FORBIDDEN = new Set(['script', 'iframe', 'frame', 'frameset', 'object', 'embed', 'applet', 'base', 'link', 'noscript', 'portal']);
const URL_ATTRS = new Set(['src', 'srcset', 'poster', 'data', 'background', 'href', 'xlink:href', 'action', 'formaction', 'ping', 'cite', 'manifest']);
const DATA_IMAGE = /^data:image\/(png|jpeg|gif|webp|avif);base64,[a-z0-9+/=\s]+$/i;

const TAG = /<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>|<![^>]*>|<\/\s*([a-zA-Z][^\s/>]*)[^>]*>|<([a-zA-Z][^\s/>]*)((?:"[^"]*"|'[^']*'|[^'">])*)>/g;
const ATTR = /([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;

const NAMED: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", colon: ':', tab: '\t', newline: '\n', sol: '/', lpar: '(', rpar: ')' };

/** Decode character references the way a browser would before it looks at a URL or a style. */
export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);?/gi, (all, ref: string) => {
    if (ref[0] === '#') {
      const code = ref[1]?.toLowerCase() === 'x' ? parseInt(ref.slice(2), 16) : parseInt(ref.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : '';
    }
    return NAMED[ref.toLowerCase()] ?? all;
  });
}

/** A URL with the characters browsers ignore removed, lowercased, for scheme checks. */
function normalizeUrl(value: string): string {
  // eslint-disable-next-line no-control-regex
  return decodeEntities(value).replace(/[\u0000- \u007f-\u009f​-‍﻿]/g, '').toLowerCase();
}

/** A path on the same site: no scheme, no host. */
function isSameSite(url: string): boolean {
  return !/^[a-z][a-z0-9+.-]*:/i.test(url) && !url.startsWith('//') && !url.includes('\\');
}

function isRelativeFile(url: string): boolean {
  return !/^[a-z][a-z0-9+.-]*:/i.test(url) && !url.startsWith('//') && !url.startsWith('/') && !url.startsWith('#') && url.length > 0;
}

export function lintCss(css: string, where = 'stylesheet', opts: { live?: boolean } = {}): { issues: LintIssue[]; assets: string[] } {
  const issues: LintIssue[] = [];
  const assets: string[] = [];
  // CSS escapes (\75 rl) can spell forbidden words; resolve them before looking.
  const text = css.replace(/\\([0-9a-f]{1,6})\s?/gi, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16) || 0xfffd)).replace(/\\(.)/g, '$1');
  const flat = text.replace(/\/\*[\s\S]*?\*\//g, '');
  if (/@import/i.test(flat)) issues.push({ code: 'CSS_IMPORT', message: `${where}: @import is not allowed.${opts.live ? '' : ' List stylesheets in "base.styles" instead.'}` });
  if (/<\/?\s*(style|script)/i.test(flat)) issues.push({ code: 'CSS_MARKUP', message: `${where}: markup inside a stylesheet is not allowed.` });
  if (/expression\s*\(|-moz-binding|behavior\s*:/i.test(flat)) issues.push({ code: 'CSS_SCRIPT', message: `${where}: expression(), -moz-binding and behavior are not allowed.` });
  for (const m of flat.matchAll(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*))\s*\)/gi)) {
    const raw = (m[1] ?? m[2] ?? m[3] ?? '').trim();
    const url = normalizeUrl(raw);
    if (DATA_IMAGE.test(raw) || url.startsWith('#')) continue;
    if (isRelativeFile(url)) assets.push(raw);
    else if (opts.live && isSameSite(url)) continue; // a file the app already serves
    else issues.push({ code: 'CSS_REMOTE_URL', message: `${where}: url(${raw.slice(0, 60)}) is not allowed. ${opts.live ? 'Use a file the app itself serves' : 'Use a file inside the draft folder'}; nothing is loaded from the network.` });
  }
  if (/image-set\(\s*["']/i.test(flat)) issues.push({ code: 'CSS_REMOTE_URL', message: `${where}: image-set() with string URLs is not allowed. Use url().` });
  return { issues, assets };
}

export interface LintOptions {
  /** The page frame may carry <html>, <head>, <meta charset> and <title>; fragments may not. */
  frame?: boolean;
  /**
   * Markup that a patch inserts into the user's running page. It may link to the app's own pages
   * and use the app's own images; it still cannot carry code or load anything from elsewhere.
   */
  live?: boolean;
}

/** Check one HTML file and collect what it refers to. */
export function scanHtml(html: string, opts: LintOptions = {}): Scan {
  const issues: LintIssue[] = [];
  const slots: string[] = [];
  const cutRefs: string[] = [];
  const assets: string[] = [];
  const err = (code: string, message: string) => {
    if (!issues.some((i) => i.code === code && i.message === message)) issues.push({ code, message });
  };

  // Belt and braces: whatever the tokenizer makes of odd markup, these must never appear.
  if (/<\s*script/i.test(html)) {
    err('SCRIPT', opts.live ? 'Inserted markup cannot contain <script>. Use a "script" operation with an "undo" if behavior is needed.' : 'Scripts are not allowed in mockups. Describe behavior with cuts instead (data-pe-in, data-pe-go).');
  }

  let styleOpen = -1;
  for (const m of html.matchAll(TAG)) {
    const closing = m[1]?.toLowerCase();
    const name = m[2]?.toLowerCase();
    const index = m.index ?? 0;
    if (closing === 'style' && styleOpen >= 0) {
      const r = lintCss(html.slice(styleOpen, index), '<style>', opts);
      issues.push(...r.issues);
      assets.push(...r.assets);
      styleOpen = -1;
      continue;
    }
    if (!name || styleOpen >= 0) continue;
    if (name === 'style') {
      styleOpen = index + m[0].length;
      continue;
    }
    if (FORBIDDEN.has(name)) {
      err('FORBIDDEN_ELEMENT', `<${name}> is not allowed in mockups.`);
      continue;
    }
    if (!opts.frame && ['html', 'head', 'body', 'meta', 'title'].includes(name)) {
      err('NOT_A_FRAGMENT', `<${name}> belongs in the page frame. Option and sketch files are fragments.`);
      continue;
    }
    const attrs: Record<string, string> = {};
    for (const a of (m[3] ?? '').matchAll(ATTR)) {
      const key = a[1]!.toLowerCase();
      if (key === '/') continue;
      if (!(key in attrs)) attrs[key] = a[2] ?? a[3] ?? a[4] ?? '';
    }
    if (name === 'meta' && ('http-equiv' in attrs || ('content' in attrs && /url\s*=/i.test(attrs.content!)))) {
      err('FORBIDDEN_ELEMENT', '<meta http-equiv> is not allowed in mockups.');
    }
    for (const [key, value] of Object.entries(attrs)) {
      if (key.startsWith('on')) err('EVENT_HANDLER', `${key}="…" is not allowed. Mockups cannot run code; use data-pe-go to move to another cut.`);
      if (key === 'srcdoc') err('FORBIDDEN_ATTRIBUTE', 'srcdoc is not allowed.');
      if (key === 'style') {
        const r = lintCss(decodeEntities(value), 'style attribute', opts);
        issues.push(...r.issues);
        assets.push(...r.assets);
      }
      if (!URL_ATTRS.has(key)) continue;
      const url = normalizeUrl(value);
      if (key === 'href' || key === 'xlink:href') {
        if (opts.live) {
          if (!isSameSite(url)) err('LINK_TARGET', `href="${value.slice(0, 60)}" is not allowed. Inserted links can only point to pages of the app itself.`);
        } else if (url !== '' && !url.startsWith('#')) {
          err('LINK_TARGET', `href="${value.slice(0, 60)}" is not allowed. Links in a mockup can only point inside the page: href="#" or href="#section-id".`);
        }
        continue;
      }
      if (key === 'action' || key === 'formaction' || key === 'ping' || key === 'manifest' || key === 'data') {
        if (url !== '' && url !== '#') err('FORBIDDEN_ATTRIBUTE', `${key}="…" is not allowed. Forms in a mockup are never sent.`);
        continue;
      }
      const candidates = key === 'srcset' ? value.split(',').map((part) => part.trim().split(/\s+/)[0] ?? '') : [value.trim()];
      for (const candidate of candidates) {
        const u = normalizeUrl(candidate);
        if (u === '') continue;
        if (DATA_IMAGE.test(candidate.trim())) continue;
        if (isRelativeFile(u)) assets.push(decodeEntities(candidate));
        else if (opts.live && isSameSite(u)) continue; // an image the app already serves
        else err('REMOTE_URL', `${key}="${candidate.slice(0, 60)}" is not allowed. Use an image file inside the draft folder; nothing is loaded from the network.`);
      }
    }
    if (attrs['data-pe-area'] !== undefined) slots.push(attrs['data-pe-area']);
    for (const key of ['data-pe-in', 'data-pe-not', 'data-pe-go', 'data-pe-go-invalid']) {
      if (attrs[key] !== undefined) cutRefs.push(...attrs[key]!.split(/\s+/).filter(Boolean));
    }
  }
  if (styleOpen >= 0) err('UNCLOSED_STYLE', 'A <style> element is never closed.');
  return { issues, slots, cutRefs, assets: [...new Set(assets)] };
}
