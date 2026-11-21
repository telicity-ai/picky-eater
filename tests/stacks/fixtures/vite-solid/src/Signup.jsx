import { createSignal } from 'solid-js';

export function Signup() {
  const [name, setName] = createSignal('');
  return (
    <section id="signup" class="signup">
      <h2>Get reminders</h2>
      <label for="name">Your first name</label>
      <input id="name" value={name()} onInput={(e) => setName(e.currentTarget.value)} autocomplete="off" />
      <p id="hello" class="hello">
        Hello, {name() || 'friend'}!
      </p>
    </section>
  );
}
