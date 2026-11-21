import { Crews } from './Crews.jsx';
import { Hero } from './Hero.jsx';
import { Signup } from './Signup.jsx';

export function App() {
  return (
    <div class="page">
      <header class="top">
        <strong class="brand">Trailhead</strong>
        <span id="stack" class="stack">vite-solid</span>
      </header>
      <main>
        <Hero />
        <Crews />
        <Signup />
      </main>
    </div>
  );
}
