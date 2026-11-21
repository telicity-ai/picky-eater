import { useState } from 'react';

export default function Signup() {
  const [name, setName] = useState('');
  return (
    <section id="signup" className="signup">
      <h2>Get reminders</h2>
      <label htmlFor="name">Your first name</label>
      <input id="name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" />
      <p id="hello" className="hello">
        Hello, {name || 'friend'}!
      </p>
    </section>
  );
}
