/**
 * Ready-made mockup fragments for catalog patterns, written with the kit classes of kit.css.
 * "picky-eater patterns <id>" prints them, so an option starts from a working, script-free piece
 * instead of from nothing. Keys are catalog pattern ids. Patterns that describe behavior rather
 * than something to draw (drag and drop, validation timing) have no snippet.
 */
const SNIPPETS: Record<string, string> = {
  // ---- layout ----
  'single-column': `<main class="pk-center pk-stack">
  <h1>Page title</h1>
  <p>One column of content, no wider than a comfortable line of text.</p>
</main>`,
  'contained-width': `<section><div class="pk-center" style="--pk-measure: 1080px">Content keeps a maximum width and stays centered.</div></section>`,
  'full-bleed': `<section style="background: var(--pk-soft); padding: 64px 0"><div class="pk-center" style="--pk-measure: 1080px">The background runs edge to edge; the content keeps its width.</div></section>`,
  'sidebar-content': `<div class="pk-sidebar">
  <nav class="pk-sidenav" aria-label="Sections"><a href="#" aria-current="page">Profile</a><a href="#">Notifications</a><a href="#">Billing</a></nav>
  <main class="pk-stack"><h1>Profile</h1><p>Content of the selected section.</p></main>
</div>`,
  'split-screen': `<div class="pk-split">
  <div class="pk-stack"><h1>Headline</h1><p>Supporting sentence.</p><a class="pk-btn" href="#">Get started</a></div>
  <div class="pk-media"></div>
</div>`,
  'hero-split': `<section class="pk-split" style="padding: 72px 6vw">
  <div class="pk-stack"><h1>What it is, in one line</h1><p>One sentence on who it is for and what they get.</p><div class="pk-cluster"><a class="pk-btn" href="#">Start free</a><a class="pk-btn pk-btn--quiet" href="#">See how it works</a></div></div>
  <div class="pk-media"></div>
</section>`,
  'hero-centered': `<section class="pk-center pk-stack" style="padding-block: 88px; text-align: center; align-items: center">
  <h1>What it is, in one line</h1>
  <p>One sentence on who it is for and what they get.</p>
  <a class="pk-btn" href="#">Start free</a>
</section>`,
  'landing-sections': `<section class="pk-center pk-stack" style="padding-block: 72px"><h2>First reason</h2><p>Each section makes one point and ends with the same action.</p></section>
<section class="pk-center pk-stack" style="padding-block: 72px; background: var(--pk-soft)"><h2>Second reason</h2><p>Alternate backgrounds to separate sections.</p></section>`,
  'zigzag-rows': `<div class="pk-stack" style="--pk-gap: 72px">
  <div class="pk-split"><div class="pk-stack"><h2>First feature</h2><p>Text on the left, picture on the right.</p></div><div class="pk-media"></div></div>
  <div class="pk-split"><div class="pk-media"></div><div class="pk-stack"><h2>Second feature</h2><p>Then the other way round.</p></div></div>
</div>`,
  'card-grid': `<div class="pk-grid">
  <article class="pk-card"><div class="pk-media"></div><h3>Card title</h3><p>One or two lines.</p></article>
  <article class="pk-card"><div class="pk-media"></div><h3>Card title</h3><p>One or two lines.</p></article>
  <article class="pk-card"><div class="pk-media"></div><h3>Card title</h3><p>One or two lines.</p></article>
</div>`,
  'featured-grid': `<div class="pk-featured">
  <article class="pk-card"><div class="pk-media"></div><h2>The lead item</h2><p>Larger, with more text.</p></article>
  <article class="pk-card"><h3>Second item</h3><p>Short.</p></article>
  <article class="pk-card"><h3>Third item</h3><p>Short.</p></article>
</div>`,
  'bento-grid': `<div class="pk-bento">
  <article class="pk-card pk-wide pk-tall"><h3>Main point</h3></article>
  <article class="pk-card"><h3>Detail</h3></article>
  <article class="pk-card"><h3>Detail</h3></article>
  <article class="pk-card pk-wide"><h3>Wide detail</h3></article>
</div>`,
  'masonry-grid': `<div class="pk-masonry">
  <div class="pk-media" style="aspect-ratio: 3 / 4"></div><div class="pk-media"></div><div class="pk-media" style="aspect-ratio: 1"></div>
  <div class="pk-media"></div><div class="pk-media" style="aspect-ratio: 3 / 4"></div><div class="pk-media" style="aspect-ratio: 1"></div>
</div>`,
  'dashboard-grid': `<div class="pk-stack">
  <div class="pk-grid" style="--pk-min: 160px"><div class="pk-stat">Orders today<b>128</b></div><div class="pk-stat">Revenue<b>$4,310</b></div><div class="pk-stat">Returns<b>3</b></div></div>
  <div class="pk-sidebar pk-sidebar--end"><div class="pk-card"><h3>Orders over time</h3><div class="pk-media"></div></div><div class="pk-card"><h3>Needs attention</h3><p>3 orders are late.</p></div></div>
</div>`,
  'list-detail': `<div class="pk-sidebar" style="--pk-side: 320px">
  <ul class="pk-list"><li aria-current="true"><span class="pk-grow"><b>First item</b><br /><span class="pk-hint">Summary line</span></span></li><li><span class="pk-grow"><b>Second item</b><br /><span class="pk-hint">Summary line</span></span></li></ul>
  <article class="pk-card"><h2>First item</h2><p>Everything about the selected item.</p></article>
</div>`,
  'section-nav-page': `<div class="pk-sidebar pk-sidebar--end" style="--pk-side: 200px">
  <article class="pk-stack"><h2 id="one">First section</h2><p>Long content.</p><h2 id="two">Second section</h2><p>Long content.</p></article>
  <nav class="pk-toc" aria-label="On this page" style="position: sticky; top: 80px"><a href="#one">First section</a><a href="#two">Second section</a></nav>
</div>`,
  'tabbed-sections': `<div class="pk-stack">
  <div class="pk-tabs" role="tablist"><button role="tab" aria-selected="true">Overview</button><button role="tab" aria-selected="false">Activity</button><button role="tab" aria-selected="false">Settings</button></div>
  <div role="tabpanel">Content of the selected tab.</div>
</div>`,
  'accordion-sections': `<div class="pk-accordion">
  <details open><summary>Account</summary><p>Fields of this section.</p></details>
  <details><summary>Notifications</summary><p>Fields of this section.</p></details>
  <details><summary>Billing</summary><p>Fields of this section.</p></details>
</div>`,
  wizard: `<div class="pk-center pk-stack">
  <ol class="pk-steps"><li class="pk-done">Details</li><li aria-current="step">Payment</li><li>Confirm</li></ol>
  <h1>Payment</h1>
  <label class="pk-field"><span>Card number</span><input inputmode="numeric" autocomplete="cc-number" /></label>
  <div class="pk-cluster"><button class="pk-btn pk-btn--secondary" type="button">Back</button><button class="pk-btn" type="button">Continue</button></div>
</div>`,
  'task-list': `<ul class="pk-list">
  <li><span class="pk-grow"><b>Your details</b></span><span class="pk-badge pk-badge--ok">Done</span></li>
  <li><span class="pk-grow"><b>Documents</b></span><span class="pk-badge pk-badge--warn">In progress</span></li>
  <li><span class="pk-grow"><b>Review and send</b></span><span class="pk-badge">Not started yet</span></li>
</ul>`,
  feed: `<div class="pk-feed">
  <article class="pk-card"><div class="pk-cluster"><span class="pk-avatar">DO</span><b>Dana Okafor</b><span class="pk-hint">2 h ago</span></div><p>Newest entry first.</p></article>
  <article class="pk-card"><div class="pk-cluster"><span class="pk-avatar">IB</span><b>Ilya Brandt</b><span class="pk-hint">Yesterday</span></div><p>Older entries follow.</p></article>
</div>`,
  'comparison-table': `<div class="pk-table-wrap"><table class="pk-table">
  <thead><tr><th>Feature</th><th>Basic</th><th>Pro</th></tr></thead>
  <tbody><tr><td>Projects</td><td>3</td><td>Unlimited</td></tr><tr><td>Support</td><td>Email</td><td>Email and phone</td></tr></tbody>
</table></div>`,
  'sticky-header': `<header class="pk-nav" style="position: sticky; top: 0; z-index: 10"><span class="pk-brand">Brand</span><a href="#">Pricing</a><a href="#">Docs</a><a class="pk-btn" href="#">Sign up</a></header>`,
  'bottom-action-bar': `<div class="pk-sticky-bar"><span class="pk-hint" style="margin-right: auto">Total $48.00</span><button class="pk-btn" type="button">Continue</button></div>`,

  // ---- navigation ----
  'top-nav': `<header class="pk-nav"><span class="pk-brand">Brand</span><a href="#" aria-current="page">Product</a><a href="#">Pricing</a><a href="#">Docs</a><a class="pk-btn" href="#">Sign up</a></header>`,
  'sidebar-nav': `<nav class="pk-sidenav" aria-label="Main"><a href="#" aria-current="page">Home</a><a href="#">Orders</a><a href="#">Customers</a><a href="#">Settings</a></nav>`,
  'bottom-tab-bar': `<nav class="pk-tabbar" aria-label="Main"><a href="#" aria-current="page">Home</a><a href="#">Search</a><a href="#">Orders</a><a href="#">Account</a></nav>`,
  'nav-drawer': `<details class="pk-disclosure">
  <summary class="pk-icon-btn" aria-label="Menu">☰</summary>
  <nav class="pk-sidenav" aria-label="Main"><a href="#" aria-current="page">Home</a><a href="#">Orders</a><a href="#">Settings</a></nav>
</details>`,
  'mega-menu': `<div class="pk-megamenu">
  <div><b>Clothing</b><br /><a href="#">Jackets</a><br /><a href="#">Shirts</a></div>
  <div><b>Shoes</b><br /><a href="#">Boots</a><br /><a href="#">Trainers</a></div>
  <div><b>Accessories</b><br /><a href="#">Bags</a><br /><a href="#">Hats</a></div>
  <div><b>Sale</b><br /><a href="#">Under $50</a></div>
</div>`,
  'nav-tabs': `<nav class="pk-tabs" aria-label="Sections"><a href="#" aria-current="page">Overview</a><a href="#">Activity</a><a href="#">Settings</a></nav>`,
  breadcrumbs: `<nav aria-label="Breadcrumb"><ol class="pk-breadcrumbs"><li><a class="pk-link" href="#">Home</a></li><li><a class="pk-link" href="#">Orders</a></li><li aria-current="page">Order 1042</li></ol></nav>`,
  pagination: `<nav class="pk-pagination" aria-label="Pages"><a href="#">Previous</a><a href="#" aria-current="page">1</a><a href="#">2</a><a href="#">3</a><a href="#">Next</a></nav>`,
  'load-more': `<div class="pk-stack" style="align-items: center"><span class="pk-hint">Showing 20 of 134</span><button class="pk-btn pk-btn--secondary" type="button">Show 20 more</button></div>`,
  'infinite-scroll': `<div class="pk-stack" style="align-items: center; padding: 24px"><span class="pk-spinner" role="status" aria-label="Loading more"></span></div>`,
  'step-indicator': `<ol class="pk-steps"><li class="pk-done">Details</li><li aria-current="step">Payment</li><li>Confirm</li></ol>`,
  'table-of-contents': `<nav class="pk-toc" aria-label="On this page"><a href="#one">First section</a><a href="#two">Second section</a><a href="#three">Third section</a></nav>`,
  'footer-sitemap': `<footer class="pk-footer">
  <div><b>Product</b><a href="#">Features</a><br /><a href="#">Pricing</a></div>
  <div><b>Company</b><a href="#">About</a><br /><a href="#">Careers</a></div>
  <div><b>Help</b><a href="#">Contact</a><br /><a href="#">Status</a></div>
</footer>`,
  'search-navigation': `<header class="pk-nav"><span class="pk-brand">Brand</span><label class="pk-search" style="flex: 1; max-width: 480px"><input type="search" aria-label="Search" placeholder="Search products" /></label></header>`,
  'command-palette': `<div class="pk-palette" role="dialog" aria-label="Commands">
  <input aria-label="Type a command" placeholder="Type a command or search" />
  <ul role="listbox"><li role="option" aria-selected="true">New project <span class="pk-kbd">N</span></li><li role="option">Go to settings <span class="pk-kbd">G S</span></li></ul>
</div>`,
  'view-switcher': `<div class="pk-seg" role="radiogroup" aria-label="View"><label><input type="radio" name="view" checked /><span>List</span></label><label><input type="radio" name="view" /><span>Board</span></label><label><input type="radio" name="view" /><span>Calendar</span></label></div>`,
  'back-to-top': `<a class="pk-btn pk-btn--secondary" href="#top" style="position: fixed; right: 20px; bottom: 20px">Back to top</a>`,

  // ---- input ----
  'text-field': `<label class="pk-field"><span>Full name</span><input autocomplete="name" /></label>`,
  textarea: `<label class="pk-field"><span>Message</span><textarea rows="4"></textarea><span class="pk-hint">Up to 500 characters</span></label>`,
  select: `<label class="pk-field"><span>Country</span><select><option>Canada</option><option>France</option><option>Japan</option></select></label>`,
  combobox: `<label class="pk-field"><span>City</span><input list="pk-cities" autocomplete="off" /><datalist id="pk-cities"><option value="Lisbon"></option><option value="Lima"></option><option value="Lyon"></option></datalist></label>`,
  'radio-group': `<fieldset class="pk-choices"><legend>Delivery</legend>
  <label class="pk-radio"><input type="radio" name="delivery" checked /><span>Standard, 3 to 5 days</span></label>
  <label class="pk-radio"><input type="radio" name="delivery" /><span>Express, next day</span></label>
</fieldset>`,
  checkbox: `<label class="pk-check"><input type="checkbox" /><span>Send me the monthly newsletter</span></label>`,
  'checkbox-group': `<fieldset class="pk-choices"><legend>Notify me about</legend>
  <label class="pk-check"><input type="checkbox" checked /><span>Replies</span></label>
  <label class="pk-check"><input type="checkbox" /><span>Mentions</span></label>
  <label class="pk-check"><input type="checkbox" /><span>New followers</span></label>
</fieldset>`,
  switch: `<label class="pk-switch"><span>Email me about replies</span><input type="checkbox" role="switch" checked /></label>`,
  'segmented-control': `<div class="pk-seg" role="radiogroup" aria-label="Billing period"><label><input type="radio" name="period" checked /><span>Monthly</span></label><label><input type="radio" name="period" /><span>Yearly</span></label></div>`,
  'toggle-button': `<div class="pk-cluster"><button class="pk-toggle" type="button" aria-pressed="true">Bold</button><button class="pk-toggle" type="button" aria-pressed="false">Italic</button></div>`,
  slider: `<label class="pk-field"><span>Volume</span><input class="pk-range" type="range" min="0" max="100" value="60" /></label>`,
  'number-stepper': `<div class="pk-field"><span>Tickets</span><div class="pk-stepper-input"><button type="button" aria-label="One fewer">−</button><input inputmode="numeric" value="2" aria-label="Tickets" /><button type="button" aria-label="One more">+</button></div></div>`,
  'date-picker': `<label class="pk-field"><span>Check-in</span><input type="date" /></label>`,
  'date-text-input': `<fieldset class="pk-choices"><legend>Date of birth</legend><span class="pk-hint">For example, 27 3 2007</span>
  <div class="pk-cluster"><label class="pk-field" style="width: 64px"><span>Day</span><input inputmode="numeric" /></label><label class="pk-field" style="width: 64px"><span>Month</span><input inputmode="numeric" /></label><label class="pk-field" style="width: 88px"><span>Year</span><input inputmode="numeric" /></label></div>
</fieldset>`,
  'file-upload': `<div class="pk-dropzone"><b>Drop a file here</b><span>or</span><button class="pk-btn pk-btn--secondary" type="button">Choose a file</button><span class="pk-hint">PDF or image, up to 10 MB</span></div>`,
  'search-field': `<label class="pk-search"><input type="search" aria-label="Search" placeholder="Search orders" /></label>`,
  'tag-input': `<div class="pk-field"><span>Skills</span><div class="pk-chips"><span class="pk-tag">Design ✕</span><span class="pk-tag">Research ✕</span><input aria-label="Add a skill" /></div></div>`,
  rating: `<fieldset class="pk-choices"><legend>Your rating</legend><div class="pk-rating">
  <input type="radio" name="rating" id="pk-r5" /><label for="pk-r5" aria-label="5 stars">★</label><input type="radio" name="rating" id="pk-r4" checked /><label for="pk-r4" aria-label="4 stars">★</label><input type="radio" name="rating" id="pk-r3" /><label for="pk-r3" aria-label="3 stars">★</label><input type="radio" name="rating" id="pk-r2" /><label for="pk-r2" aria-label="2 stars">★</label><input type="radio" name="rating" id="pk-r1" /><label for="pk-r1" aria-label="1 star">★</label>
</div></fieldset>`,
  'password-field': `<div class="pk-field"><label for="pk-password">Password</label><div class="pk-password"><input id="pk-password" type="password" autocomplete="new-password" /><button class="pk-btn pk-btn--secondary" type="button">Show</button></div><span class="pk-hint">At least 12 characters</span></div>`,
  'one-time-code': `<fieldset class="pk-choices"><legend>Enter the 6-digit code we sent you</legend><div class="pk-otp"><input inputmode="numeric" maxlength="1" aria-label="Digit 1" /><input inputmode="numeric" maxlength="1" aria-label="Digit 2" /><input inputmode="numeric" maxlength="1" aria-label="Digit 3" /><input inputmode="numeric" maxlength="1" aria-label="Digit 4" /><input inputmode="numeric" maxlength="1" aria-label="Digit 5" /><input inputmode="numeric" maxlength="1" aria-label="Digit 6" /></div></fieldset>`,
  'inline-edit': `<div class="pk-inline-edit"><input class="pk-input" value="Quarterly report" aria-label="Title" /><button class="pk-btn" type="button">Save</button><button class="pk-btn pk-btn--quiet" type="button">Cancel</button></div>`,
  'label-top': `<label class="pk-field"><span>Email</span><input type="email" autocomplete="email" /></label>`,
  'label-left': `<label class="pk-field pk-field--side"><span>Email</span><input type="email" autocomplete="email" /></label>`,
  'label-floating': `<label class="pk-field pk-float"><span>Email</span><input type="email" autocomplete="email" value="mina@example.com" /></label>`,
  'label-placeholder-only': `<input class="pk-input" type="email" placeholder="Email" aria-label="Email" />`,
  'help-text': `<label class="pk-field"><span>Phone number</span><span class="pk-hint">We only call about your delivery.</span><input type="tel" autocomplete="tel" /></label>`,
  'mark-required': `<label class="pk-field"><span>Email <span aria-hidden="true">*</span></span><input type="email" required /></label>`,
  'mark-optional': `<label class="pk-field"><span>Company <span class="pk-optional">(optional)</span></span><input autocomplete="organization" /></label>`,

  // ---- action ----
  button: `<div class="pk-cluster"><button class="pk-btn" type="button">Save changes</button><button class="pk-btn pk-btn--secondary" type="button">Cancel</button><button class="pk-btn pk-btn--quiet" type="button">Learn more</button></div>`,
  'destructive-button': `<button class="pk-btn pk-btn--danger" type="button">Delete account</button>`,
  'button-group': `<div class="pk-btn-group" role="group" aria-label="Alignment"><button class="pk-btn pk-btn--secondary" type="button">Left</button><button class="pk-btn pk-btn--secondary" type="button">Center</button><button class="pk-btn pk-btn--secondary" type="button">Right</button></div>`,
  'split-button': `<div class="pk-btn-group"><button class="pk-btn" type="button">Send</button><button class="pk-btn" type="button" aria-label="More ways to send">▾</button></div>`,
  'icon-button': `<button class="pk-icon-btn" type="button" aria-label="Close">✕</button>`,
  'floating-action-button': `<button class="pk-fab" type="button" aria-label="New message">+</button>`,
  'text-link': `<p>Read the <a class="pk-link" href="#">delivery terms</a> before you order.</p>`,
  'overflow-menu': `<details class="pk-disclosure">
  <summary class="pk-icon-btn" aria-label="More actions">⋯</summary>
  <div class="pk-menu" role="menu"><button role="menuitem" type="button">Rename</button><button role="menuitem" type="button">Duplicate</button><hr /><button class="pk-danger" role="menuitem" type="button">Delete</button></div>
</details>`,
  'bulk-action-bar': `<div class="pk-sticky-bar" style="justify-content: flex-start"><b>3 selected</b><button class="pk-btn pk-btn--secondary" type="button">Archive</button><button class="pk-btn pk-btn--secondary pk-btn--danger" type="button">Delete</button><button class="pk-btn pk-btn--quiet" type="button" style="margin-left: auto">Clear selection</button></div>`,
  'hover-row-actions': `<ul class="pk-list"><li><span class="pk-grow">Quarterly report.pdf</span><button class="pk-icon-btn" type="button" aria-label="Download Quarterly report.pdf">↓</button><button class="pk-icon-btn" type="button" aria-label="More actions for Quarterly report.pdf">⋯</button></li></ul>`,
  'drag-and-drop': `<ul class="pk-list"><li><span aria-hidden="true">⠿</span><span class="pk-grow">First item</span><button class="pk-icon-btn" type="button" aria-label="Move First item down">↓</button></li><li><span aria-hidden="true">⠿</span><span class="pk-grow">Second item</span><button class="pk-icon-btn" type="button" aria-label="Move Second item up">↑</button></li></ul>`,
  undo: `<div class="pk-toast" role="status">Conversation archived <button type="button">Undo</button></div>`,
  'explicit-save': `<div class="pk-cluster"><button class="pk-btn" type="button">Save changes</button><button class="pk-btn pk-btn--secondary" type="button">Cancel</button></div>`,
  'sticky-save-bar': `<div class="pk-sticky-bar"><span class="pk-hint" style="margin-right: auto">You have unsaved changes</span><button class="pk-btn pk-btn--secondary" type="button">Discard</button><button class="pk-btn" type="button">Save</button></div>`,
  autosave: `<span class="pk-saved" role="status">✓ Saved</span>`,

  // ---- content ----
  card: `<article class="pk-card"><div class="pk-media"></div><h3>Card title</h3><p>One or two lines that say what this is.</p><a class="pk-link" href="#">Open</a></article>`,
  'list-row': `<ul class="pk-list"><li><span class="pk-avatar">DO</span><span class="pk-grow"><b>Dana Okafor</b><br /><span class="pk-hint">dana@example.com</span></span><span class="pk-badge pk-badge--ok">Active</span></li></ul>`,
  'data-table': `<div class="pk-table-wrap"><table class="pk-table">
  <thead><tr><th>Order</th><th>Customer</th><th>Status</th><th class="pk-num">Total</th></tr></thead>
  <tbody><tr><td>1042</td><td>Dana Okafor</td><td><span class="pk-badge pk-badge--ok">Paid</span></td><td class="pk-num">$48.00</td></tr><tr><td>1041</td><td>Ilya Brandt</td><td><span class="pk-badge pk-badge--warn">Pending</span></td><td class="pk-num">$120.50</td></tr></tbody>
</table></div>`,
  'description-list': `<dl class="pk-dl"><dt>Name</dt><dd>Dana Okafor</dd><dt>Email</dt><dd>dana@example.com</dd><dt>Plan</dt><dd>Pro, renews 1 March</dd></dl>`,
  disclosure: `<details class="pk-more"><summary>Show delivery details</summary><p>Hidden until someone asks for it.</p></details>`,
  carousel: `<div class="pk-carousel"><article class="pk-card"><div class="pk-media"></div><h3>First</h3></article><article class="pk-card"><div class="pk-media"></div><h3>Second</h3></article><article class="pk-card"><div class="pk-media"></div><h3>Third</h3></article></div>`,
  'thumbnail-grid': `<div class="pk-thumbs"><div></div><div></div><div></div><div></div><div></div><div></div></div>`,
  avatar: `<span class="pk-avatar" role="img" aria-label="Dana Okafor">DO</span>`,
  'status-badge': `<div class="pk-cluster"><span class="pk-badge pk-badge--ok">Paid</span><span class="pk-badge pk-badge--warn">Pending</span><span class="pk-badge pk-badge--danger">Failed</span><span class="pk-badge">Draft</span></div>`,
  tag: `<div class="pk-cluster"><span class="pk-tag">Design</span><span class="pk-tag">Research</span></div>`,
  'empty-state': `<div class="pk-empty"><h3>No projects yet</h3><p>Projects keep your tasks and files in one place.</p><button class="pk-btn" type="button">Create a project</button></div>`,
  'stat-tile': `<div class="pk-stat">Orders today<b>128</b><span class="pk-badge pk-badge--ok">+12% on yesterday</span></div>`,
  timeline: `<ol class="pk-timeline"><li><time>9:30</time><b>Order placed</b></li><li><time>11:05</time><b>Packed</b></li><li><time>14:40</time><b>Out for delivery</b></li></ol>`,
  'pricing-table': `<div class="pk-plans">
  <div class="pk-plan"><b>Basic</b><span class="pk-price">$9</span><ul><li>3 projects</li><li>Email support</li></ul><button class="pk-btn pk-btn--secondary" type="button">Choose Basic</button></div>
  <div class="pk-plan pk-plan--featured"><b>Pro <span class="pk-badge">Most chosen</span></b><span class="pk-price">$19</span><ul><li>Unlimited projects</li><li>Phone support</li></ul><button class="pk-btn" type="button">Choose Pro</button></div>
</div>`,
  testimonial: `<blockquote class="pk-quote">“We shipped in a week what used to take a quarter.”<footer><span class="pk-avatar">SJ</span>Sun-hee Jang, Head of Product</footer></blockquote>`,
  faq: `<div class="pk-accordion"><details open><summary>Can I cancel at any time?</summary><p>Yes. You keep access until the end of the period you paid for.</p></details><details><summary>Do you offer refunds?</summary><p>Within 30 days, no questions asked.</p></details></div>`,
  figure: `<figure class="pk-figure"><div class="pk-media"></div><figcaption>What the picture shows, in one line.</figcaption></figure>`,

  // ---- feedback ----
  'inline-error': `<div class="pk-field pk-field--error"><label for="pk-email">Email</label><input id="pk-email" type="email" aria-invalid="true" aria-describedby="pk-email-error" value="mina@" /><span class="pk-error" id="pk-email-error">Enter an email address, like name@example.com</span></div>`,
  'error-summary': `<div class="pk-error-summary" role="alert"><b>There is a problem</b><br /><a class="pk-link" href="#pk-email">Enter an email address</a></div>`,
  toast: `<div class="pk-toast" role="status">Changes saved</div>`,
  banner: `<div class="pk-banner pk-banner--warn" role="status"><div><b>Your card expires this month.</b> Update it to keep your plan.</div><a class="pk-link" href="#">Update card</a></div>`,
  'progress-bar': `<label class="pk-field"><span>Uploading 3 of 8 files</span><progress class="pk-progress" value="3" max="8"></progress></label>`,
  spinner: `<span class="pk-spinner" role="status" aria-label="Loading"></span>`,
  skeleton: `<div class="pk-card" aria-busy="true"><span class="pk-skeleton" style="width: 40%"></span><span class="pk-skeleton"></span><span class="pk-skeleton" style="width: 70%"></span></div>`,
  'confirmation-page': `<div class="pk-confirm-page" role="status"><h1>Order placed</h1><p>We sent the receipt to mina@example.com. Your order number is 1042.</p><a class="pk-btn" href="#">Track the order</a></div>`,
  'inline-confirmation': `<div class="pk-banner pk-banner--ok" role="status"><b>Saved.</b> Your profile is up to date.</div>`,
  'badge-counter': `<span class="pk-cluster" style="--pk-gap: 6px">Inbox <span class="pk-count" aria-label="3 unread">3</span></span>`,

  // ---- overlay ----
  'modal-dialog': `<div class="pk-backdrop"><div class="pk-modal" role="dialog" aria-modal="true" aria-labelledby="pk-modal-title">
  <h2 id="pk-modal-title">Invite a teammate</h2>
  <label class="pk-field"><span>Email</span><input type="email" /></label>
  <div class="pk-modal-actions"><button class="pk-btn pk-btn--secondary" type="button">Cancel</button><button class="pk-btn" type="button">Send invite</button></div>
</div></div>`,
  'confirmation-dialog': `<div class="pk-backdrop"><div class="pk-modal" role="alertdialog" aria-modal="true" aria-labelledby="pk-confirm-title">
  <h2 id="pk-confirm-title">Delete “Quarterly report”?</h2>
  <p>The file is removed for everyone. This cannot be undone.</p>
  <div class="pk-modal-actions"><button class="pk-btn pk-btn--secondary" type="button">Cancel</button><button class="pk-btn pk-btn--danger" type="button">Delete file</button></div>
</div></div>`,
  'typed-confirmation': `<div class="pk-backdrop"><div class="pk-modal" role="alertdialog" aria-modal="true" aria-labelledby="pk-typed-title">
  <h2 id="pk-typed-title">Delete the workspace “Shipday”?</h2>
  <p>All 14 projects and their files are deleted for everyone. This cannot be undone.</p>
  <label class="pk-field"><span>Type Shipday to confirm</span><input autocomplete="off" /></label>
  <div class="pk-modal-actions"><button class="pk-btn pk-btn--secondary" type="button">Cancel</button><button class="pk-btn pk-btn--danger" type="button" disabled>Delete workspace</button></div>
</div></div>`,
  'side-sheet': `<div class="pk-backdrop pk-backdrop--end"><aside class="pk-drawer" role="dialog" aria-label="Order 1042"><div class="pk-cluster"><h2 style="margin: 0 auto 0 0">Order 1042</h2><button class="pk-icon-btn" type="button" aria-label="Close">✕</button></div><p>Details of the selected item, beside the list it came from.</p></aside></div>`,
  'bottom-sheet': `<div class="pk-backdrop pk-backdrop--bottom"><div class="pk-sheet" role="dialog" aria-label="Share"><b>Share</b><div class="pk-menu" style="width: 100%; max-width: none; border: 0; box-shadow: none"><button type="button">Copy link</button><button type="button">Send by email</button></div></div></div>`,
  popover: `<div class="pk-popover" role="dialog" aria-label="Filter"><b>Filter by status</b><label class="pk-check"><input type="checkbox" checked /><span>Paid</span></label><label class="pk-check"><input type="checkbox" /><span>Pending</span></label></div>`,
  tooltip: `<span class="pk-tooltip" role="tooltip">Copy link</span>`,
  'dropdown-menu': `<div class="pk-menu" role="menu"><button role="menuitem" type="button">Profile</button><button role="menuitem" type="button">Settings</button><hr /><button role="menuitem" type="button">Sign out</button></div>`,
  lightbox: `<div class="pk-backdrop" style="background: rgba(8, 10, 14, 0.88)"><div class="pk-lightbox" role="dialog" aria-label="Photo 2 of 8"><div class="pk-media"></div><span>2 of 8</span></div></div>`,
  'full-screen-takeover': `<div class="pk-backdrop" style="padding: 0"><div class="pk-modal pk-modal--full" role="dialog" aria-modal="true" aria-label="New message"><div class="pk-cluster"><button class="pk-icon-btn" type="button" aria-label="Close">✕</button><b style="margin-right: auto">New message</b><button class="pk-btn" type="button">Send</button></div><label class="pk-field"><span>To</span><input /></label></div></div>`,
  'coach-mark': `<div class="pk-coach" role="dialog" aria-label="Tip"><b>Filter your orders here</b><span>Pick a status to see only those orders.</span><div class="pk-cluster"><button class="pk-btn pk-btn--secondary" type="button">Got it</button><span>1 of 3</span></div></div>`,
  'cookie-banner': `<div class="pk-consent" role="region" aria-label="Cookies"><span>We use cookies to remember your settings and to measure visits.</span><div class="pk-cluster"><button class="pk-btn pk-btn--secondary" type="button">Reject optional cookies</button><button class="pk-btn pk-btn--secondary" type="button">Accept all</button></div></div>`,
  // ---- motion: the same markup as without it, plus one kit class; it plays without a script ----
  'press-scale': `<button type="button" class="pk-btn pk-m-press">Save my seat</button>`,
  'hover-lift': `<div class="pk-grid">
  <a class="pk-card pk-m-lift" href="#"><h3>Card title</h3><p>The whole card is the link.</p></a>
  <a class="pk-card pk-m-lift" href="#"><h3>Card title</h3><p>The whole card is the link.</p></a>
</div>`,
  'fade-in': `<p class="pk-saved pk-m-fade">Saved</p>`,
  'rise-in': `<article class="pk-card pk-m-rise"><h3>New item</h3><p>Fades in while it moves up a few pixels.</p></article>`,
  'stagger-in': `<div class="pk-grid pk-m-stagger">
  <article class="pk-card"><h3>First</h3><p>Appears first.</p></article>
  <article class="pk-card"><h3>Second</h3><p>50 ms later.</p></article>
  <article class="pk-card"><h3>Third</h3><p>50 ms after that.</p></article>
</div>`,
  'expand-height': `<details class="pk-m-expand"><summary>Can I cancel?</summary><p>Yes, at any time before the day.</p></details>`,
};

export function snippetFor(patternId: string): string | null {
  return SNIPPETS[patternId] ?? null;
}

export function snippetIds(): string[] {
  return Object.keys(SNIPPETS);
}
