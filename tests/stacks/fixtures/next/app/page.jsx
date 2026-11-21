import { Crews } from './Crews.jsx';
import { Hero } from './Hero.jsx';
import { Signup } from './Signup.jsx';

// A server component: the page arrives as finished markup and the two interactive parts are hydrated.
export default function Page() {
  return (
    <div className="page">
      <header className="top">
        <strong className="brand">Trailhead</strong>
        <span id="stack" className="stack">next</span>
      </header>
      <main>
        <Hero />
        <Crews />
        <Signup />
      </main>
    </div>
  );
}
