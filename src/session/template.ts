/** The draft "picky-eater new" starts from: the smallest board that validates, with every moving part once. */
export const TEMPLATE: Record<string, string> = {
  'board.json': `{
  "schema": "picky-eater/board",
  "schemaVersion": "2.0",
  "title": "{{title}}",
  "base": { "kind": "sketch", "frame": "frame.html", "styles": ["styles.css"] },
  "areas": [
    {
      "id": "hero",
      "label": "Top banner",
      "sketch": "areas/hero/sketch.html",
      "options": [
        { "id": "split", "label": "Text left, picture right", "html": "areas/hero/split.html", "pattern": "hero-split", "suggested": true,
          "build": "Two columns from 800px up; one column below." },
        { "id": "centered", "label": "Centered text", "html": "areas/hero/centered.html", "pattern": "hero-centered" }
      ]
    }
  ],
  "cuts": [{ "id": "top", "label": "Top" }]
}
`,
  'frame.html': `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>{{title}}</title>
  </head>
  <body>
    <main>
      <section data-pe-area="hero"></section>
    </main>
  </body>
</html>
`,
  'styles.css': `:root {
  --ink: #1b1f24;
  --muted: #5d6673;
  --accent: #2f5bea;
  --surface: #f5f6f8;
}
body {
  margin: 0;
  font: 16px/1.5 system-ui, sans-serif;
  color: var(--ink);
}
.hero {
  display: grid;
  gap: 32px;
  align-items: center;
  padding: 72px 6vw;
}
.hero--split {
  grid-template-columns: 1fr 1fr;
}
.hero--centered {
  text-align: center;
  justify-items: center;
}
.hero h1 {
  margin: 0 0 12px;
  font-size: 44px;
  line-height: 1.1;
}
.hero p {
  margin: 0 0 24px;
  color: var(--muted);
}
.hero .picture {
  min-height: 280px;
  border-radius: 16px;
  background: var(--surface);
}
.button {
  display: inline-block;
  padding: 12px 20px;
  border-radius: 10px;
  background: var(--accent);
  color: #fff;
  font-weight: 600;
  text-decoration: none;
}
@media (max-width: 800px) {
  .hero--split {
    grid-template-columns: 1fr;
  }
}
`,
  'areas/hero/sketch.html': `<div class="pe-row">
  <div class="pe-col">
    <p class="pe-text">{{title}}</p>
    <div class="pe-line" style="width: 70%"></div>
    <div class="pe-button"></div>
  </div>
  <div class="pe-image" style="height: 220px"></div>
</div>
`,
  'areas/hero/split.html': `<div class="hero hero--split">
  <div>
    <h1>{{title}}</h1>
    <p>One sentence that says what this page is for.</p>
    <a class="button" href="#">Get started</a>
  </div>
  <div class="picture"></div>
</div>
`,
  'areas/hero/centered.html': `<div class="hero hero--centered">
  <h1>{{title}}</h1>
  <p>One sentence that says what this page is for.</p>
  <a class="button" href="#">Get started</a>
</div>
`,
};

/** The draft "picky-eater new --url" starts from: a board over an existing page, with one area. */
export const LIVE_TEMPLATE: Record<string, string> = {
  'board.json': `{
  "schema": "picky-eater/board",
  "schemaVersion": "2.0",
  "title": "{{title}}",
  "base": { "kind": "live", "url": "{{url}}" },
  "areas": [
    {
      "id": "header",
      "label": "Top bar",
      "anchor": "header",
      "source": { "file": "index.html", "selector": "header" },
      "options": [
        { "id": "keep", "label": "As it is now", "keep": true },
        { "id": "compact", "label": "Lower, with less padding", "suggested": true,
          "patch": [{ "css": "header { padding-block: 8px }" }],
          "build": "Reduce the vertical padding of the top bar to 8px." }
      ]
    }
  ],
  "cuts": [{ "id": "top", "label": "Top" }]
}
`,
};
