import { useState } from 'preact/hooks';

export function Signup() {
  const [name, setName] = useState('');
  return (
    <section id="signup" class="signup">
      <h2>Get reminders</h2>
      <label for="name">Your first name</label>
      <input id="name" value={name} onInput={(e) => setName(e.target.value)} autocomplete="off" />
      <p id="hello" class="hello">
        Hello, {name || 'friend'}!
      </p>
    </section>
  );
}
