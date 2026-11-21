import type { Step } from '../stage/protocol.js';
import type { Tab } from './browser.js';

/**
 * Playing the steps that lead to a moment of the page, from outside the page.
 *
 * A step is over when the page has answered it, and a page may take its time: a click that leads to
 * another screen of an app first changes the address, then loads that screen's code, and only then
 * draws it. Waiting for the network alone is over before the loading has begun.
 */

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** What the page shows, coarsely: enough to tell that another screen has been drawn. */
const SIGNATURE = `(() => { const root = document.querySelector('main, #root, #app, #__next, #__nuxt') || document.body; return location.pathname + location.search + '|' + document.querySelectorAll('*').length + '|' + (root.textContent || '').length; })()`;

const cleaned = (err: unknown) => String((err as Error).message).replace(/^In the page: (Error: )?/, '');

/** `seen`: the mark of the moment the steps lead to. A moment that is drawn late is waited for, for a while. */
export async function playSteps(tab: Tab, steps: Step[], seen?: string): Promise<void> {
  const address = (signature: string) => signature.split('|')[0]!;
  for (const [i, step] of steps.entries()) {
    const before = await tab.evaluate<string>(SIGNATURE);
    try {
      await tab.evaluate(`__peProbe.play(${JSON.stringify([step])})`);
    } catch (err) {
      throw new Error(steps.length > 1 ? `step ${i + 1} of ${steps.length}: ${cleaned(err)}` : cleaned(err));
    }
    await sleep(120);
    await tab.idle(300, 12_000);
    await tab.evaluate('__peProbe.quiet(250)');
    let now = await tab.evaluate<string>(SIGNATURE);
    if (address(now) === address(before)) continue;
    // The address changed but the page looks the same: the next screen is still on its way.
    for (let waited = 0; waited < 8000 && now.slice(address(now).length) === before.slice(address(before).length); waited += 200) {
      await sleep(200);
      now = await tab.evaluate<string>(SIGNATURE);
    }
    await tab.idle(300, 12_000);
    await tab.evaluate('__peProbe.quiet(250)');
  }
  if (!seen) return;
  // The mark may come a moment after the page has gone quiet. If it does not come, whoever asked looks for it and says so.
  const shown = `(() => { try { const el = document.querySelector(${JSON.stringify(seen)}); return Boolean(el && el.getClientRects().length > 0); } catch (e) { return true; } })()`;
  for (let waited = 0; waited < 3000 && !(await tab.evaluate<boolean>(shown)); waited += 150) await sleep(150);
}
