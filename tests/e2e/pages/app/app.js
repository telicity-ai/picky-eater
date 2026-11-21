// "Relay": an app screen for tests, the kind of page a product has behind its sign-in.
//
// - It sends a browser without a session to login.html.
// - Its markup is styled with utility classes; what names its parts are data attributes and labels.
// - Its sidebar is a list that grows ("Add a thread"), and every row says how long ago, which
//   is another value each time the page is opened.
// - "Help" is another screen of the app, reached without a page load.
// - "Settings" changes the address at once and draws a dialog a moment later, outside #root, as an
//   app does whose next screen is loaded on demand.
(function () {
  if (document.cookie.indexOf('sid=dev') < 0 || localStorage.getItem('token') !== 't-dev') {
    location.replace('login.html');
    return;
  }
  var THREADS = [
    ['atlas-api', 'Fix the flaky checkout test', 'main'],
    ['field-notes', 'Offline sync for notes', 'sync'],
    ['atlas-api', 'Plan the v2 migration', 'main'],
  ];
  var MORE = [
    ['field-notes', 'Tidy the editor toolbar', 'main'],
    ['atlas-api', 'Rename the billing module', 'billing'],
  ];
  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === 'text') node.textContent = attrs[k];
      else node.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) {
      node.appendChild(c);
    });
    return node;
  }
  function icon(color) {
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 12 12');
    svg.setAttribute('width', '12');
    svg.setAttribute('height', '12');
    var dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    dot.setAttribute('cx', '6');
    dot.setAttribute('cy', '6');
    dot.setAttribute('r', '5');
    dot.setAttribute('fill', color);
    svg.appendChild(dot);
    return svg;
  }
  // How long ago, as a running app says it: another value every time the page is opened.
  var ago = (Math.floor(Date.now() / 1000) % 47) + 2 + 'm';
  function row(thread) {
    return el('li', { 'data-testid': 'thread-row', class: 'flex flex-col gap-1 p-2 rounded-md' }, [
      el('div', { class: 'flex items-center gap-1 text-xs text-muted' }, [icon('#7c3aed'), el('span', { text: thread[0] }), el('span', { class: 'flex-1' }), el('span', { 'data-time': '', text: ago })]),
      el('div', { class: 'flex items-center gap-1 text-sm font-medium' }, [icon('#16a34a'), el('span', { text: thread[1] })]),
      el('div', { class: 'flex items-center gap-1 text-xs text-muted' }, [icon('#9ca3af'), el('span', { text: thread[2] })]),
    ]);
  }
  var list = el('ul', { role: 'list', class: 'flex flex-col gap-1 p-2' }, THREADS.map(row));
  var add = el('button', { type: 'button', 'aria-label': 'Add a thread', class: 'px-2 py-1 rounded-md', text: 'Add' });
  var settings = el('button', { type: 'button', 'aria-label': 'Settings', class: 'px-2 py-1 rounded-md', text: 'Settings' });
  var help = el('button', { type: 'button', 'aria-label': 'Help', class: 'px-2 py-1 rounded-md', text: 'Help' });
  var sidebar = el('aside', { 'data-slot': 'sidebar', class: 'flex flex-col w-64 h-full' }, [
    el('div', { class: 'flex items-center gap-2 p-2' }, [el('input', { 'aria-label': 'Search threads', class: 'w-full px-2 py-1', placeholder: 'Search' })]),
    list,
    el('div', { 'data-slot': 'sidebar-footer', class: 'flex items-center gap-2 p-2 mt-auto' }, [settings, add, help]),
  ]);
  var main = el('main', { 'data-chat-column': '', class: 'flex flex-col flex-1 min-w-0' }, [
    el('header', { 'data-chat-header': '', class: 'flex items-center h-12 px-4' }, [el('h1', { class: 'text-lg font-medium', text: 'Fix the flaky checkout test' })]),
    el('div', { 'data-slot': 'conversation', class: 'flex flex-col gap-2 p-4' }, [
      el('p', { class: 'text-sm', text: 'The test waits for a toast that is drawn a frame late. It now waits for the order number instead.' }),
      el('div', { 'data-slot': 'composer', class: 'flex items-center gap-2 p-2 rounded-md' }, [
        el('button', { type: 'button', 'aria-label': 'Attach files', class: 'px-2 py-1', text: 'Attach' }),
        el('span', { class: 'flex-1' }),
        el('button', { type: 'button', 'data-model-picker': '', class: 'px-2 py-1 rounded-md', text: 'Model: Showcase' }),
        el('button', { type: 'button', 'aria-label': 'Send', class: 'px-2 py-1 rounded-md', text: 'Send' }),
      ]),
    ]),
  ]);
  document.getElementById('root').appendChild(el('div', { class: 'flex h-full' }, [sidebar, main]));

  // Another screen of the app, without a page load: none of the parts above are on it.
  help.addEventListener('click', function () {
    history.pushState({}, '', '?help=1');
    document.getElementById('root').replaceChildren(el('article', { 'data-slot': 'help', class: 'p-4' }, [el('h1', { class: 'text-lg', text: 'Help' }), el('p', { class: 'text-sm', text: 'Threads keep the work on one task together.' })]));
  });
  add.addEventListener('click', function () {
    var next = MORE[list.children.length - THREADS.length];
    if (next) list.insertBefore(row(next), list.firstChild);
  });
  settings.addEventListener('click', function () {
    history.pushState({}, '', '?settings=general');
    setTimeout(function () {
      var close = el('button', { type: 'button', 'aria-label': 'Close', class: 'px-2 py-1', text: 'Close' });
      var dialog = el('div', { role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Settings', 'data-app-modal': '', class: 'flex rounded-md' }, [
        el('nav', { 'data-workspace-area': 'settings-nav', 'aria-label': 'Settings sections', class: 'flex flex-col gap-1 p-2 w-48' }, [
          el('button', { type: 'button', 'data-settings-section': 'general', class: 'px-2 py-1 text-sm', text: 'General' }),
          el('button', { type: 'button', 'data-settings-section': 'appearance', class: 'px-2 py-1 text-sm', text: 'Appearance' }),
          el('button', { type: 'button', 'data-settings-section': 'providers', class: 'px-2 py-1 text-sm', text: 'Providers' }),
        ]),
        el('section', { 'data-workspace-area': 'settings', class: 'flex flex-col gap-2 p-4 flex-1' }, [el('h2', { class: 'text-lg', text: 'General' }), el('p', { class: 'text-sm', text: 'Notifications, the sidebar and confirmations.' }), close]),
      ]);
      close.addEventListener('click', function () {
        dialog.remove();
        history.pushState({}, '', './');
      });
      document.body.appendChild(dialog);
    }, 350);
  });
})();
