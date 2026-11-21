// The "Trailhead" page of tests/stacks, drawn by a few lines that stand in for a framework.
//
// A framework keeps references to the elements it made and changes the page through them. How it
// does that differs, and a patch that moved an element meets each way differently:
//
//   ?dom=refs    asks the parent it remembers: parent.insertBefore(new, ref), parent.removeChild(old)  (React, Vue)
//   ?dom=parent  asks the parent the element has now: el.parentNode.replaceChild(…)                   (Solid, Preact)
//   ?dom=self    asks the element itself: ref.before(new), old.remove()                               (Svelte)
//
// ?fight=1 rewrites the button's text 100 times a second, as a page with a ticking clock would.
(function () {
  var params = new URLSearchParams(location.search);
  var dom = params.get('dom') || 'refs';
  var CREWS = [
    ['Ridge Runners', 'Saturday · 4 places'],
    ['Creek Keepers', 'Saturday · 2 places'],
    ['Switchback Six', 'Sunday · 5 places'],
    ['Cedar Hollow', 'Sunday · 1 place'],
    ['Summit Stewards', 'Next week · 6 places'],
  ];
  var state = { shown: 3, note: true, name: '' };

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
  function insertBefore(parent, node, ref) {
    if (dom === 'refs') parent.insertBefore(node, ref);
    else if (dom === 'parent') ref.parentNode.insertBefore(node, ref);
    else ref.before(node);
  }
  function remove(parent, node) {
    if (dom === 'refs') parent.removeChild(node);
    else if (dom === 'parent') node.parentNode.removeChild(node);
    else node.remove();
  }
  function replace(parent, node, old) {
    if (dom === 'refs') parent.replaceChild(node, old);
    else if (dom === 'parent') old.parentNode.replaceChild(node, old);
    else old.replaceWith(node);
  }

  function makeHero(title) {
    return el('section', { id: 'hero', class: 'hero' }, [
      el('h1', { text: title }),
      el('p', { class: 'lede', text: 'Join a volunteer crew near you. Tools and lunch are provided.' }),
      el('button', { id: 'join', class: 'btn', type: 'button', text: 'Join a crew' }),
    ]);
  }
  function makeCrew(crew) {
    return el('li', { class: 'crew' }, [el('b', { text: crew[0] }), el('span', { text: crew[1] })]);
  }
  function makeNote() {
    return el('p', { id: 'note', class: 'note', text: 'Two crews still need people this week.' });
  }

  var hero = makeHero('Fix a trail this weekend');
  var list = el('ul', { class: 'crew-list' }, CREWS.slice(0, 3).map(makeCrew));
  var note = makeNote();
  var count = el('p', { id: 'count', class: 'count', text: 'Showing 3 crews' });
  var more = el('button', { id: 'more', class: 'btn ghost', type: 'button', text: 'Show more' });
  var toggle = el('button', { id: 'toggle', class: 'btn ghost', type: 'button', text: 'Hide the note' });
  var remount = el('button', { id: 'remount', class: 'btn ghost', type: 'button', text: 'Redraw the banner' });
  var crews = el('section', { id: 'crews', class: 'crews' }, [el('h2', { text: 'Crews near you' }), list, note, count, el('div', { class: 'row' }, [more, toggle, remount])]);
  var input = el('input', { id: 'name', autocomplete: 'off' });
  var hello = el('p', { id: 'hello', class: 'hello', text: 'Hello, friend!' });
  // Two elements that come and go together. Like Svelte and Lit, the page takes them away by
  // walking from the first to the last, one sibling at a time.
  function makeTips() {
    return [el('p', { id: 'tip1', class: 'note', text: 'Bring water and gloves.' }), document.createTextNode(' '), el('p', { id: 'tip2', class: 'note', text: 'Boots, not sandals.' })];
  }
  var tips = makeTips();
  var tipsToggle = el('button', { id: 'tips', class: 'btn ghost', type: 'button', text: 'Hide the tips' });
  var after = el('p', { id: 'after', class: 'count', text: 'See you on the trail.' });
  var signup = el('section', { id: 'signup', class: 'signup' }, [el('h2', { text: 'Get reminders' }), el('label', { for: 'name', text: 'Your first name' }), input, hello].concat(tips, [tipsToggle, after]));
  var main = el('main', {}, [hero, crews, signup]);
  var page = el('div', { class: 'page' }, [
    el('header', { class: 'top' }, [el('strong', { class: 'brand', text: 'Trailhead' }), el('span', { id: 'stack', class: 'stack', text: 'dom=' + dom })]),
    main,
  ]);
  document.getElementById('root').appendChild(page);

  // "Render": bring the elements in line with the state, through the references kept above.
  function render() {
    list.className = state.shown > 3 ? 'crew-list all' : 'crew-list';
    while (list.children.length < state.shown) list.appendChild(makeCrew(CREWS[list.children.length]));
    count.firstChild.nodeValue = 'Showing ' + state.shown + ' crews';
    if (state.note && !note) {
      note = makeNote();
      insertBefore(crews, note, count);
    } else if (!state.note && note) {
      remove(crews, note);
      note = null;
    }
    toggle.textContent = state.note ? 'Hide the note' : 'Show the note';
    hello.textContent = 'Hello, ' + (state.name || 'friend') + '!';
  }

  more.addEventListener('click', function () {
    state.shown = 5;
    render();
  });
  toggle.addEventListener('click', function () {
    state.note = !state.note;
    render();
  });
  input.addEventListener('input', function () {
    state.name = input.value;
    render();
  });
  tipsToggle.addEventListener('click', function () {
    if (tips) {
      var node = tips[0];
      var last = tips[tips.length - 1];
      while (node) {
        var next = node === last ? null : node.nextSibling;
        remove(signup, node);
        node = next;
      }
      tips = null;
    } else {
      tips = makeTips();
      tips.forEach(function (node) {
        insertBefore(signup, node, tipsToggle);
      });
    }
    tipsToggle.textContent = tips ? 'Hide the tips' : 'Show the tips';
  });
  // What a hot update does: the banner is made anew and put in the place of the old one.
  var titles = ['Fix a trail on Saturday', 'Fix a trail this weekend'];
  remount.addEventListener('click', function () {
    var next = makeHero(titles[0]);
    titles.reverse();
    replace(main, next, hero);
    hero = next;
  });

  if (params.get('fight')) {
    setInterval(function () {
      var join = document.getElementById('join');
      if (join && join.textContent !== 'Join a crew') join.textContent = 'Join a crew';
    }, 10);
  }
})();
