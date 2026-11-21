// Plain browser JavaScript, no build step. Everything here must keep working while picky-eater
// shows this page with patches on top: the header, the scroll effect, the plan buttons, the form.

const header = document.querySelector('.site-header');
const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 24);
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

// Scroll effect: reveal each step the first time it comes into view.
const seen = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('is-visible');
      seen.unobserve(entry.target);
    }
  },
  { threshold: 0.2 },
);
for (const el of document.querySelectorAll('.reveal')) seen.observe(el);

// Plan buttons: listeners are attached to the elements once, here.
const picked = document.getElementById('picked');
for (const plan of document.querySelectorAll('.plan')) {
  plan.querySelector('button').addEventListener('click', () => {
    for (const other of document.querySelectorAll('.plan')) other.classList.toggle('is-picked', other === plan);
    picked.textContent = `You picked: ${plan.dataset.plan}.`;
  });
}

// The form checks itself and never leaves the page.
const form = document.querySelector('.signup form');
const error = form.querySelector('.form-error');
const done = document.querySelector('.form-done');
form.addEventListener('submit', (event) => {
  event.preventDefault();
  const name = form.elements.name;
  const email = form.elements.email;
  const problems = [];
  if (!name.value.trim()) problems.push('Tell us your name.');
  if (!/^\S+@\S+\.\S+$/.test(email.value.trim())) problems.push('Enter an email address, like name@example.com.');
  name.setAttribute('aria-invalid', String(!name.value.trim()));
  email.setAttribute('aria-invalid', String(!/^\S+@\S+\.\S+$/.test(email.value.trim())));
  if (problems.length > 0) {
    error.textContent = problems.join(' ');
    error.hidden = false;
    return;
  }
  error.hidden = true;
  form.hidden = true;
  done.hidden = false;
});

// What a development server usually adds: a hot-reload socket, a cookie, a service worker.
const dev = document.getElementById('dev');
const cookie = document.cookie.includes('harbor_visit=') ? 'cookie set' : 'no cookie';
let pings = 0;
try {
  const socket = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/__live`);
  const show = (state) => (dev.textContent = `Development server: ${state} · ${cookie}`);
  socket.addEventListener('open', () => show('connected'));
  socket.addEventListener('message', (event) => {
    if (event.data === 'reload') location.reload();
    else show(`connected, ${++pings} update${pings === 1 ? '' : 's'}`);
  });
  socket.addEventListener('close', () => show('disconnected'));
} catch {
  dev.textContent = `Development server: no socket · ${cookie}`;
}
if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
