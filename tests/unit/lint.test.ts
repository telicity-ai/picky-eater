import { describe, expect, test } from 'vitest';
import { decodeEntities, lintCss, scanHtml } from '../../src/core/lint.js';

const codes = (html: string, frame = false) => scanHtml(html, { frame }).issues.map((i) => i.code);

describe('scanHtml', () => {
  test('accepts an ordinary fragment and reports what it refers to', () => {
    const scan = scanHtml(`
      <div class="hero" style="background: url(assets/bg.png)">
        <img src="assets/room.svg" alt="">
        <a href="#signup">Sign up</a> <a href="#">Top</a>
        <div data-pe-area="cta" data-pe-in="error sent"></div>
        <button data-pe-go="sent" data-pe-go-invalid="error">Send</button>
        <p data-pe-not="top">x</p>
        <style>.a { color: red } .b { background: url("assets/dot.png") }</style>
      </div>`);
    expect(scan.issues).toEqual([]);
    expect(scan.slots).toEqual(['cta']);
    expect(scan.cutRefs.sort()).toEqual(['error', 'error', 'sent', 'sent', 'top']);
    expect(scan.assets.sort()).toEqual(['assets/bg.png', 'assets/dot.png', 'assets/room.svg']);
  });

  test.each([
    ['<script>alert(1)</script>', 'SCRIPT'],
    ['<SCRIPT src=x></SCRIPT>', 'SCRIPT'],
    ['<svg><script>1</script></svg>', 'SCRIPT'],
    ['<iframe src="x"></iframe>', 'FORBIDDEN_ELEMENT'],
    ['<object data="x"></object>', 'FORBIDDEN_ELEMENT'],
    ['<base href="//evil.example">', 'FORBIDDEN_ELEMENT'],
    ['<link rel="stylesheet" href="x.css">', 'FORBIDDEN_ELEMENT'],
    ['<img src=x onerror=alert(1)>', 'EVENT_HANDLER'],
    ['<div ONCLICK="x()">a</div>', 'EVENT_HANDLER'],
    ['<img src="https://example.com/a.png">', 'REMOTE_URL'],
    ['<img src="//example.com/a.png">', 'REMOTE_URL'],
    ['<img srcset="a.png 1x, https://example.com/b.png 2x">', 'REMOTE_URL'],
    ['<img src="data:text/html;base64,PHNjcmlwdD4=">', 'REMOTE_URL'],
    ['<a href="https://example.com">x</a>', 'LINK_TARGET'],
    ['<a href="javascript:alert(1)">x</a>', 'LINK_TARGET'],
    ['<a href="jav&#x61;script:alert(1)">x</a>', 'LINK_TARGET'],
    ['<a href=" java\tscript:alert(1)">x</a>', 'LINK_TARGET'],
    ['<form action="/send"><button formaction="/x">a</button></form>', 'FORBIDDEN_ATTRIBUTE'],
    ['<div style="background:url(https://example.com/x.png)"></div>', 'CSS_REMOTE_URL'],
    ['<style>@import "x.css";</style>', 'CSS_IMPORT'],
    ['<style>a{background:url(//example.com/x)}</style>', 'CSS_REMOTE_URL'],
    ['<style>a{color:red}', 'UNCLOSED_STYLE'],
    ['<iframe srcdoc="<p>x</p>"></iframe>', 'FORBIDDEN_ELEMENT'],
  ])('refuses %s', (html, code) => {
    expect(codes(html)).toContain(code);
  });

  test('document elements belong to the frame only', () => {
    const doc = '<!doctype html><html><head><meta charset="utf-8"><title>t</title></head><body><p>x</p></body></html>';
    expect(codes(doc)).toContain('NOT_A_FRAGMENT');
    expect(codes(doc, true)).toEqual([]);
    expect(codes('<html><head><meta http-equiv="refresh" content="0;url=https://example.com"></head></html>', true)).toContain('FORBIDDEN_ELEMENT');
  });

  test('a quoted ">" does not end a tag early', () => {
    expect(scanHtml('<div title="a > b" data-pe-area="x"></div>').slots).toEqual(['x']);
    expect(codes('<div title=">" onclick="x()"></div>')).toContain('EVENT_HANDLER');
  });

  test('data images are allowed, in src and in CSS', () => {
    expect(codes('<img src="data:image/png;base64,iVBORw0KGgo=">')).toEqual([]);
    expect(lintCss('a{background:url(data:image/png;base64,iVBORw0KGgo=)}').issues).toEqual([]);
  });
});

describe('lintCss', () => {
  test('sees through CSS escapes', () => {
    expect(lintCss('a{background:\\75rl(https://example.com/x)}').issues.map((i) => i.code)).toContain('CSS_REMOTE_URL');
    expect(lintCss('@\\69mport "x";').issues.map((i) => i.code)).toContain('CSS_IMPORT');
  });
  test('ignores comments and fragment references', () => {
    expect(lintCss('/* url(https://example.com) */ a{fill:url(#grad)}')).toEqual({ issues: [], assets: [] });
  });
  test('refuses script-like values and markup', () => {
    expect(lintCss('a{width:expression(alert(1))}').issues.map((i) => i.code)).toContain('CSS_SCRIPT');
    expect(lintCss('a{} </style><script>').issues.map((i) => i.code)).toContain('CSS_MARKUP');
  });
});

test('decodeEntities handles numeric and named references', () => {
  expect(decodeEntities('jav&#x61;script&colon;&#97;')).toBe('javascript:a');
});
