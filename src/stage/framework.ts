/**
 * What a running page can tell about the framework that draws it: which component an element
 * belongs to and where that component's source is, and whether markup that came from the server
 * is still waiting for the framework to take it over.
 *
 * Everything here reads what frameworks leave on the page in development. None of it is a public
 * interface, so every read is guarded and the answer may simply be "unknown".
 */

export interface Owner {
  /** react, vue, svelte, astro, angular, or "markup" when the page names the source in attributes. */
  framework: string;
  /** The components around the element, nearest first. */
  components: string[];
  /** Source file as the page knows it: a path, or the address the development server serves it from. */
  file?: string;
  line?: number;
}

type Loose = Record<string, any>;

const ownKey = (node: object, ...prefixes: string[]): string | undefined => {
  try {
    return Object.keys(node).find((k) => prefixes.some((p) => k.startsWith(p)));
  } catch {
    return undefined;
  }
};

const unique = (names: Array<string | undefined | null>, max = 5): string[] => {
  const out: string[] = [];
  for (const name of names) {
    if (!name || out.includes(name)) continue;
    out.push(name);
    if (out.length === max) break;
  }
  return out;
};

/** A source file from an address such as "http://127.0.0.1:5173/src/App.tsx?t=1" or "webpack-internal:///(app)/./src/App.tsx". */
export function fileFromAddress(address: string): string | undefined {
  let path = address.trim();
  path = path.replace(/^webpack(-internal)?:\/\/\/?/, '').replace(/^\([^)]*\)\//, '').replace(/^_N_E\//, '');
  path = path.replace(/^file:\/\//i, '').replace(/^[a-z][a-z0-9+.-]*:\/\/[^/]+/i, '');
  path = path.replace(/[?#].*$/, '');
  path = path.replace(/^\/@fs/, '').replace(/^\.\//, '');
  // What a bundler wrote is not where the element was written.
  if (!path || /node_modules|\/_next\/|\/\.next\/|\/\.nuxt\/|\/\.svelte-kit\/|\/\.vite\/|\/chunks\/|\/dist\/|^\/@|\/__/.test(path)) return undefined;
  return /\.[a-z0-9]+$/i.test(path) ? path : undefined;
}

// --- React -------------------------------------------------------------------------------------

const fiberOf = (el: Element): Loose | undefined => {
  const key = ownKey(el, '__reactFiber$', '__reactInternalInstance$');
  return key ? (el as Loose)[key] : undefined;
};

const reactName = (type: unknown): string | undefined => {
  if (typeof type === 'function') return (type as Loose).displayName || type.name || undefined;
  if (type && typeof type === 'object') {
    const t = type as Loose;
    return t.displayName || reactName(t.render) || reactName(t.type);
  }
  return undefined;
};

/** Where an element was written, from the stack React 19 keeps with it in development. */
const reactStackFile = (stack: unknown): string | undefined => {
  const text = typeof stack === 'string' ? stack : String((stack as Loose | undefined)?.stack ?? '');
  for (const line of text.split('\n')) {
    const address = /\(?((?:https?|webpack-internal|webpack|file):\/\/[^\s)]+?):\d+:\d+\)?\s*$/.exec(line)?.[1];
    const file = address && fileFromAddress(address);
    if (file) return file;
  }
  return undefined;
};

function reactOwner(el: Element): Owner | undefined {
  const fiber = fiberOf(el);
  if (!fiber) return undefined;
  const names: Array<string | undefined> = [];
  let file: string | undefined;
  let line: number | undefined;
  try {
    // An element knows where it was written. One that a library component wrote (a tooltip trigger,
    // a slot) was written outside the project: what counts is where the project used that component.
    let at: Loose | undefined = fiber;
    for (let i = 0; at && i < 12; at = at._debugOwner as Loose | undefined, i++) {
      // React 18 and earlier record the file and line; React 19 keeps the stack of where the element was made.
      const source = at._debugSource as Loose | undefined;
      if (source?.fileName && !/[\\/]node_modules[\\/]/.test(String(source.fileName))) {
        file = String(source.fileName);
        line = Number(source.lineNumber) || undefined;
      } else if (at._debugStack) file = reactStackFile(at._debugStack);
      if (file || !at._debugOwner) break;
    }
    const from = file && at ? at : fiber;
    if (from._debugOwner) {
      // In development an element knows which component wrote it, which is not always the one it sits in.
      // A component that ran on the server is a plain record with a name and an owner of its own.
      for (let o = from._debugOwner as Loose | undefined, i = 0; o && i < 40; o = o._debugOwner ?? o.owner, i++) {
        names.push(reactName(o.type) ?? (typeof o.name === 'string' ? o.name : undefined));
      }
    } else {
      for (let f = fiber.return as Loose | undefined, i = 0; f && i < 80; f = f.return, i++) {
        if (typeof f.type === 'string') continue;
        names.push(reactName(f.type));
      }
    }
  } catch {
    /* internals moved; the name is simply not known */
  }
  return { framework: 'react', components: unique(names), ...(file ? { file } : {}), ...(line ? { line } : {}) };
}

// --- Vue ---------------------------------------------------------------------------------------

const baseName = (file: string) => file.replace(/^.*[\\/]/, '').replace(/\.[^.]+$/, '');

function vueOwner(el: Element): Owner | undefined {
  const node = el as Loose;
  try {
    if (node.__vueParentComponent) {
      const names: Array<string | undefined> = [];
      let file: string | undefined;
      for (let c = node.__vueParentComponent as Loose | undefined, i = 0; c && i < 40; c = c.parent, i++) {
        const type = (c.type ?? {}) as Loose;
        file ??= typeof type.__file === 'string' ? type.__file : undefined;
        names.push(type.__name || type.name || (typeof type.__file === 'string' ? baseName(type.__file) : undefined));
      }
      return { framework: 'vue', components: unique(names), ...(file ? { file } : {}) };
    }
    if (node.__vue__) {
      const names: Array<string | undefined> = [];
      let file: string | undefined;
      for (let vm = node.__vue__ as Loose | undefined, i = 0; vm && i < 40; vm = vm.$parent, i++) {
        const o = (vm.$options ?? {}) as Loose;
        file ??= typeof o.__file === 'string' ? o.__file : undefined;
        names.push(o.name || o._componentTag || (typeof o.__file === 'string' ? baseName(o.__file) : undefined));
      }
      return { framework: 'vue', components: unique(names), ...(file ? { file } : {}) };
    }
  } catch {
    /* unknown */
  }
  return undefined;
}

// --- Svelte, Astro, attributes -----------------------------------------------------------------

function svelteOwner(el: Element): Owner | undefined {
  try {
    const loc = (el as Loose).__svelte_meta?.loc as Loose | undefined;
    if (!loc?.file) return undefined;
    return { framework: 'svelte', components: [baseName(String(loc.file))], file: String(loc.file), ...(Number(loc.line) ? { line: Number(loc.line) } : {}) };
  } catch {
    return undefined;
  }
}

function markupOwner(el: Element): Owner | undefined {
  const astro = el.getAttribute('data-astro-source-file');
  if (astro) {
    const line = Number((el.getAttribute('data-astro-source-loc') ?? '').split(':')[0]) || undefined;
    return { framework: 'astro', components: [baseName(astro)], file: astro, ...(line ? { line } : {}) };
  }
  // Written into the markup by build plugins that exist to find the source of an element.
  const inspector = el.getAttribute('data-inspector-relative-path');
  if (inspector) {
    const line = Number(el.getAttribute('data-inspector-line')) || undefined;
    return { framework: 'markup', components: [baseName(inspector)], file: inspector, ...(line ? { line } : {}) };
  }
  const component = el.getAttribute('data-sentry-component') ?? el.getAttribute('data-component');
  if (component) {
    const file = el.getAttribute('data-sentry-source-file') ?? undefined;
    return { framework: 'markup', components: [component], ...(file ? { file } : {}) };
  }
  return undefined;
}

function angularOwner(el: Element): Owner | undefined {
  try {
    const ng = (el.ownerDocument.defaultView as Loose | null)?.ng as Loose | undefined;
    if (!ng?.getOwningComponent) return undefined;
    const names: string[] = [];
    const push = (c: unknown) => {
      const name = (c as Loose | null)?.constructor?.name as string | undefined;
      if (name && name !== 'Object') names.push(name.replace(/^_+/, ''));
    };
    push(ng.getComponent?.(el));
    for (let c = ng.getOwningComponent(el), i = 0; c && i < 20; c = ng.getOwningComponent(c), i++) push(c);
    return names.length > 0 ? { framework: 'angular', components: unique(names) } : undefined;
  } catch {
    return undefined;
  }
}

/** The component an element belongs to, as far as the page can tell. */
export function ownerOf(el: Element): Owner | null {
  for (let node: Element | null = el, i = 0; node && i < 60; node = node.parentElement, i++) {
    const found = markupOwner(node) ?? svelteOwner(node) ?? vueOwner(node) ?? reactOwner(node);
    if (found && (found.components.length > 0 || found.file)) return found;
  }
  return angularOwner(el) ?? null;
}

const sampleHas = (doc: Document, test: (el: Element) => boolean): boolean => Array.from(doc.querySelectorAll('body, body > *, body > * > *')).slice(0, 200).some(test);

// --- which frameworks draw this page -------------------------------------------------------------

/** For people: "React 19.1", "Next.js", "Vue 3.5", … */
export function frameworksOf(doc: Document): string[] {
  const view = (doc.defaultView ?? {}) as Loose;
  const out: string[] = [];
  const add = (name: string, version?: unknown) => out.push(typeof version === 'string' && /^\d/.test(version) ? `${name} ${version}` : name);
  const has = (selector: string) => {
    try {
      return doc.querySelector(selector) !== null;
    } catch {
      return false;
    }
  };
  const tryIt = (fn: () => void) => {
    try {
      fn();
    } catch {
      /* unknown */
    }
  };
  tryIt(() => {
    const sample = Array.from(doc.querySelectorAll('body *')).slice(0, 400);
    if (sample.some((el) => fiberOf(el)) || ownKey(doc, '__reactContainer$') || sample.some((el) => ownKey(el, '__reactContainer$'))) {
      let version: unknown;
      for (const r of (view.__REACT_DEVTOOLS_GLOBAL_HOOK__?.renderers?.values?.() ?? []) as Iterable<Loose>) version ??= r.version;
      add('React', version);
    }
    if (sample.some((el) => (el as Loose).__vueParentComponent || (el as Loose).__vue__ || (el as Loose).__vue_app__) || view.__VUE__) {
      const app = sample.map((el) => (el as Loose).__vue_app__).find(Boolean) as Loose | undefined;
      add('Vue', app?.version ?? view.Vue?.version);
    }
    if (sample.some((el) => (el as Loose).__svelte_meta) || view.__svelte) add('Svelte');
  });
  tryIt(() => sampleHas(doc, (el) => '__k' in el && !fiberOf(el)) && add('Preact'));
  tryIt(() => view.next && add('Next.js', view.next.version));
  tryIt(() => (view.__NUXT__ || has('#__nuxt')) && add('Nuxt'));
  tryIt(() => Object.keys(view).some((k) => k.startsWith('__sveltekit_')) && add('SvelteKit'));
  tryIt(() => (view.__reactRouterContext || view.__remixContext) && add(view.__remixContext ? 'Remix' : 'React Router'));
  tryIt(() => {
    const generator = doc.querySelector('meta[name="generator"]')?.getAttribute('content') ?? '';
    const m = /^(Astro|Gatsby|Docusaurus|VitePress|Hugo|Jekyll|Eleventy)\b\s*v?([\d.]+)?/i.exec(generator);
    if (m) add(m[1]!, m[2]);
    else if (has('astro-island') || has('[data-astro-source-file]')) add('Astro');
  });
  tryIt(() => has('[ng-version]') && add('Angular', doc.querySelector('[ng-version]')!.getAttribute('ng-version')));
  tryIt(() => (view.Solid$$ || view._$HY) && add('Solid'));
  tryIt(() => (has('[q\\:container]') || has('[q\\:version]')) && add('Qwik'));
  tryIt(() => view.litElementVersions && add('Lit', view.litElementVersions[0]));
  tryIt(() => view.Alpine && add('Alpine', view.Alpine.version));
  tryIt(() => view.htmx && add('htmx', view.htmx.version));
  tryIt(() => has('script[src*="/@vite/client"]') && add('Vite'));
  return out;
}

// --- is the page still taking over what the server sent? -----------------------------------------

/** After this long a page is taken as it is: nothing may wait forever. */
const PATIENCE = 8000;
const QUIET = 300;

/**
 * Many frameworks send finished markup from the server and then "hydrate" it: they walk it and
 * attach themselves. Markup that changes in between confuses them (errors in the console, the
 * whole page drawn again). The function returned here says whether the markup around an element
 * can be changed yet.
 */
export function createReadiness(doc: Document): (el: Element) => boolean {
  const view = doc.defaultView as (Window & Loose) | null;
  if (!view) return () => true;
  let lastLoad = 0;
  try {
    // The scripts that hydrate a page arrive one after the other; while they still come in, it has not started.
    new view.PerformanceObserver((list: PerformanceObserverEntryList) => {
      for (const entry of list.getEntries()) lastLoad = Math.max(lastLoad, (entry as PerformanceResourceTiming).responseEnd || entry.startTime);
    }).observe({ type: 'resource', buffered: true });
  } catch {
    /* no resource timing here */
  }
  const now = () => view.performance.now();
  const quiet = () => doc.readyState === 'complete' && now() - lastLoad > QUIET;
  const has = (selector: string) => doc.querySelector(selector) !== null;

  const reactRoots = (el: Element): Loose[] => {
    const roots: Loose[] = [];
    const look = (node: object | null) => {
      const key = node && ownKey(node, '__reactContainer$');
      if (key) roots.push((node as Loose)[key]);
    };
    look(doc);
    for (let node: Element | null = el; node; node = node.parentElement) look(node);
    return roots;
  };

  return (el) => {
    if (doc.readyState === 'loading') return false;
    if (now() > PATIENCE) return true;
    try {
      // Astro: an island keeps its "ssr" attribute until its component has taken it over.
      const island = el.closest('astro-island[ssr]') ?? el.querySelector('astro-island[ssr]');
      if (island && /^(load|idle)$/.test(island.getAttribute('client') ?? '')) return false;

      // React: the root says so itself.
      const roots = reactRoots(el);
      if (roots.some((fiber) => fiber?.stateNode?.current?.memoizedState?.isDehydrated === true)) return false;
      const serverReact = view.__next_f || has('#__NEXT_DATA__') || view.__reactRouterContext || view.__remixContext || view.__staticRouterHydrationData || view.___gatsby || view.$_TSR || view.__TSR_SSR__;
      if (serverReact && roots.length === 0) return false;

      // Vue: the element an app is mounted on carries the app once it is.
      if (view.__NUXT__ || has('#__nuxt') || has('[data-server-rendered]')) {
        let mounted = false;
        for (let node: Element | null = el; node; node = node.parentElement) mounted ||= Boolean((node as Loose).__vue_app__);
        if (!mounted) return false;
      }

      // Others leave no sign of being done: wait until their scripts have stopped arriving.
      const other = Object.keys(view).some((k) => k.startsWith('__sveltekit_')) || has('[ng-server-context]') || has('[ngh]') || view._$HY;
      if (other && !quiet()) return false;
    } catch {
      /* unknown internals: go ahead */
    }
    return true;
  };
}
