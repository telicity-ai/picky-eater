import { compose, serialize, type Look, type Pack } from '../review/compose.js';

/**
 * Loaded into a blank page of the headless browser: turns a published revision and the approved
 * choices into the markup of the mockup, with the same code the review page uses.
 */
(globalThis as unknown as { __peCompose: (pack: Pack, look: Look) => string }).__peCompose = (pack, look) => serialize(compose(pack, look));
