import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { VERSION } from '../../src/version.js';

test('src/version.ts matches package.json', () => {
  expect(VERSION).toBe(JSON.parse(readFileSync('package.json', 'utf8')).version);
});
